import re
from datetime import datetime
from typing import Iterable

SECTOR_OPTIONS = [
    "Clean energy",
    "Biodiversity",
    "Climate adaptation",
    "Ocean conservation",
    "Sustainable agriculture",
    "Clean transport",
]

REGION_OPTIONS = [
    "Global",
    "South Asia",
    "Sub-Saharan Africa",
    "Latin America",
    "Europe",
    "Southeast Asia",
    "North America",
    "Middle East & North Africa",
]

ELIGIBILITY_OPTIONS = [
    "NGOs",
    "Startups",
    "SMEs",
    "Individuals",
    "Research institutions",
]

SECTOR_KEYWORDS: list[tuple[str, str]] = [
    ("renewable", "Clean energy"),
    ("solar", "Clean energy"),
    ("wind", "Clean energy"),
    ("energy", "Clean energy"),
    ("biodiversity", "Biodiversity"),
    ("wildlife", "Biodiversity"),
    ("forest", "Biodiversity"),
    ("adaptation", "Climate adaptation"),
    ("resilience", "Climate adaptation"),
    ("ocean", "Ocean conservation"),
    ("marine", "Ocean conservation"),
    ("fisher", "Ocean conservation"),
    ("agriculture", "Sustainable agriculture"),
    ("food", "Sustainable agriculture"),
    ("farm", "Sustainable agriculture"),
    ("transport", "Clean transport"),
    ("mobility", "Clean transport"),
    ("ev ", "Clean transport"),
]

REGION_KEYWORDS: list[tuple[str, str]] = [
    ("global", "Global"),
    ("worldwide", "Global"),
    ("international", "Global"),
    ("south asia", "South Asia"),
    ("india", "South Asia"),
    ("bangladesh", "South Asia"),
    ("africa", "Sub-Saharan Africa"),
    ("sub-saharan", "Sub-Saharan Africa"),
    ("latin america", "Latin America"),
    ("caribbean", "Latin America"),
    ("europe", "Europe"),
    ("eu ", "Europe"),
    ("southeast asia", "Southeast Asia"),
    ("asean", "Southeast Asia"),
    ("north america", "North America"),
    ("united states", "North America"),
    ("canada", "North America"),
    ("middle east", "Middle East & North Africa"),
    ("mena", "Middle East & North Africa"),
]

ELIGIBILITY_KEYWORDS: list[tuple[str, str]] = [
    ("ngo", "NGOs"),
    ("non-profit", "NGOs"),
    ("nonprofit", "NGOs"),
    ("civil society", "NGOs"),
    ("startup", "Startups"),
    ("entrepreneur", "Startups"),
    ("sme", "SMEs"),
    ("small business", "SMEs"),
    ("enterprise", "SMEs"),
    ("individual", "Individuals"),
    ("research", "Research institutions"),
    ("university", "Research institutions"),
    ("academic", "Research institutions"),
]


def parse_amount(text: str | None) -> float | None:
    if not text:
        return None
    cleaned = text.lower().replace(",", "")
    multiplier = 1.0
    if "billion" in cleaned or "bn" in cleaned:
        multiplier = 1_000_000_000.0
    elif "million" in cleaned or " m" in cleaned:
        multiplier = 1_000_000.0
    elif "thousand" in cleaned or " k" in cleaned:
        multiplier = 1_000.0
    match = re.search(r"(\d+(?:\.\d+)?)", cleaned)
    if not match:
        return None
    return float(match.group(1)) * multiplier


def parse_amount_range(text: str | None) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    parts = re.split(r"\s*(?:-|–|to)\s*", text, maxsplit=1)
    if len(parts) == 2:
        return parse_amount(parts[0]), parse_amount(parts[1])
    value = parse_amount(text)
    return value, value


def parse_deadline(text: str | None) -> str | None:
    if not text:
        return None
    cleaned = text.strip()
    for fmt in ("%Y-%m-%d", "%d %B %Y", "%B %d, %Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(cleaned, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    iso_match = re.search(r"(\d{4}-\d{2}-\d{2})", cleaned)
    if iso_match:
        return iso_match.group(1)
    return None


def normalize_tags(raw: Iterable[str] | None, allowed: list[str]) -> list[str]:
    if not raw:
        return []
    allowed_lower = {opt.lower(): opt for opt in allowed}
    seen: set[str] = set()
    result: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        key = item.strip().lower()
        canonical = allowed_lower.get(key)
        if canonical and canonical not in seen:
            seen.add(canonical)
            result.append(canonical)
    return result


def infer_tags(text: str, keyword_map: list[tuple[str, str]], allowed: list[str]) -> list[str]:
    lowered = text.lower()
    matched: list[str] = []
    seen: set[str] = set()
    for keyword, tag in keyword_map:
        if keyword in lowered and tag not in seen:
            seen.add(tag)
            matched.append(tag)
    return normalize_tags(matched, allowed)


def grant_row(
    *,
    title: str,
    provider: str,
    description: str,
    url: str,
    amount_min: float | None = None,
    amount_max: float | None = None,
    sector: list[str] | None = None,
    region: list[str] | None = None,
    eligibility: list[str] | None = None,
    deadline: str | None = None,
) -> dict:
    combined = f"{title} {description} {provider}"
    return {
        "title": title.strip(),
        "provider": provider.strip() or "Unknown provider",
        "description": description.strip() or title.strip(),
        "amount_min": amount_min,
        "amount_max": amount_max,
        "sector": sector or infer_tags(combined, SECTOR_KEYWORDS, SECTOR_OPTIONS),
        "region": region or infer_tags(combined, REGION_KEYWORDS, REGION_OPTIONS),
        "eligibility": eligibility
        or infer_tags(combined, ELIGIBILITY_KEYWORDS, ELIGIBILITY_OPTIONS),
        "deadline": deadline,
        "url": url.strip(),
        "status": "pending",
        "source": "scraper",
    }
