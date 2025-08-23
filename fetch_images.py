import requests
from bs4 import BeautifulSoup
import os
import json

# NOAA directory for UMV GEOCOLOR imagery
BASE_URL = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/umv/GEOCOLOR/"

# Local folder to store images
SAVE_DIR = "docs/images"
os.makedirs(SAVE_DIR, exist_ok=True)

# Get list of available files
resp = requests.get(BASE_URL)
soup = BeautifulSoup(resp.text, "html.parser")

# Collect only 2400x2400 images
files = [link.get("href") for link in soup.find_all("a") if "2400x2400.jpg" in str(link.get("href"))]

# Sort chronologically
files.sort()

# Keep only the 75 most recent
files = files[-75:]

# Download images
image_paths = []
for f in files:
    url = BASE_URL + f
    local_path = os.path.join(SAVE_DIR, f)
    if not os.path.exists(local_path):
        r = requests.get(url)
        with open(local_path, "wb") as out:
            out.write(r.content)
    image_paths.append(local_path)

# Save "latest.json" inside /docs
latest = files[-1] if files else None
if latest:
    with open("docs/latest.json", "w") as jf:
        json.dump({"latest_image": f"images/{latest}"}, jf)
