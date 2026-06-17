import asyncio
import logging
import os
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from scrapers._helpers import (
    ELIGIBILITY_OPTIONS,
    REGION_OPTIONS,
    SECTOR_OPTIONS,
    find_deadline_in_text,
    grant_row,
    normalize_tags,
    parse_amount_range,
    parse_deadline,
)

logger = logging.getLogger(__name__)

DEFAULT_UNEP_URLS = [
    "https://www.unep.org/about-un-environment-programme/funding-and-partnerships",
    "https://www.unep.org/about-un-environment-programme/funding-and-partnerships/environment-fund",
]

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

PLAYWRIGHT_USER_AGENT = BROWSER_HEADERS["User-Agent"]

SKIP_H2_TITLES = {
    "breadcrumb",
    "about",
    "partners",
    "articles",
    "governance & leadership",
    "funding & partners",
    "structure",
    "key documents",
    "resources",
    "advocacy",
    "media",
    "work with us",
}

FOOTER_HREF_MARKERS = (
    "/people/leadership",
    "/international-days",
    "/resources/annual-report",
)


def _resolve_urls() -> list[str]:
    env_urls = os.environ.get("UNEP_URLS", "").strip()
    if env_urls:
        return [u.strip() for u in env_urls.split(",") if u.strip()]
    env_single = os.environ.get("UNEP_URL", "").strip()
    if env_single:
        return [env_single]
    return list(DEFAULT_UNEP_URLS)


def _absolute_url(base: str, href: str | None) -> str | None:
    if not href or not href.strip():
        return None
    href = href.strip()
    if href.startswith("#") or href.lower().startswith("mailto:"):
        return None
    return urljoin(base, href)


def _is_cloudflare_challenge(html: str) -> bool:
    lowered = html.lower()
    return "just a moment" in lowered or "cf-browser-verification" in lowered


def _fetch_html_httpx(url: str) -> str | None:
    try:
        with httpx.Client(
            headers=BROWSER_HEADERS,
            follow_redirects=True,
            timeout=30.0,
        ) as client:
            home = client.get("https://www.unep.org/")
            home.raise_for_status()
            response = client.get(
                url,
                headers={**BROWSER_HEADERS, "Referer": "https://www.unep.org/"},
            )
            response.raise_for_status()
            if _is_cloudflare_challenge(response.text):
                return None
            return response.text
    except httpx.HTTPError as exc:
        logger.info("UNEP httpx fetch failed for %s: %s", url, exc)
        return None


async def _fetch_html_playwright(url: str) -> str:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=PLAYWRIGHT_USER_AGENT,
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        page = await context.new_page()
        try:
            await page.goto(
                "https://www.unep.org/",
                wait_until="domcontentloaded",
                timeout=60000,
            )
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_function(
                "() => !document.title.includes('Just a moment')",
                timeout=45000,
            )
            return await page.content()
        finally:
            await browser.close()


def _fetch_html(url: str) -> tuple[str, str] | None:
    # UNEP subpages are Cloudflare-protected; httpx always 403 — use Playwright directly.
    html = None
    if os.environ.get("UNEP_TRY_HTTPX", "").strip().lower() in ("1", "true", "yes"):
        html = _fetch_html_httpx(url)
    if html is None:
        logger.info("UNEP fetching via Playwright: %s", url)
        try:
            html = asyncio.run(_fetch_html_playwright(url))
        except Exception as exc:
            logger.error("UNEP Playwright fetch failed for %s: %s", url, exc)
            return None
        if _is_cloudflare_challenge(html):
            logger.error("UNEP still blocked by Cloudflare for %s", url)
            return None
    return url, html


def _main_content_root(soup: BeautifulSoup):
    return (
        soup.select_one("main#main-content")
        or soup.select_one("main")
        or soup.select_one('[role="main"]')
        or soup.body
    )


def _parse_grant_item(item, base_url: str) -> dict | None:
    title_el = item.select_one("h3.title") or item.select_one("h3") or item.select_one("h2")
    link_el = item.select_one("a.url") or item.select_one("a[href]")
    provider_el = item.select_one(".provider") or item.select_one(".organisation")
    desc_el = item.select_one(".description") or item.select_one("p")

    title = title_el.get_text(strip=True) if title_el else ""
    url = _absolute_url(base_url, link_el.get("href") if link_el else None)
    if not title or not url:
        return None

    provider = provider_el.get_text(strip=True) if provider_el else "UNEP"
    description = desc_el.get_text(strip=True) if desc_el else title

    amount_text = None
    deadline_text = None
    for node in item.select(".meta, .grant-meta, li, span"):
        text = node.get_text(" ", strip=True).lower()
        if not deadline_text and any(
            k in text for k in ("deadline", "closing", "due", "apply by", "expires")
        ):
            deadline_text = node.get_text(" ", strip=True)
        if any(k in text for k in ("fund", "amount", "grant", "$", "usd", "eur")):
            amount_text = node.get_text(" ", strip=True)

    amount_min, amount_max = parse_amount_range(amount_text)
    # Try the labelled node first, then fall back to scanning the whole item
    # for any deadline-labelled date we may have missed.
    deadline = parse_deadline(deadline_text) or find_deadline_in_text(
        item.get_text(" ", strip=True)
    )

    return grant_row(
        title=title,
        provider=provider,
        description=description,
        url=url,
        amount_min=amount_min,
        amount_max=amount_max,
        deadline=deadline,
        sector=normalize_tags(
            [t.get_text(strip=True) for t in item.select(".sector, .tag")],
            SECTOR_OPTIONS,
        )
        or None,
        region=normalize_tags(
            [t.get_text(strip=True) for t in item.select(".region, .location")],
            REGION_OPTIONS,
        )
        or None,
        eligibility=normalize_tags(
            [t.get_text(strip=True) for t in item.select(".eligibility")],
            ELIGIBILITY_OPTIONS,
        )
        or None,
    )


