import requests
from bs4 import BeautifulSoup
import os
import json
import concurrent.futures
import logging
from PIL import Image
import io
from functools import partial

# Set up basic logging for better feedback
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Constants ---
IMAGE_SIZE_FILTER = "2400x2400.jpg"
MAX_IMAGES_TO_KEEP = 60
WEBP_QUALITY = 80  # WebP compression quality (0-100)
MAX_WORKERS = 10   # Number of concurrent download threads

# --- Base Paths (relative to the script's location) ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)

# --- NEW: Configuration for all image output targets ---
# This list is the "single source of truth". To add a new region,
# just add a new dictionary entry here.
IMAGE_TARGETS = [
    {
        "name": "umv", # Upper Midwest Valley
        "base_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/umv/GEOCOLOR/",
        "save_dir": os.path.join(ROOT_DIR, "docs", "images", "umv"),
        "json_file": os.path.join(ROOT_DIR, "docs", "images", "images_umv.json")
    },
    {
        "name": "nr", # Northern Rockies
        "base_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/nr/GEOCOLOR/",
        "save_dir": os.path.join(ROOT_DIR, "docs", "images", "nr"),
        "json_file": os.path.join(ROOT_DIR, "docs", "images", "images_nr.json")
    },
    {
        "name": "ne", # Northeast
        "base_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/GEOCOLOR/",
        "save_dir": os.path.join(ROOT_DIR, "docs", "images", "ne"),
        "json_file": os.path.join(ROOT_DIR, "docs", "images", "images_ne.json")
    }
    # Example for another region:
    # {
    #     "name": "sp", # Southern Plains
    #     "base_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/sp/GEOCOLOR/",
    #     "save_dir": os.path.join(ROOT_DIR, "docs", "images", "sp"),
    #     "json_file": os.path.join(ROOT_DIR, "docs", "images_sp.json")
    # }
]

def download_image(file_name, base_url, save_dir):
    """
    Downloads a single image file, converts it to WebP, and saves it.
    Returns the local path of the saved WebP file if successful, otherwise None.
    """
    webp_filename = file_name.replace(".jpg", ".webp")
    local_webp_path = os.path.join(save_dir, webp_filename)

    if os.path.exists(local_webp_path):
        # This is logged at the DEBUG level to avoid cluttering the output
        logging.debug(f"Skipping {webp_filename}, already exists.")
        return local_webp_path

    try:
        url = base_url + file_name
        r = requests.get(url, timeout=30)
        r.raise_for_status()

        image_data = io.BytesIO(r.content)
        img = Image.open(image_data)
        img.save(local_webp_path, 'webp', quality=WEBP_QUALITY)

        logging.info(f"Downloaded and converted {file_name} to {webp_filename}.")
        return local_webp_path

    except requests.exceptions.RequestException as req_error:
        logging.error(f"Failed to download {url}: {req_error}")
        return None
    except Exception as conv_error:
        logging.error(f"Failed to convert or save image {file_name}: {conv_error}")
        return None

def process_target(target):
    """
    Processes a single image target from the configuration.
    This includes fetching, downloading, converting, and cleaning files.
    """
    target_name = target["name"]
    base_url = target["base_url"]
    save_dir = target["save_dir"]
    json_file = target["json_file"]

    logging.info(f"--- Starting processing for target: {target_name.upper()} ---")
    os.makedirs(save_dir, exist_ok=True)

    # 1. Get list of files from the NOAA directory
    try:
        logging.info(f"Fetching image list from {base_url}...")
        resp = requests.get(base_url, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        logging.error(f"Error fetching directory for {target_name.upper()}: {e}")
        return # Skip this target if we can't get the file list

    soup = BeautifulSoup(resp.text, "html.parser")
    files_to_have = sorted([
        link.get("href") for link in soup.find_all("a")
        if link.get("href") and IMAGE_SIZE_FILTER in link.get("href") and “_” in link.get(“href”)
    ])[-MAX_IMAGES_TO_KEEP:]

    logging.info(f"Found {len(files_to_have)} images for {target_name.upper()}.")

    # 2. Concurrently download, convert, and save images
    image_paths = []
    download_task = partial(download_image, base_url=base_url, save_dir=save_dir)

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = executor.map(download_task, files_to_have)
        image_paths.extend(path for path in results if path)

    # 3. Clean up old images from the save directory
    successful_files = {os.path.basename(p) for p in image_paths}
    for existing_file in os.listdir(save_dir):
		# Skip any file that is not a .webp image
        if not existing_file.endswith('.webp'):
            continue
        if existing_file not in successful_files:
            try:
                os.remove(os.path.join(save_dir, existing_file))
                logging.info(f"Removed old image: {existing_file}")
            except Exception as e:
                logging.error(f"Failed to remove {existing_file}: {e}")

    # 4. Write the final list of relative paths to the JSON file
    final_files_on_disk = sorted(os.listdir(save_dir))
    relative_paths = [f"images/{target_name}/{f}" for f in final_files_on_disk]

    with open(json_file, "w") as jf:
        json.dump(relative_paths, jf, indent=2)

    if relative_paths:
        logging.info(f"Updated {json_file} with {len(relative_paths)} image paths.")
    else:
        logging.warning(f"No images found for {target_name.upper()}. Wrote an empty list to {json_file}.")
    
    logging.info(f"--- Finished processing for target: {target_name.upper()} ---")

def main():
    """Main function to iterate through and process all configured targets."""
    logging.info("Starting image fetching and processing script.")
    for target in IMAGE_TARGETS:
        process_target(target)
    logging.info("All targets processed. Script finished.")

if __name__ == "__main__":
    main()