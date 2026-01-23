
// Definisi Komponen SDLC dan Distractors
const sdlcComponents = [
    { id: 'sdlc-1', title: 'Requirement Gathering', order: 1, type: 'valid' },
    { id: 'sdlc-2', title: 'Analysis', order: 2, type: 'valid' },
    { id: 'sdlc-3', title: 'System Design', order: 3, type: 'valid' },
    { id: 'sdlc-4', title: 'Development', order: 4, type: 'valid' },
    { id: 'sdlc-5', title: 'Testing & Integration', order: 5, type: 'valid' },
    { id: 'sdlc-6', title: 'Maintenance', order: 6, type: 'valid' }
];

const distractorComponents = [
    { id: 'fake-1', title: 'Profit Maximization', type: 'trap' },
    { id: 'fake-2', title: 'Marketing Campaign', type: 'trap' },
    { id: 'fake-3', title: 'Hardware Manufacture', type: 'trap' },
    { id: 'fake-4', title: 'User Firing', type: 'trap' }
];

const sourceContainer = document.getElementById('source-container');
const targetContainer = document.getElementById('target-container');
const checkBtn = document.getElementById('check-btn');
const resetBtn = document.getElementById('reset-btn');
const soundBtn = document.getElementById('sound-btn');
const startOverlay = document.getElementById('start-overlay');
const startGameBtn = document.getElementById('start-game-btn');
const resultModal = document.getElementById('result-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const closeModalBtn = document.getElementById('close-modal-btn');

let draggedItem = null;

// Initialize Game
function initGame() {
    renderSourceItems();
    setupEventListeners();
}

// Render items in random order in source container
function renderSourceItems() {
    sourceContainer.innerHTML = '';
    targetContainer.innerHTML = '<div class="placeholder-text">Drag tahapan SDLC ke sini</div>';

    // Combine and shuffle
    const allComponents = [...sdlcComponents, ...distractorComponents];
    const shuffled = allComponents.sort(() => Math.random() - 0.5);

    shuffled.forEach(comp => {
        const el = createDraggableElement(comp);
        sourceContainer.appendChild(el);
    });
}

function createDraggableElement(component) {
    const div = document.createElement('div');
    div.classList.add('draggable-item');
    div.setAttribute('draggable', 'true');
    div.setAttribute('data-id', component.id);

    if (component.type === 'valid') {
        div.setAttribute('data-order', component.order);
    } else {
        div.setAttribute('data-type', 'trap');
    }

    div.innerText = component.title;

    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);

    return div;
}

// Drag Events
function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.getAttribute('data-id'));

    // Start BGM on first interaction if not already playing
    // (Backup if overlay was bypassed somehow, though overlay is primary now)
    audioManager.startBGM();
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;

    const placeholder = targetContainer.querySelector('.placeholder-text');
    if (targetContainer.children.length > 0 && placeholder && !placeholder.nextSibling) {
        // If only placeholder exists, do nothing
    }
}

// Container Events
function setupEventListeners() {
    // Source Container
    sourceContainer.addEventListener('dragover', handleDragOver);
    sourceContainer.addEventListener('drop', handleDropSource);

    // Target Container
    targetContainer.addEventListener('dragover', handleDragOver);
    targetContainer.addEventListener('drop', handleDropTarget);

    checkBtn.addEventListener('click', checkStructure);
    resetBtn.addEventListener('click', resetGame);
    soundBtn.addEventListener('click', toggleSound);

    startGameBtn.addEventListener('click', () => {
        startOverlay.classList.add('hidden');
        audioManager.startBGM();
    });

    closeModalBtn.addEventListener('click', () => {
        resultModal.classList.add('hidden');
    });
}