def _parse_funding_h2_sections(root, base_url: str) -> list[dict]:
    grants: list[dict] = []
    for heading in root.select("h2"):
        title = heading.get_text(strip=True)
        if not title or len(title) < 8:
            continue
        if title.lower() in SKIP_H2_TITLES:
            continue

        block = heading.find_parent(["section", "article", "div"]) or heading.parent
        link_el = heading.select_one("a[href]")
        if not link_el and block:
            link_el = block.select_one("a[href]")
        url = _absolute_url(base_url, link_el.get("href") if link_el else None)
        if not url:
            continue
        if any(marker in url for marker in FOOTER_HREF_MARKERS):
            continue

        description = title
        if block:
            for paragraph in block.select("p"):
                text = paragraph.get_text(strip=True)
                if len(text) > 40:
                    description = text
                    break

        amount_min, amount_max = parse_amount_range(description)
        block_text = block.get_text(" ", strip=True) if block else description
        grants.append(
            grant_row(
                title=title,
                provider="UNEP",
                description=description,
                url=url,
                amount_min=amount_min,
                amount_max=amount_max,
                deadline=find_deadline_in_text(block_text),
            )
        )
    return grants


def _parse_funding_links(root, base_url: str) -> list[dict]:
    grants: list[dict] = []
    keywords = ("fund", "grant", "finance", "partner", "invest", "opportun", "climate")
    for link in root.select("a[href]"):
        title = link.get_text(" ", strip=True)
        href = link.get("href", "")
        if not title or len(title) < 15:
            continue
        combined = f"{title} {href}".lower()
        if not any(keyword in combined for keyword in keywords):
            continue
        url = _absolute_url(base_url, href)
        if not url:
            continue
        if any(marker in url for marker in FOOTER_HREF_MARKERS):
            continue
        grants.append(
            grant_row(
                title=title,
                provider="UNEP",
                description=title,
                url=url,
            )
        )
    return grants


def _parse_article_fallback(article, base_url: str) -> dict | None:
    title_el = article.select_one("h3") or article.select_one("h2")
    link_el = article.select_one("a[href]")
    paragraphs = article.select("p")

    title = title_el.get_text(strip=True) if title_el else ""
    url = _absolute_url(base_url, link_el.get("href") if link_el else None)
    if not title or not url:
        return None

    description = paragraphs[0].get_text(strip=True) if paragraphs else title
    provider = "UNEP"
    for paragraph in paragraphs[:3]:
        text = paragraph.get_text(strip=True)
        if "unep" in text.lower() or "programme" in text.lower():
            provider = text[:120]
            break

    return grant_row(
        title=title,
        provider=provider,
        description=description,
        url=url,
        deadline=find_deadline_in_text(article.get_text(" ", strip=True)),
    )


def _parse_h3_fallback(soup: BeautifulSoup, base_url: str) -> list[dict]:
    grants: list[dict] = []
    for heading in soup.select("h3"):
        title = heading.get_text(strip=True)
        if not title or len(title) < 8:
            continue
        sibling = heading.find_next_sibling()
        description = title
        url = None
        section_text = title
        while sibling is not None and sibling.name not in ("h2", "h3"):
            if hasattr(sibling, "get_text"):
                section_text += " " + sibling.get_text(" ", strip=True)
            if sibling.name == "p" and (not description or description == title):
                description = sibling.get_text(strip=True) or title
            if hasattr(sibling, "select_one"):
                link = sibling.select_one("a[href]")
                if link and not url:
                    url = _absolute_url(base_url, link.get("href"))
            sibling = sibling.find_next_sibling()
        if not url:
            parent = heading.find_parent()
            parent_link = parent.select_one("a[href]") if parent else None
            if parent_link:
                url = _absolute_url(base_url, parent_link.get("href"))
        if url:
            grants.append(
                grant_row(
                    title=title,
                    provider="UNEP",
                    description=description,
                    url=url,
                    deadline=find_deadline_in_text(section_text),
                )
            )
    return grants


def _parse_html(base_url: str, html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    root = _main_content_root(soup)
    if root is None:
        return []

    grants: list[dict] = []
    seen_urls: set[str] = set()

    def add_row(row: dict | None) -> None:
        if not row or row["url"] in seen_urls:
            return
        seen_urls.add(row["url"])
        grants.append(row)

    for item in soup.select(".grant-item"):
        add_row(_parse_grant_item(item, base_url))

    for row in _parse_funding_h2_sections(root, base_url):
        add_row(row)

    for row in _parse_funding_links(root, base_url):
        add_row(row)

    for article in root.select("article"):
        add_row(_parse_article_fallback(article, base_url))

    for row in _parse_h3_fallback(root, base_url):
        add_row(row)

    return grants


def scrape() -> list[dict]:
    urls = _resolve_urls()
    all_grants: list[dict] = []
    seen_fingerprints: set[str] = set()

    for url in urls:
        logger.info("UNEP scraper fetching %s", url)
        fetched = _fetch_html(url)
        if not fetched:
            continue
        base_url, html = fetched
        grants = _parse_html(base_url, html)
        logger.info("UNEP parsed %d grants from %s", len(grants), url)

        for grant in grants:
            key = f"{grant['title']}|{grant['url']}"
            if key in seen_fingerprints:
                continue
            seen_fingerprints.add(key)
            all_grants.append(grant)

    logger.info("UNEP scraper extracted %d grants total", len(all_grants))
    return all_grants
