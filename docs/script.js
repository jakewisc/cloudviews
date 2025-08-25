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
    const PRELOAD_BUFFER_SIZE = 20; 

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
        playPauseBtn.textContent = '◼ Pause';
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
        // Stop animation for manual control
        stopAnimation(); 
        
        // Decrement index, wrapping around to the end
        currentIndex = (currentIndex - 1 + imagePaths.length) % imagePaths.length;
        
        // Immediately display the new frame and ensure it's preloaded
        displayFrame(currentIndex);
    }

    function nextFrame() {
        // Stop animation for manual control
        stopAnimation();

        // Increment index, wrapping around to the start
        currentIndex = (currentIndex + 1) % imagePaths.length;

        // Immediately display the new frame and ensure it's preloaded
        displayFrame(currentIndex);
    }

    // --- Image Display/Cache Functions ---

    /**
     * Displays a specific frame, using the cache.
     * @param {number} index - The index of the frame to display.
     */
    function displayFrame(index) {
        const path = imagePaths[index];
        const cachedImage = imageCache[path];

        if (cachedImage) {
            // Display the image from cache
            goesImage.src = cachedImage.src; 
            
            // Ensure UI state is correct (hide loading, show image)
            if (loadingMessage.style.display !== 'none') {
                loadingMessage.style.display = 'none';
                goesImage.style.display = 'block'; 
            }

            // Kick off preloading for frames ahead of the new position
            preloadFrames(index);
        }
        // If it's NOT cached, updateImage will handle the buffer warning and loading.
    }

    /**
     * Updates the displayed image based on the animation interval.
     */
    function updateImage() {
        if (imagePaths.length === 0) return;

        const nextPath = imagePaths[currentIndex];
        const nextImage = imageCache[nextPath];
        
        if (nextImage) {
            // Display the frame and advance the index
            displayFrame(currentIndex);
            currentIndex = (currentIndex + 1) % imagePaths.length;
        } else {
            // Safeguard: Frame missing. Stop animation, show message, and force load.
            console.warn(`Frame ${currentIndex} not in cache. Stopping animation to load.`);
            clearInterval(animationInterval);
            
            loadingMessage.textContent = "Buffering... Please wait.";
            loadingMessage.style.display = 'block';
            goesImage.style.display = 'none';

            preloadFrames(currentIndex).then(() => {
                // If successful, restart animation where it left off
                if (isPlaying) {
                   startAnimation();
                }
            });
        }
    }
    
    // --- Preloading & Fetching Functions ---

    async function preloadFrames(startIndex) {
        const pathsToPreload = [];
        const endIndex = Math.min(imagePaths.length, startIndex + PRELOAD_BUFFER_SIZE);
        
        for (let i = startIndex; i < endIndex; i++) {
            const path = imagePaths[i];
            if (!imageCache[path]) {
                pathsToPreload.push(path);
            }
        }
        
        if (pathsToPreload.length === 0) return;

        const loadPromises = pathsToPreload.map(path => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    imageCache[path] = img; 
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${path}`);
                    delete imageCache[path]; 
                    reject();
                };
                img.src = path;
            });
        });
        
        await Promise.all(loadPromises.map(p => p.catch(() => {})));
    }

    async function fetchImages() {
        try {
            const response = await fetch('images.json');
            imagePaths = await response.json();
            
            if (imagePaths.length > 0) {
                // Set the initial image source to kick off the browser load
                goesImage.src = imagePaths[0]; 
                
                // Immediately start aggressive preloading
                await preloadFrames(0); 
                startAnimation();
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
