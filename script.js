const state = {
    waiting: true,
    playing: false,
    cueStarted: false,
    gameOver: false,
    cueStartTime: 0
};

const UI = {
    status: document.getElementById('status-text'),
    sub: document.getElementById('sub-text'),
    ring: document.getElementById('ring'),
    player: document.getElementById('player')
};

const CONFIG = {
    FALL_TIME: 3300, // 3.3s
    SUCCESS_WINDOW_START: 3000,
    SUCCESS_WINDOW_END: 3300
};

let gameTimeout;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playCueSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 3.3); // Rising pitch

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 3.0);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 3.3);
}

function playLossSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function playWinSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

function startGame() {
    if (state.playing) return;
    initAudio();

    // Reset state
    state.playing = true;
    state.waiting = false;
    state.gameOver = false;
    state.cueStarted = false;

    // Reset Visuals
    UI.ring.classList.remove('falling');
    UI.ring.classList.remove('shaking');
    UI.player.classList.remove('jump-anim');
    UI.ring.style.opacity = '1';
    UI.status.innerText = "待機中...";
    UI.sub.innerText = "音をよく聞いて";

    // Random Start Delay (1-4s)
    const delay = 1000 + Math.random() * 3000;

    setTimeout(() => {
        if (!state.playing) return;
        startCue();
    }, delay);
}

function startCue() {
    state.cueStarted = true;
    state.cueStartTime = performance.now();
    playCueSound();
    UI.ring.classList.add('shaking');
    UI.status.innerText = "準備はいい？";

    // Schedule Fall
    gameTimeout = setTimeout(() => {
        if (state.playing) {
            failGame("時間切れ！落ちてしまいました。");
        }
    }, CONFIG.FALL_TIME);
}

function handleJump() {
    if (!state.playing) {
        startGame();
        return;
    }

    if (!state.cueStarted) {
        // Jamping before sound starts? Maybe ignore or punish?
        // Let's ignore for now to keep it simple, or punish "False Start".
        failGame("フライング！早すぎます。");
        return;
    }

    const now = performance.now();
    const delta = now - state.cueStartTime;
    const timeSec = (delta / 1000).toFixed(3); // e.g. "3.123"

    if (delta < CONFIG.SUCCESS_WINDOW_START) {
        failGame(`早すぎ！3.3秒待って (${timeSec}秒)`);
    } else if (delta < CONFIG.FALL_TIME) {
        winGame(timeSec);
    } else {
        // Likely already handled by timeout, but just in case
        failGame(`遅すぎ！ (${timeSec}秒)`);
    }
}

function failGame(reason) {
    if (state.gameOver) return;
    state.playing = false;
    state.gameOver = true;
    state.waiting = true;
    clearTimeout(gameTimeout);

    playLossSound();
    UI.ring.classList.remove('shaking');
    UI.ring.classList.add('falling'); // Physical fall
    UI.status.innerText = reason;
    UI.sub.innerText = "スペースキーでリトライ";
}

function winGame(timeSec) {
    if (state.gameOver) return;
    state.playing = false;
    state.gameOver = true;
    state.waiting = true;
    clearTimeout(gameTimeout);

    playWinSound();
    UI.ring.classList.remove('shaking');
    UI.player.classList.add('jump-anim');

    // Ring falls shortly after jump
    setTimeout(() => {
        UI.ring.classList.add('falling');
    }, 200);

    UI.status.innerText = `成功！ナイスジャンプ！ (${timeSec}秒)`;
    UI.sub.innerText = "スペースキーでもう一度";
}

// Input
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        handleJump();
    }
});

document.addEventListener('mousedown', () => {
    handleJump();
});
