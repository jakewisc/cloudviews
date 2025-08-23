import requests
from bs4 import BeautifulSoup
import os
import json
import concurrent.futures
import logging

# Set up basic logging for better feedback
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Constants ---
BASE_URL = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/umv/GEOCOLOR/"  # NOAA directory for UMV GEOCOLOR imagery
IMAGE_SIZE_FILTER = "2400x2400.jpg"
MAX_IMAGES_TO_KEEP = 75

# Paths relative to repo root (script is inside /scripts)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
SAVE_DIR = os.path.join(ROOT_DIR, "docs", "images")
IMAGES_JSON = os.path.join(ROOT_DIR, "docs", "images.json")

# Helper Function for Concurrent Downloads
def download_image(file_name):
    """Downloads a single image file, skipping if it already exists."""
    url = BASE_URL + file_name
    local_path = os.path.join(SAVE_DIR, file_name)

    if os.path.exists(local_path):
        logging.info(f"Skipping {file_name}, already exists.")
        return local_path
    
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        with open(local_path, "wb") as out:
            out.write(r.content)
        logging.info(f"Downloaded {file_name}")
        return local_path
    except Exception as e:
        logging.error(f"Failed to download {url}: {e}")
        return None


# --- Main Script Logic ---
os.makedirs(SAVE_DIR, exist_ok=True)

# 1. Get list of all files available online
try:
    logging.info("Fetching image list from NOAA directory...")
    resp = requests.get(BASE_URL, timeout=20)
    resp.raise_for_status()
except Exception as e:
    raise SystemExit(f"Error fetching NOAA directory: {e}")

soup = BeautifulSoup(resp.text, "html.parser")

# Collect only images of specified resolution (e.g. 2400x2400.jpg)
files_to_have = [
    link.get("href")
    for link in soup.find_all("a")
    if link.get("href")
    and IMAGE_SIZE_FILTER in link.get("href")
    and "_" in link.get("href")
]

logging.info(f"Found {len(files_to_have)} images. Keeping the {MAX_IMAGES_TO_KEEP} most recent.")

# Sort chronologically
files_to_have.sort()

# Keep only the specified number (e.g. 50)
files_to_have = files_to_have[-MAX_IMAGES_TO_KEEP:]

# 2. Concurrently download all the files we want to have
logging.info("Starting concurrent downloads...")
image_paths = []
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = executor.map(download_image, files_to_have)
    for path in results:
        if path:
            image_paths.append(path)

# 3. Use the list of successfully downloaded/existing images to determine which to keep
successful_files = [os.path.basename(p) for p in image_paths]
keep_files_set = set(successful_files)

# 4. Remove any images that are not in the successful set
existing_files_on_disk = set(os.listdir(SAVE_DIR))
delete_files = existing_files_on_disk - keep_files_set

if delete_files:
    logging.info(f"Found {len(delete_files)} old images to remove.")
    for old in delete_files:
        old_path = os.path.join(SAVE_DIR, old)
        try:
            os.remove(old_path)
            logging.info(f"Removed old image: {old}")
        except Exception as e:
            logging.error(f"Failed to remove {old_path}: {e}")

# 5. Get the final, clean list of files that exist in the directory
final_files_on_disk = sorted([f for f in os.listdir(SAVE_DIR) if f.endswith(IMAGE_SIZE_FILTER)])

# 6. Write the JSON file based on the final list of files
if final_files_on_disk:
    relative_paths = [f"images/{f}" for f in final_files_on_disk]
    with open(IMAGES_JSON, "w") as jf:
        json.dump(relative_paths, jf, indent=2)
    logging.info(f"Updated {IMAGES_JSON} with {len(final_files_on_disk)} image paths.")
else:
    with open(IMAGES_JSON, "w") as jf:
        json.dump([], jf, indent=2)
    logging.warning(f"No images found. {IMAGES_JSON} was written with an empty list.")