function toggleSound() {
    const isMuted = audioManager.toggleMute();
    soundBtn.innerText = isMuted ? '🔇 Sound Off' : '🔊 Sound On';
    if (!isMuted) audioManager.startBGM(); // Ensure BGM starts if unmutes
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDropTarget(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = document.querySelector(`[data-id="${id}"]`);

    if (item) {
        // Prevent re-ordering if already in target container
        if (item.parentNode === targetContainer) {
            return;
        }

        const placeholder = targetContainer.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }
        targetContainer.appendChild(item);
        item.classList.remove('correct', 'incorrect');
    }
}

function handleDropSource(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = document.querySelector(`[data-id="${id}"]`);

    if (item) {
        sourceContainer.appendChild(item);
        item.classList.remove('correct', 'incorrect');

        if (targetContainer.children.length === 0) {
            targetContainer.innerHTML = '<div class="placeholder-text">Drag tahapan SDLC ke sini</div>';
        }
    }
}

// Validation Logic
function checkStructure() {
    const currentItems = Array.from(targetContainer.querySelectorAll('.draggable-item'));

    if (currentItems.length === 0) {
        alert('Susun tahapan terlebih dahulu!');
        return;
    }

    let isSequenceCorrect = true;
    let hasTraps = false;
    let lastOrder = 0;

    currentItems.forEach(item => {
        const isTrap = item.getAttribute('data-type') === 'trap';

        if (isTrap) {
            item.classList.add('incorrect');
            item.classList.remove('correct');
            hasTraps = true;
        } else {
            const currentOrder = parseInt(item.getAttribute('data-order'));

            // Logic: Must be strictly sequential? Or just relative?
            // "berurutan" -> strictly 1, 2, 3...
            // Let's check relative order AND direct sequence if user puts gap?
            // Requirement says "urutan, hirarki".
            // Since it's a fixed cycle 1-6, let's enforce: 
            // 1. Must be strictly increasing order.
            // 2. Can be incomplete (partial credit) but order must be right.

            if (currentOrder > lastOrder) {
                item.classList.add('correct');
                item.classList.remove('incorrect');
                lastOrder = currentOrder;
            } else {
                item.classList.add('incorrect');
                item.classList.remove('correct');
                isSequenceCorrect = false;
            }
        }
    });

    const totalValidItems = currentItems.filter(i => !i.getAttribute('data-type') || i.getAttribute('data-type') !== 'trap').length;

    if (hasTraps) {
        showModal('Ups, Kurang Tepat! ⚠️', 'Ada langkah yang bukan bagian dari SDLC! Perhatikan item yang berwarna merah.', 'error');
    } else if (!isSequenceCorrect) {
        showModal('Urutan Masih Salah ❌', 'Urutan tahapan SDLC belum benar. Coba ingat-ingat kembali siklusnya.', 'error');
    } else if (totalValidItems < sdlcComponents.length) {
        showModal('Belum Lengkap 🧩', 'Urutan sudah benar, tapi masih ada tahapan yang kurang.', 'error');
    } else {
        // Perfect Score
        triggerWinEffect();
    }
}

function showModal(title, message, type) {
    modalTitle.innerText = title;
    modalMessage.innerText = message;

    resultModal.className = 'modal'; // Reset classes
    resultModal.classList.add(type);

    resultModal.classList.remove('hidden');

    if (type === 'success') {
        closeModalBtn.innerText = "Main Lagi";
        closeModalBtn.onclick = () => {
            resultModal.classList.add('hidden');
            resetGame();
        };
    } else {
        closeModalBtn.innerText = "Tutup";
        closeModalBtn.onclick = () => {
            resultModal.classList.add('hidden');
        };
    }
}

function triggerWinEffect() {
    // Confetti HEBOH!
    var duration = 5 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 100, zIndex: 9999 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function () {
        var timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        var particleCount = 100 * (timeLeft / duration);
        // Shoot from both corners
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    // Shoot from center too
    confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
    });

    audioManager.playSuccessSound();
    showModal('LUAR BIASA! 🎉', 'Selamat! Anda berhasil menyusun siklus SDLC dengan sempurna!', 'success');
}

function resetGame() {
    renderSourceItems();
}

// Start
initGame();
