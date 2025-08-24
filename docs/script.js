document.addEventListener('DOMContentLoaded', () => {
    const goesImage = document.getElementById('goes-image');
    const loadingMessage = document.getElementById('loading-message'); // Get the loading message element
    
    // --- Configuration ---
    const ANIMATION_FPS = 9;
    const FRAME_RATE_MS = 1000 / ANIMATION_FPS;
    const PRELOAD_BUFFER_SIZE = 10; // Load 10 frames ahead of the current one

    // --- State Variables ---
    let imagePaths = []; // Array of all image URLs (from images.json)
    let imageCache = {}; // Cache to store loaded Image objects: {path: ImageObject}
    let currentIndex = 0;
    let animationInterval;

    // --- Core Functions ---

    /**
     * Fetches the list of image paths from images.json and starts the process.
     */
    async function fetchImages() {
        try {
            const response = await fetch('images.json');
            imagePaths = await response.json();
            console.log(`Fetched ${imagePaths.length} image paths.`);
            
            if (imagePaths.length > 0) {
                // Set the initial image source (this starts the load process)
                goesImage.src = imagePaths[0]; 
                
                // Immediately start preloading the rest of the buffer
                await preloadFrames(0); 
                startAnimation();
            }
        } catch (error) {
            console.error('Failed to fetch image list:', error);
            loadingMessage.textContent = "Error loading data. Please try refreshing.";
        }
    }

    /**
     * Preloads a batch of frames into the browser's cache/memory concurrently.
     * @param {number} startIndex - The index to begin preloading from.
     */
    async function preloadFrames(startIndex) {
        const pathsToPreload = [];
        // Calculate the end index, ensuring we don't go past the total number of images
        const endIndex = Math.min(imagePaths.length, startIndex + PRELOAD_BUFFER_SIZE);
        
        // 1. Identify which paths need loading
        for (let i = startIndex; i < endIndex; i++) {
            const path = imagePaths[i];
            if (!imageCache[path]) {
                pathsToPreload.push(path);
            }
        }
        
        if (pathsToPreload.length === 0) {
            // console.log('Preload buffer is full or no new images to load.');
            return;
        }

        // console.log(`Preloading ${pathsToPreload.length} frames...`);

        // 2. Create an array of Promises, one for each image load
        const loadPromises = pathsToPreload.map(path => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    imageCache[path] = img; // Store the fully loaded Image object
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${path}`);
                    delete imageCache[path]; // Don't cache failed images
                    reject();
                };
                img.src = path;
            });
        });

        // 3. Wait for all images in the current batch to finish loading
        // Use .catch(() => {}) so that a single failed image doesn't stop Promise.all
        await Promise.all(loadPromises.map(p => p.catch(() => {})));
    }

    /**
     * Updates the displayed image from the cache and advances the frame index.
     */
    function updateImage() {
        if (imagePaths.length === 0) return;

        const nextPath = imagePaths[currentIndex];
        const nextImage = imageCache[nextPath];
        
        if (nextImage) {
            // Check for the first time the image is displayed
            if (loadingMessage.style.display !== 'none') {
                loadingMessage.style.display = 'none';
                goesImage.style.display = 'block'; 
            }

            // Display the image using the cached Image object source
            goesImage.src = nextImage.src; 
            
            // Advance index, wrapping around to the start if at the end
            currentIndex = (currentIndex + 1) % imagePaths.length;
            
            // Kick off the preload for the *next* required batch
            preloadFrames(currentIndex);

        } else {
            // Safeguard: If the image isn't in cache, stop animation and load it.
            console.warn(`Frame ${currentIndex} not in cache. Stopping animation to load.`);
            clearInterval(animationInterval);
            
            loadingMessage.textContent = "Buffering... Please wait.";
            loadingMessage.style.display = 'block';
            goesImage.style.display = 'none';

            // Attempt to load the missing frame immediately
            preloadFrames(currentIndex).then(() => {
                // If successful, restart animation
                startAnimation();
            });
        }
    }

    /**
     * Clears any existing interval and starts the animation loop.
     */
    function startAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
        }
        // Run updateImage at the specified frame rate
        animationInterval = setInterval(updateImage, FRAME_RATE_MS);
        console.log(`Animation started at ${ANIMATION_FPS} FPS.`);
    }
    
    // --- Initialization ---
    fetchImages();
});
