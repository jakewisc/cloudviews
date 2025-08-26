document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const goesImage = document.getElementById('goes-image');
    const loadingMessage = document.getElementById('loading-message'); 
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    // --- Configuration ---
    const ANIMATION_FPS = 9;
    const FRAME_RATE_MS = 1000 / ANIMATION_FPS;

    // --- State Variables ---
    let imagePaths = []; 
    let imageCache = {}; 
    let currentIndex = 0;
    let animationInterval;
    let isPlaying = true; // Start in playing state

    // --- Animation Control Functions ---
    
    function startAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
        }
        isPlaying = true;
        playPauseBtn.textContent = '■ Pause';
        animationInterval = setInterval(updateImage, FRAME_RATE_MS);
        console.log(`Animation started at ${ANIMATION_FPS} FPS.`);
    }

    function stopAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
        }
        isPlaying = false;
        playPauseBtn.textContent = '▶ Play';
        console.log('Animation paused.');
    }

    function togglePlayPause() {
        if (isPlaying) {
            stopAnimation();
        } else {
            startAnimation();
        }
    }

    function prevFrame() {
        stopAnimation(); 
        currentIndex = (currentIndex - 1 + imagePaths.length) % imagePaths.length;
        displayFrame(currentIndex);
    }

    function nextFrame() {
        stopAnimation();
        currentIndex = (currentIndex + 1) % imagePaths.length;
        displayFrame(currentIndex);
    }

    // --- Image Display/Cache Functions ---

    /**
     * Displays a specific frame from the cache.
     * @param {number} index - The index of the frame to display.
     */
    function displayFrame(index) {
        const path = imagePaths[index];
        const cachedImage = imageCache[path];

        if (cachedImage) {
            goesImage.src = cachedImage.src; 
        }
    }

    /**
     * Updates the displayed image based on the animation interval.
     */
    function updateImage() {
        if (imagePaths.length === 0) return;

        // Display the frame and advance the index
        displayFrame(currentIndex);
        currentIndex = (currentIndex + 1) % imagePaths.length;
    }
    
    // --- Load All Images at Once ---

    async function loadAllImages() {
        if (imagePaths.length === 0) return;

        const loadPromises = imagePaths.map(path => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    imageCache[path] = img; 
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${path}`);
                    reject();
                };
                img.src = path;
            });
        });
        
        try {
            // Wait for all images to finish loading
            await Promise.all(loadPromises);
            console.log("All images loaded.");

            // Hide the loading message and show the image
            loadingMessage.style.display = 'none';
            goesImage.style.display = 'block'; 

            // Start the animation
            startAnimation();

        } catch (error) {
            console.error("Failed to load all images:", error);
            loadingMessage.textContent = "Error loading images. Please try refreshing.";
        }
    }

    async function fetchImages() {
        try {
            const response = await fetch('images.json');
            imagePaths = await response.json();
            
            if (imagePaths.length > 0) {
                // Now, load all images at once instead of in a buffer
                loadAllImages();
            }
        } catch (error) {
            console.error('Failed to fetch image list:', error);
            loadingMessage.textContent = "Error loading data. Please try refreshing.";
        }
    }
    
    // --- Initialization & Event Listeners ---
    
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', prevFrame);
    nextBtn.addEventListener('click', nextFrame);

    fetchImages();
});
