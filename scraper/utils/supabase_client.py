import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

_scraper_root = Path(__file__).resolve().parents[1]
_repo_root = _scraper_root.parent

load_dotenv(_scraper_root / ".env")
load_dotenv(_repo_root / ".env.local")
load_dotenv(_repo_root / ".env")


def _normalize_supabase_url(url: str) -> str:
    return url.strip().rstrip("/").removesuffix("/rest/v1")


def _get_supabase_url() -> str:
    raw = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        or ""
    )
    return _normalize_supabase_url(raw)


def _get_service_role_key() -> str:
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()


_supabase_url = _get_supabase_url()
_supabase_key = _get_service_role_key()

if not _supabase_url or not _supabase_key:
    raise RuntimeError(
        "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and "
        "SUPABASE_SERVICE_ROLE_KEY in scraper/.env or the repo root .env / .env.local."
    )

supabase = create_client(_supabase_url, _supabase_key)
