import hashlib


def generate_fingerprint(title: str, provider: str, url: str) -> str:
    raw = (
        f"{title.strip().lower()}|{provider.strip().lower()}|{url.strip().lower()}"
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
