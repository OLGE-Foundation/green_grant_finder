import sys
import logging
from utils.dedup import generate_fingerprint
from scrapers._helpers import infer_tags, grant_row

# Set up clean logging output
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("test_pipeline")


def run_local_tests():
    logger.info("Starting Phase 3 Verification Test Suite...")
    errors = 0

    # --- TEST 1: Tag Inference Empty Fallback ---
    logger.info("Running Test 1: Tag Inference Fallback Check...")
    keyword_map = [("solar", "Clean energy"), ("ocean", "Ocean conservation")]
    allowed_sectors = ["Clean energy", "Biodiversity", "Ocean conservation"]

    # Text with zero matches
    result_empty = infer_tags(
        "A basic grant for general community development funding.",
        keyword_map,
        allowed_sectors,
    )
    if result_empty != []:
        logger.error("FAIL: Expected empty list [], got %s", result_empty)
        errors += 1
    else:
        logger.info(
            "PASS: infer_tags successfully returned an empty list when no keywords matched."
        )

    # --- TEST 2: Canonical Schema Validation via grant_row ---
    logger.info("Running Test 2: grant_row Dictionary Validation...")
    try:
        row = grant_row(
            title="Eco Tech Grant",
            provider="Green Tech Foundation",
            description="Funding for generic eco research.",
            url="https://example.com/grant",
            amount_min=None,
            amount_max=None,
            deadline=None,
            sector=None,
            region=None,
            eligibility=None,
        )

        assert row["status"] == "pending", "Status must always default to 'pending'"
        assert row["source"] == "scraper", "Source must always default to 'scraper'"
        assert isinstance(row["sector"], list), "Sector must be a list layer structure"
        logger.info("PASS: grant_row yields a perfectly conformed data dictionary structure.")
    except Exception as e:
        logger.error("FAIL: grant_row normalization error: %s", e)
        errors += 1

    # --- TEST 3: Fingerprint Uniqueness Determinism ---
    logger.info("Running Test 3: Fingerprint Hash Verification...")
    fp1 = generate_fingerprint(" Green Grant ", "Provider A", "https://site.com/link ")
    fp2 = generate_fingerprint("green grant", "provider a", "https://site.com/link")

    if fp1 != fp2:
        logger.error("FAIL: Fingerprint generation is not case or whitespace insensitive.")
        errors += 1
    else:
        logger.info("PASS: Fingerprint hashing matches exactly across mutations: %s", fp1)

    # --- TEST 4: Intra-Run Deduplication Logic Mock ---
    logger.info("Running Test 4: Intra-Run Multi-Engine Duplicate Strip Check...")

    mock_scraped_master = [
        {"title": "Duplicate Grant", "provider": "Core Fund", "url": "https://dup.org"},
        {"title": "Duplicate Grant", "provider": "Core Fund", "url": "https://dup.org"},
    ]

    unique_by_fingerprint: dict[str, dict] = {}
    for grant in mock_scraped_master:
        fp = generate_fingerprint(grant["title"], grant["provider"], grant["url"])
        grant["fingerprint"] = fp
        if fp not in unique_by_fingerprint:
            unique_by_fingerprint[fp] = grant

    if len(unique_by_fingerprint) != 1:
        logger.error(
            "FAIL: Orchestration deduplication wrapper failed to filter. Items count: %d",
            len(unique_by_fingerprint),
        )
        errors += 1
    else:
        logger.info(
            "PASS: Internal duplicate loop correctly collapsed the multiple targets "
            "into a single payload array item."
        )

    # --- SUMMARY ---
    print("\n--------------------------------------------------")
    if errors == 0:
        logger.info(
            "SUCCESS: All pre-flight checklist assertions passed flawlessly! "
            "Code is ready for deployment."
        )
        return 0
    else:
        logger.error(
            "CRITICAL: Test suite finished with %d tracking errors. "
            "Fix discrepancies before checking in.",
            errors,
        )
        return 1


if __name__ == "__main__":
    sys.exit(run_local_tests())
