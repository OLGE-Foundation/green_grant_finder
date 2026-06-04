#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

python3 -m venv .venv
# shellcheck source=/dev/null
source .venv/bin/activate
python -m pip install --upgrade pip

pip install beautifulsoup4==4.12.3 python-dotenv==1.0.1
pip install "playwright>=1.48.0"
pip install supabase==2.4.0
pip install httpx==0.27.0 --force-reinstall

playwright install chromium

echo ""
echo "Setup complete. Run the scraper with:"
echo "  source .venv/bin/activate"
echo "  python scraper.py"
