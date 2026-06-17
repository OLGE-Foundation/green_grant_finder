import json
import logging
import os
from pathlib import Path

import httpx

from scrapers._helpers import (
    ELIGIBILITY_OPTIONS,
    REGION_OPTIONS,
    SECTOR_OPTIONS,
    grant_row,
    normalize_tags,
    parse_deadline,
)

logger = logging.getLogger(__name__)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[1] / "fixtures" / "globalgiving_feed.json"
)


def parse_globalgiving_payload(data: dict) -> list[dict]:
    grants_raw = data.get("grants")
    if not isinstance(grants_raw, list):
        logger.warning("GlobalGiving payload missing 'grants' array")
        return []

    results: list[dict] = []
    for index, item in enumerate(grants_raw):
        if not isinstance(item, dict):
            logger.warning("GlobalGiving grant at index %d is not an object", index)
            continue

        title = item.get("title")
        provider = item.get("provider")
        description = item.get("description")
        url = item.get("url")

        if not all(isinstance(v, str) and v.strip() for v in (title, provider, description, url)):
            logger.warning("GlobalGiving grant at index %d missing required string fields", index)
            continue

        amount_min = item.get("amount_min")
        amount_max = item.get("amount_max")
        if amount_min is not None and not isinstance(amount_min, (int, float)):
            amount_min = None
        if amount_max is not None and not isinstance(amount_max, (int, float)):
            amount_max = None
        if amount_min is not None:
            amount_min = float(amount_min)
        if amount_max is not None:
            amount_max = float(amount_max)

        # Feeds are inconsistent about the deadline key; accept the common
        # aliases and parse whichever is present first.
        deadline = None
        for key in (
            "deadline",
            "closing_date",
            "closingDate",
            "application_deadline",
            "applicationDeadline",
            "due_date",
            "dueDate",
            "end_date",
            "endDate",
        ):
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                deadline = parse_deadline(value.strip())
                if deadline:
                    break

        sector = normalize_tags(item.get("sector"), SECTOR_OPTIONS)
        region = normalize_tags(item.get("region"), REGION_OPTIONS)
        eligibility = normalize_tags(item.get("eligibility"), ELIGIBILITY_OPTIONS)

        results.append(
            grant_row(
                title=title,
                provider=provider,
                description=description,
                url=url,
                amount_min=amount_min,
                amount_max=amount_max,
                sector=sector or None,
                region=region or None,
                eligibility=eligibility or None,
                deadline=deadline,
            )
        )

    return results


def scrape() -> list[dict]:
    env_url = os.environ.get("GLOBALGIVING_API_URL", "").strip()

    try:
        if env_url:
            logger.info("GlobalGiving scraper fetching %s", env_url)
            response = httpx.get(env_url, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
            data = response.json()
        else:
            logger.info("GlobalGiving scraper loading fixture %s", FIXTURE_PATH)
            with FIXTURE_PATH.open(encoding="utf-8") as handle:
                data = json.load(handle)
    except httpx.HTTPError as exc:
        logger.error("GlobalGiving HTTP request failed: %s", exc)
        return []
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        logger.error("GlobalGiving JSON load failed: %s", exc)
        return []

    grants = parse_globalgiving_payload(data)
    logger.info("GlobalGiving scraper extracted %d grants", len(grants))
    return grants
