
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const cursor = document.getElementById('hand-cursor');
const cameraToggle = document.getElementById('camera-toggle');
const cameraContainer = document.getElementById('camera-container');
const loadingSpinner = document.getElementById('loading-spinner');

let isCameraRunning = false;
let camera = null;
let customDraggingItem = null;
let isPinching = false;

// MediaPipe Setup
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Toggle Camera
cameraToggle.addEventListener('change', async (e) => {
    if (e.target.checked) {
        startCamera();
        cursor.classList.remove('hidden');
        cameraContainer.classList.remove('hidden');
    } else {
        stopCamera();
        cursor.classList.add('hidden');
        cameraContainer.classList.add('hidden');
    }
});

function startCamera() {
    if (isCameraRunning) return;
    loadingSpinner.classList.remove('hidden');

    camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 320,
        height: 240
    });

    camera.start()
        .then(() => {
            isCameraRunning = true;
            loadingSpinner.classList.add('hidden');
        })
        .catch(err => {
            console.error("Camera Error:", err);
            alert("Gagal mengakses kamera. Pastikan izin diberikan.");
            cameraToggle.checked = false;
            loadingSpinner.classList.add('hidden');
        });
}

function stopCamera() {
    if (!isCameraRunning || !camera) return;
    // Camera utils from mediapipe doesn't have a clean 'stop' method exposed easily in all versions, 
    // but disabling the toggle prevents logic execution.
    // Ideally we would stop the stream tracks.
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    isCameraRunning = false;
}

function onResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        return;
    }

    // Draw on canvas (optional, for debugging/feedback)
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
                { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
        }
    }
    canvasCtx.restore();

    // Interaction Logic
    const landmarks = results.multiHandLandmarks[0];

    // 1. Cursor Mapping (Index Finger Tip - 8)
    // Mirror coordinates because camera is mirrored
    const x = (1 - landmarks[8].x) * window.innerWidth;
    const y = landmarks[8].y * window.innerHeight;

    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;

    // 2. Pinch Detection (Index Tip 8 vs Thumb Tip 4)
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.hypot(
        (indexTip.x - thumbTip.x),
        (indexTip.y - thumbTip.y)
    );

    // Threshold for pinch (tune based on testing, 0.05 is rough rel coordinate)
    const PINCH_THRESHOLD = 0.05;

    if (distance < PINCH_THRESHOLD) {
        if (!isPinching) {
            isPinching = true;
            cursor.classList.add('active');
            tryGrab(x, y);
        } else {
            // Continue dragging
            if (customDraggingItem) {
                // Move item with cursor
                customDraggingItem.style.position = 'fixed';
                customDraggingItem.style.left = `${x - customDraggingItem.offsetWidth / 2}px`;
                customDraggingItem.style.top = `${y - customDraggingItem.offsetHeight / 2}px`;
                customDraggingItem.style.zIndex = 1000;
                customDraggingItem.style.pointerEvents = 'none'; // pass through to detect underlying elements
            }
        }
    } else {
        if (isPinching) {
            isPinching = false;
            cursor.classList.remove('active');
            releaseGrab(x, y);
        }
    }
}

function tryGrab(x, y) {
    // Hide cursor momentarily to find element underneath, or use elementsFromPoint
    cursor.style.display = 'none';
    const elements = document.elementsFromPoint(x, y);
    cursor.style.display = '';

    const draggable = elements.find(el => el.classList.contains('draggable-item'));
    const clickable = elements.find(el => el.tagName === 'BUTTON' || el.classList.contains('clickable'));

    if (draggable) {
        customDraggingItem = draggable;
        draggable.classList.add('dragging');
    } else if (clickable) {
        // Simple click trigger
        clickable.click();

        // Visual feedback
        clickable.style.transform = "scale(0.95)";
        setTimeout(() => clickable.style.transform = "", 150);
    }
}

function releaseGrab(x, y) {
    if (!customDraggingItem) return;

    cursor.style.display = 'none';
    const elements = document.elementsFromPoint(x, y);
    cursor.style.display = '';

    // Identify drop target
    const sourceContainer = document.getElementById('source-container');
    const targetContainer = document.getElementById('target-container');

    // Check if we are over source or target bin
    let dropZone = null;
    if (elements.some(el => el.id === 'source-container' || el.closest('#source-container'))) {
        dropZone = sourceContainer;
    } else if (elements.some(el => el.id === 'target-container' || el.closest('#target-container'))) {
        dropZone = targetContainer;
    }

    // Reset style
    customDraggingItem.style.position = '';
    customDraggingItem.style.left = '';
    customDraggingItem.style.top = '';
    customDraggingItem.style.zIndex = '';
    customDraggingItem.style.pointerEvents = '';
    customDraggingItem.classList.remove('dragging');

    if (dropZone) {
        // Prevent re-ordering in target
        if (dropZone.id === 'target-container' && customDraggingItem.parentNode.id === 'target-container') {
            // Do not move. Effectively snap back to original position (which is also target container, just updated via appendChild if we proceeded)
            // But since we are appending, it WOULD change order to bottom. We want to prevent that.
            // So we do NOTHING.
        } else {
            // Move in DOM
            dropZone.appendChild(customDraggingItem);
        }

        // Handle placeholder logic replicated from game-logic.js
        if (dropZone.id === 'target-container') {
            const placeholder = dropZone.querySelector('.placeholder-text');
            if (placeholder) placeholder.remove();
            customDraggingItem.classList.remove('correct', 'incorrect');
        }

        // Restore placeholder source logic if needed
        if (sourceContainer.children.length === 0) {
            // source usually doesn't have placeholder in my logic but target does
        }
        if (targetContainer.children.length === 0) {
            targetContainer.innerHTML = '<div class="placeholder-text">Drag komponen ke sini</div>';
        }
    }

    customDraggingItem = null;
}
