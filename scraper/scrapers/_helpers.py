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


# --- Deadline parsing -------------------------------------------------------
# Scrapers rarely hand us a clean "2026-09-30". They hand us the surrounding
# text — "Application deadline: 30 September 2026", "Closes Sept 30th, 2026",
# "Due by 09/30/2026" — so the parser has to *find* a date inside arbitrary
# prose and normalise it to ISO (YYYY-MM-DD), or give up and return None.

MONTHS: dict[str, int] = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

_MONTH_ALT = "|".join(sorted(MONTHS, key=len, reverse=True))

# 30 September 2026 / 30th Sept, 2026 / 1 of June 2026
_DAY_MONTH_YEAR = re.compile(
    rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({_MONTH_ALT})\.?,?\s+(\d{{4}})\b",
    re.IGNORECASE,
)
# September 30, 2026 / Sept 30th 2026 / Sep. 30 2026
_MONTH_DAY_YEAR = re.compile(
    rf"\b({_MONTH_ALT})\.?\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s+(\d{{4}})\b",
    re.IGNORECASE,
)
# 2026-09-30 (also tolerates 2026/09/30)
_ISO = re.compile(r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b")
# 30/09/2026 or 09/30/2026 or 30.09.2026 (ambiguous day/month order)
_NUMERIC = re.compile(r"\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b")

# Phrases that introduce a deadline. Ordered most- to least-specific so the
# most explicit label wins when several appear in the same blob of text.
DEADLINE_LABELS: tuple[str, ...] = (
    "application deadline",
    "submission deadline",
    "applications close",
    "applications due",
    "closing date",
    "deadline",
    "apply by",
    "due date",
    "due by",
    "closes on",
    "closes",
    "closing",
    "end date",
    "expires",
    "expiry",
)


def _valid_ymd(year: int, month: int, day: int) -> str | None:
    try:
        return datetime(year, month, day).strftime("%Y-%m-%d")
    except ValueError:
        return None


def _date_from_match(pattern: re.Pattern, match: re.Match) -> str | None:
    if pattern is _ISO:
        return _valid_ymd(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    if pattern is _DAY_MONTH_YEAR:
        return _valid_ymd(int(match.group(3)), MONTHS[match.group(2).lower()], int(match.group(1)))
    if pattern is _MONTH_DAY_YEAR:
        return _valid_ymd(int(match.group(3)), MONTHS[match.group(1).lower()], int(match.group(2)))
    if pattern is _NUMERIC:
        a, b, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        # Ambiguous order. If one value can't be a month it must be the day;
        # otherwise default to day-first (DD/MM), the international convention.
        if a > 12 >= b:
            day, month = a, b
        elif b > 12 >= a:
            day, month = b, a
        else:
            day, month = a, b
        return _valid_ymd(year, month, day)
    return None


def _first_date(text: str) -> str | None:
    """Return the first parseable date anywhere in *text* as ISO, else None."""
    best: tuple[int, str] | None = None
    for pattern in (_ISO, _DAY_MONTH_YEAR, _MONTH_DAY_YEAR, _NUMERIC):
        for match in pattern.finditer(text):
            iso = _date_from_match(pattern, match)
            if iso and (best is None or match.start() < best[0]):
                best = (match.start(), iso)
    return best[1] if best else None


def parse_deadline(text: str | None) -> str | None:
    """Normalise a date found in *text* to ISO (YYYY-MM-DD), or None.

    Accepts a clean date string ("2026-09-30") or a date embedded in prose
    ("Deadline: 30 September 2026"). Returns None when no date is present —
    never guesses.
    """
    if not text:
        return None
    return _first_date(text.strip())


def find_deadline_in_text(text: str | None) -> str | None:
    """Locate a deadline in a larger blob of text (a description, a page body).

    Prefers a date that follows a deadline label ("closing date", "apply by",
    …) so an unrelated date elsewhere in the text isn't mistaken for the
    deadline. Falls back to None when no label-anchored date is found.
    """
    if not text:
        return None
    lowered = text.lower()
    for label in DEADLINE_LABELS:
        start = lowered.find(label)
        while start != -1:
            # Look in the window just after the label for a date.
            window = text[start + len(label): start + len(label) + 80]
            iso = _first_date(window)
            if iso:
                return iso
            start = lowered.find(label, start + 1)
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
