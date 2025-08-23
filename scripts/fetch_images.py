import requests
from bs4 import BeautifulSoup
import os
import json

# NOAA directory for UMV GEOCOLOR imagery
BASE_URL = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/umv/GEOCOLOR/"

# Paths relative to repo root (script is inside /scripts)
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
SAVE_DIR = os.path.join(ROOT_DIR, "docs", "images")
LATEST_JSON = os.path.join(ROOT_DIR, "docs", "latest.json")

os.makedirs(SAVE_DIR, exist_ok=True)

# Get list of available files
try:
    resp = requests.get(BASE_URL, timeout=20)
    resp.raise_for_status()
except Exception as e:
    raise SystemExit(f"Error fetching NOAA directory: {e}")

soup = BeautifulSoup(resp.text, "html.parser")

# Collect only 2400x2400 images
files = [
    link.get("href")
    for link in soup.find_all("a")
    if link.get("href")
    and link.get("href").endswith("2400x2400.jpg")
    and "_" in link.get("href")
]

# Sort chronologically
files.sort()

# Keep only the 50 most recent
files = files[-50:]

# Download images
image_paths = []
for f in files:
    url = BASE_URL + f
    local_path = os.path.join(SAVE_DIR, f)
    if not os.path.exists(local_path):
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            with open(local_path, "wb") as out:
                out.write(r.content)
        except Exception as e:
            print(f"Failed to download {url}: {e}")
            continue
    image_paths.append(local_path)

# Save "latest.json" inside /docs
if files:
    latest = files[-1]
    with open(LATEST_JSON, "w") as jf:
        json.dump({"latest_image": f"images/{latest}"}, jf, indent=2)

# Remove old images from docs/images/ if they are not in the current list
existing_files = set(os.listdir(SAVE_DIR))
keep_files = set(files)
delete_files = existing_files - keep_files

for old in delete_files:
    old_path = os.path.join(SAVE_DIR, old)
    try:
        os.remove(old_path)
    except Exception as e:
        print(f"Failed to remove {old_path}: {e}")
