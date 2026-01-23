class AudioManager {
    constructor() {
        this.bgm = new Audio('Sound BG 1.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.5;

        this.winSound = new Audio('Sound Yay.mp3');
        this.winSound.volume = 1.0;

        this.clickSound = null; // Optional, or remove if not needed. kept for compatibility if called.

        this.isMuted = false;
        this.isPlaying = false;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.bgm.muted = this.isMuted;
        this.winSound.muted = this.isMuted;

        // If unmuted and supposed to be playing, ensure it's playing
        if (!this.isMuted && this.isPlaying) {
            this.bgm.play().catch(e => console.log("Audio play blocked:", e));
        }

        return this.isMuted;
    }

    startBGM() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        if (!this.isMuted) {
            this.bgm.play().catch(e => console.error("BGM Autoplay prevented:", e));
        }
    }

    playSuccessSound() {
        if (!this.isMuted) {
            // Stop BGM momentarily or just overlay? Usually overlay is fine.
            // Let's reset time to 0 to replay if already played
            this.winSound.currentTime = 0;
            this.winSound.play().catch(e => console.error("Win Sound play prevented:", e));
        }
    }

    // Keeping this empty or basic to avoid error if game-logic calls it
    playClickSound() {
        // No file provided for click, so we can ignore or use a very short synthesized beep if we really wanted, 
        // but user only asked for BG and Win files. Removing synthesized click to keep it clean.
    }
}

const audioManager = new AudioManager();
