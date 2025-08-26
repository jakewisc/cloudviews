document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const goesImage = document.getElementById('goes-image');
    const loadingMessage = document.getElementById('loading-message');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const scrubber = document.getElementById('scrubber');
    const controlsContainer = document.querySelector('.controls-container');

    // --- Configuration ---
    const ANIMATION_FPS = 9;
    const FRAME_INTERVAL_MS = 1000 / ANIMATION_FPS;
    const LAST_FRAME_HOLD_TIME_MS = 1000;

    // --- State Variables ---
    let imagePaths = [];
    let imageCache = {};
    let currentIndex = 0;
    let isPlaying = true;
    let animationFrameId;
    let lastFrameTime = 0;
    
    // --- Core Animation Loop ---

    function runAnimationLoop(currentTime) {
        if (!isPlaying) return;

        const timeSinceLastFrame = currentTime - lastFrameTime;
        const isLastFrame = (currentIndex === imagePaths.length - 1);
        const currentFrameInterval = isLastFrame ? LAST_FRAME_HOLD_TIME_MS : FRAME_INTERVAL_MS;

        if (timeSinceLastFrame >= currentFrameInterval) {
            lastFrameTime = currentTime;
            const nextIndex = (currentIndex + 1) % imagePaths.length;
            updateUI(nextIndex);
        }
        
        animationFrameId = requestAnimationFrame(runAnimationLoop);
    }
    
    // --- UI Update and Display Functions ---

    /**
     * Central function to update all UI elements based on the frame index.
     * @param {number} index - The index of the frame to display.
     */
    function updateUI(index) {
        currentIndex = index;
        scrubber.value = index;
        displayFrame(index);
    }

    function displayFrame(index) {
        const path = imagePaths[index];
        const cachedImage = imageCache[path];
        if (cachedImage) {
            goesImage.src = cachedImage.src;
        }
    }
    
    // --- Animation Control Functions ---
    
    function startAnimation() {
        if (isPlaying) return;
        isPlaying = true;
        playPauseBtn.textContent = '■ Pause';
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(runAnimationLoop);
    }

    function stopAnimation() {
        if (!isPlaying) return;
        isPlaying = false;
        playPauseBtn.textContent = '▶ Play';
        cancelAnimationFrame(animationFrameId);
    }

    function togglePlayPause() {
        if (isPlaying) {
            stopAnimation();
        } else {
            if (imagePaths.length > 0) {
                startAnimation();
            }
        }
    }

    function prevFrame() {
        stopAnimation();
        const newIndex = (currentIndex - 1 + imagePaths.length) % imagePaths.length;
        updateUI(newIndex);
    }

    function nextFrame() {
        stopAnimation();
        const newIndex = (currentIndex + 1) % imagePaths.length;
        updateUI(newIndex);
    }
    
    // --- Scrubber Handling Functions ---
    
    function handleScrubberInput() {
        stopAnimation();
        const newIndex = parseInt(scrubber.value, 10);
        updateUI(newIndex);
    }
    
    // --- Loading and Initialization ---

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
            controlsContainer.style.display = 'flex';
            
            scrubber.max = imagePaths.length - 1;

            updateUI(0);
            
            isPlaying = false;
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
    
    // --- Initialization ---

    function initialize() {
        playPauseBtn.addEventListener('click', togglePlayPause);
        prevBtn.addEventListener('click', prevFrame);
        nextBtn.addEventListener('click', nextFrame);
        scrubber.addEventListener('change', handleScrubberInput);

        fetchImages();
    }
    
    initialize();
});
