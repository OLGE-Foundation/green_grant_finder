import logging
import sys



from utils.dedup import generate_fingerprint
from utils.supabase_client import supabase
from scrapers.unep import scrape as scrape_unep
from scrapers.globalgiving import scrape as scrape_globalgiving
from scrapers.climateworks import scrape as scrape_climateworks

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("scraper")


def main() -> int:
    master: list[dict] = []

    engines = [
        ("UNEP", scrape_unep),
        ("GlobalGiving", scrape_globalgiving),
        ("Climateworks", scrape_climateworks),
    ]

    for name, scrape_fn in engines:
        try:
            grants = scrape_fn()
            logger.info("%s returned %d grants", name, len(grants))
            master.extend(grants)
        except Exception as exc:
            logger.error("%s scraper failed: %s", name, exc)

    logger.info("Total scraped grants before deduplication: %d", len(master))

    for grant in master:
        grant["fingerprint"] = generate_fingerprint(
            grant["title"],
            grant["provider"],
            grant["url"],
        )

    unique_by_fingerprint: dict[str, dict] = {}
    for grant in master:
        fp = grant["fingerprint"]
        if fp not in unique_by_fingerprint:
            unique_by_fingerprint[fp] = grant

    intra_run_dropped = len(master) - len(unique_by_fingerprint)
    if intra_run_dropped:
        logger.info(
            "Intra-run deduplication: %d unique grants (%d duplicates dropped)",
            len(unique_by_fingerprint),
            intra_run_dropped,
        )

    try:
        response = supabase.table("grants").select("fingerprint").execute()
    except Exception as exc:
        logger.error("Failed to fetch existing fingerprints: %s", exc)
        return 1

    existing = {
        row["fingerprint"]
        for row in (response.data or [])
        if row.get("fingerprint")
    }
    logger.info("Loaded %d existing fingerprints from database", len(existing))

    new_grants = [
        g
        for g in unique_by_fingerprint.values()
        if g["fingerprint"] not in existing
    ]
    logger.info("%d new grants after fingerprint filter", len(new_grants))

    if not new_grants:
        logger.info("No new grants to insert.")
        return 0

    try:
        insert_response = supabase.table("grants").insert(new_grants).execute()
    except Exception as exc:
        logger.error("Bulk insert failed: %s", exc)
        return 1

    inserted = insert_response.data or new_grants
    logger.info("Inserted %d new grants into Supabase", len(inserted))
    return 0


if __name__ == "__main__":
    sys.exit(main())
