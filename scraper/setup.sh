#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

python3 -m venv .venv
# shellcheck source=/dev/null
source .venv/bin/activate
python -m pip install --upgrade pip

pip install -r requirements.txt

playwright install chromium

echo ""
echo "Setup complete. Run the scraper with:"
echo "  source .venv/bin/activate"
echo "  python scraper.py"
