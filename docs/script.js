document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const goesImage = document.getElementById('goes-image');
    const loadingMessage = document.getElementById('loading-message');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    // --- Configuration ---
    const ANIMATION_FPS = 9;
    const FRAME_INTERVAL_MS = 1000 / ANIMATION_FPS;
    const LAST_FRAME_HOLD_TIME_MS = 1000;

    // --- State Variables ---
    let imagePaths = []; 
    let imageCache = {}; 
    let currentIndex = 0;
    let isPlaying = true; 

    // --- State for requestAnimationFrame ---
    let animationFrameId;
    let lastFrameTime = 0;

    // --- Animation Control Functions ---
    
    function startAnimation() {
        if (isPlaying) return; // Prevent multiple loops
        isPlaying = true;
        playPauseBtn.textContent = '■ Pause';
        console.log(`Animation started at ${ANIMATION_FPS} FPS.`);
        
        // Reset the timer and start the loop
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(runAnimationLoop);
    }

    function stopAnimation() {
        if (!isPlaying) return; // Already stopped
        isPlaying = false;
        playPauseBtn.textContent = '▶ Play';
        
        cancelAnimationFrame(animationFrameId);
        console.log('Animation paused.');
    }

    function togglePlayPause() {
        // We check isPlaying's current state to decide the action
        if (isPlaying) {
            stopAnimation();
        } else {
            // Only start if images are available
            if (imagePaths.length > 0) {
                startAnimation();
            }
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

    function displayFrame(index) {
        const path = imagePaths[index];
        const cachedImage = imageCache[path];
        if (cachedImage) {
            goesImage.src = cachedImage.src; 
        }
    }

    /**
     * REFACTORED: Manages the animation loop using requestAnimationFrame.
     * @param {DOMHighResTimeStamp} currentTime - Provided by requestAnimationFrame
     */
    function runAnimationLoop(currentTime) {
        if (!isPlaying) return;

        const timeSinceLastFrame = currentTime - lastFrameTime;
        const isLastFrame = (currentIndex === imagePaths.length - 1);
        const currentFrameInterval = isLastFrame ? LAST_FRAME_HOLD_TIME_MS : FRAME_INTERVAL_MS;

        // Check if enough time has passed to show the next frame
        if (timeSinceLastFrame >= currentFrameInterval) {
            lastFrameTime = currentTime; // Update the time for the next frame calculation
            
            // Move to the next index and display it
            currentIndex = (currentIndex + 1) % imagePaths.length;
            displayFrame(currentIndex);
        }
        
        // Request the next frame to continue the loop
        animationFrameId = requestAnimationFrame(runAnimationLoop);
    }

    // --- Load All Images at Once with Progress Counter (Original Logic) ---

    async function loadAllImages() {
        if (imagePaths.length === 0) return;
        
        let loadedCount = 0;
        const totalCount = imagePaths.length;
        
        const loadPromises = imagePaths.map(path => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    loadedCount++;
                    loadingMessage.textContent = `Loading Image ${loadedCount}/${totalCount}...`;
                    imageCache[path] = img; 
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${path}`);
                    reject(new Error(`Failed to load ${path}`));
                };
                img.src = path;
            });
        });
        
        try {
            await Promise.all(loadPromises);
            
            loadingMessage.style.display = 'none';
            goesImage.style.display = 'block'; 

            // Display the first frame immediately before starting the loop
            displayFrame(currentIndex);
            
            // Start animation (isPlaying is initially true)
            isPlaying = false; // Set to false so togglePlayPause properly starts it
            togglePlayPause();

        } catch (error) {
            console.error("Failed to load one or more images:", error);
            loadingMessage.textContent = "Error loading images. Please try refreshing.";
        }
    }

    async function fetchImages() {
        try {
            const response = await fetch('images.json');
            imagePaths = await response.json();
            
            if (imagePaths.length > 0) {
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
