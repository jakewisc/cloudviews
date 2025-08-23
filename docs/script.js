document.addEventListener('DOMContentLoaded', () => {
    const goesImage = document.getElementById('goes-image');
    let imagePaths = [];
    let currentIndex = 0;
    let animationInterval;
    const frameRate = 1000 / 15; // 15 frames per second

    async function fetchImages() {
        try {
            const response = await fetch('images.json');
            imagePaths = await response.json();
            console.log(`Fetched ${imagePaths.length} image paths.`);
            
            // Start the animation after fetching the image list
            startAnimation();
        } catch (error) {
            console.error('Failed to fetch image list:', error);
        }
    }

    function updateImage() {
        if (imagePaths.length === 0) return;

        // Display the image
        goesImage.src = imagePaths[currentIndex];
        
        // Move to the next frame, loop back to the start if at the end
        currentIndex = (currentIndex + 1) % imagePaths.length;
    }

    function startAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
        }
        goesImage.src = imagePaths[currentIndex]; // Set initial image
        animationInterval = setInterval(updateImage, frameRate);
        console.log("Animation started.");
    }
    
    // Initial fetch to start the process
    fetchImages();
});
