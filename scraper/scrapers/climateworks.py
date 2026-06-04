import asyncio
import logging
import os
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from scrapers._helpers import grant_row

logger = logging.getLogger(__name__)

DEFAULT_CLIMATEWORKS_URLS = [
    "https://www.climateworks.org/programs/",
    "https://www.climateworks.org/global-grantmaking/",
]

PLAYWRIGHT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


def _resolve_urls() -> list[str]:
    env_urls = os.environ.get("CLIMATEWORKS_URLS", "").strip()
    if env_urls:
        return [u.strip() for u in env_urls.split(",") if u.strip()]
    env_single = os.environ.get("CLIMATEWORKS_URL", "").strip()
    if env_single:
        return [env_single]
    return list(DEFAULT_CLIMATEWORKS_URLS)


def _normalize_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def _title_from_slug(url: str) -> str:
    slug = urlparse(url).path.rstrip("/").split("/")[-1]
    return slug.replace("-", " ").title()


def _extract_program_urls(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    found: list[str] = []
    seen: set[str] = set()

    for link in soup.select('a[href*="/programs/"]'):
        href = link.get("href", "")
        full = _normalize_url(urljoin(base_url, href))
        if "climateworks.org" not in full:
            continue
        if full.endswith("/programs"):
            continue
        parts = [part for part in urlparse(full).path.split("/") if part]
        if len(parts) < 2 or parts[0] != "programs":
            continue
        if full in seen:
            continue
        seen.add(full)
        found.append(full)

    return found


def _parse_program_page(html: str, page_url: str) -> dict | None:
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.select_one("h1")
    title = heading.get_text(strip=True) if heading else _title_from_slug(page_url)
    if not title:
        return None

    description = title
    for paragraph in soup.select("main p, article p, .entry-content p, .page-content p"):
        text = paragraph.get_text(strip=True)
        if len(text) > 60:
            description = text
            break

    return grant_row(
        title=title,
        provider="Climateworks Foundation",
        description=description,
        url=page_url,
    )


async def _scrape_async() -> list[dict]:
    listing_urls = _resolve_urls()
    logger.info("Climateworks scraper starting (%d listing URLs)", len(listing_urls))
    grants: list[dict] = []
    seen_urls: set[str] = set()

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=PLAYWRIGHT_USER_AGENT,
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        try:
            program_urls: list[str] = []

            for listing_url in listing_urls:
                logger.info("Climateworks loading listing %s", listing_url)
                try:
                    await page.goto(
                        listing_url,
                        wait_until="domcontentloaded",
                        timeout=45000,
                    )
                except Exception as exc:
                    logger.error("Climateworks navigation failed for %s: %s", listing_url, exc)
                    continue

                if "climateworks.org" not in page.url:
                    logger.error(
                        "Climateworks URL redirected off-site to %s (check CLIMATEWORKS_URL)",
                        page.url,
                    )
                    continue

                html = await page.content()
                for program_url in _extract_program_urls(html, page.url):
                    if program_url not in program_urls:
                        program_urls.append(program_url)

            for program_url in program_urls:
                logger.info("Climateworks loading program %s", program_url)
                try:
                    await page.goto(
                        program_url,
                        wait_until="domcontentloaded",
                        timeout=45000,
                    )
                except Exception as exc:
                    logger.error("Climateworks program fetch failed: %s", exc)
                    continue

                if "climateworks.org" not in page.url:
                    continue

                row = _parse_program_page(await page.content(), program_url)
                if row and row["url"] not in seen_urls:
                    seen_urls.add(row["url"])
                    grants.append(row)

        finally:
            await browser.close()

    logger.info("Climateworks scraper extracted %d grants", len(grants))
    return grants


def scrape() -> list[dict]:
    return asyncio.run(_scrape_async())
