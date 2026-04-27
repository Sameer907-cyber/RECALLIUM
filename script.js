let joystick = {
    x: 0,
    y: 0,
    btn: 1
};

const ESP_IP = "192.168.1.9";

const socket = new WebSocket(`ws://${ESP_IP}:81/`);

socket.onopen = () => {
    console.log("Connected to ESP 🎮");
};

socket.onmessage = (event) => {
    const data = event.data.trim();

    // If joystick format → "dx,dy,btn"
    if (data.includes(",")) {
        const [dx, dy, btn] = data.split(",");

        joystick.x = Number(dx);
        joystick.y = Number(dy);
        joystick.btn = Number(btn);

        handleJoystick();
    } else {

        handleESPInput(data);
    }
};

let lastInputTime = 0;
const INPUT_DELAY = 80; // ms


// ==========================================
// AUDIO SYNTHESIS & SOUND EFFECTS
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
}

function playTone(frequency, type = 'sine', duration = 0.1, volume = 0.1) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    click: () => playTone(600, 'sine', 0.05, 0.1),
    hover: () => playTone(400, 'sine', 0.02, 0.05),
    success: () => { playTone(400, 'square', 0.1, 0.05); setTimeout(() => playTone(600, 'square', 0.2, 0.05), 100); if (typeof spawnBurst !== 'undefined') spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 50, '0, 255, 102'); },
    error: () => { playTone(150, 'sawtooth', 0.3, 0.1); if (typeof spawnBurst !== 'undefined') spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 30, '255, 0, 60'); },
    flash: () => playTone(800, 'sine', 0.1, 0.05),
    win: () => { playTone(400, 'square', 0.1); setTimeout(() => playTone(500, 'square', 0.1), 100); setTimeout(() => playTone(600, 'square', 0.3), 200); if (typeof spawnBurst !== 'undefined') spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 150, '0, 255, 102'); }
};


// ==========================================
// BACKGROUND PARTICLES CANVAS
// ==========================================
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let warpFactor = 1;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = Math.random() * -0.5 - 0.2;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.isBurst = false;
        this.color = '0, 240, 255';
    }
    update() {
        const theme = document.body.getAttribute('data-theme');
        if (theme === 'sequence') {
            this.y += (this.speedY + 4) * warpFactor;
            this.x += (Math.random() * 0.2 - 0.1);
        } else if (theme === 'guess') {
            this.y += this.speedY * 0.2 * warpFactor;
            this.x += this.speedX * 0.2 * warpFactor;
        } else if (theme === 'home') {
            const speedMult = this.size < 1.5 ? 0.3 : 1.5;
            this.y += this.speedY * speedMult * warpFactor;
            this.x += this.speedX * speedMult * warpFactor;
        } else {
            this.y += this.speedY * warpFactor;
            this.x += this.speedX * warpFactor;
        }

        if (this.isBurst) {
            this.opacity -= 0.02;
            if (this.opacity <= 0) return false;
        } else {
            if (this.y < -10 || this.y > canvas.height + 10 || this.x < -10 || this.x > canvas.width + 10) {
                this.reset();
                if (theme === 'sequence') this.y = -10;
            }
        }
        return true;
    }
    draw() {
        const theme = document.body.getAttribute('data-theme');
        if (theme === 'guess') {
            ctx.filter = 'blur(4px)';
            ctx.fillStyle = `rgba(${this.color}, ${this.opacity * 0.5})`;
            const now = Date.now();


        } if (theme === 'home' && !this.isBurst) {
            ctx.filter = 'none';
            const op = this.size < 1.5 ? this.opacity * 0.3 : this.opacity;
            ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
        } else {
            ctx.filter = 'none';
            ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        }

        ctx.beginPath();
        if (theme === 'sequence' && !this.isBurst) {
            ctx.rect(this.x, this.y, this.size, this.size * 10);
        } else {
            ctx.arc(this.x, this.y, this.size * (theme === 'guess' ? 2 : 1), 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.filter = 'none';
    }
}

for (let i = 0; i < 100; i++) particles.push(new Particle());

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (warpFactor > 1) { warpFactor -= 0.2; }
    if (warpFactor < 1) { warpFactor = 1; }

    const theme = document.body.getAttribute('data-theme');

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p.update()) {
            particles.splice(i, 1);
        } else {
            if (warpFactor > 2) {
                ctx.strokeStyle = `rgba(${p.color}, ${p.opacity})`;
                ctx.lineWidth = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x - p.speedX * warpFactor * 2, p.y - p.speedY * warpFactor * 2);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            } else {
                p.draw();
                if (theme === 'memory' && !p.isBurst) {
                    for (let j = i - 1; j >= 0; j--) {
                        const p2 = particles[j];
                        if (p2.isBurst) continue;
                        const dx = p.x - p2.x;
                        const dy = p.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 100) {
                            ctx.strokeStyle = `rgba(0, 255, 204, ${0.2 * (1 - dist / 100)})`;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

function spawnBurst(x, y, amount = 20, color = '0, 240, 255') {
    for (let i = 0; i < amount; i++) {
        let p = new Particle();
        p.x = x;
        p.y = y;
        p.size = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        p.speedX = Math.cos(angle) * speed;
        p.speedY = Math.sin(angle) * speed;
        p.opacity = 1;
        p.isBurst = true;
        p.color = color;
        particles.push(p);
    }
}


let lastMouseX = window.innerWidth / 2;
let lastMouseY = window.innerHeight / 2;

document.body.addEventListener('mousemove', (e) => {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 50) {
        warpFactor += dist / 100;
        if (warpFactor > 15) warpFactor = 15;
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

document.body.addEventListener('click', (e) => {
    warpFactor = 10;
    spawnBurst(e.clientX, e.clientY, 15, '0, 240, 255');
});

// ==========================================
// SPA NAVIGATION LOGIC
// ==========================================
const views = document.querySelectorAll('.view');
const cards = document.querySelectorAll('.game-card');
const backBtns = document.querySelectorAll('.btn-back');

function navigateTo(targetId) {
    if (document.getElementById(targetId).classList.contains('active')) return;
    sfx.click();

    const glitch = document.getElementById('transition-glitch');
    if (glitch) {
        glitch.classList.remove('active');
        void glitch.offsetWidth; // trigger reflow
        glitch.classList.add('active');
    }

    setTimeout(() => {
        views.forEach(view => view.classList.remove('active'));
        const themeStr = targetId.replace('view-', '');
        document.body.setAttribute('data-theme', themeStr);
    }, 200);

    setTimeout(() => {
        document.getElementById(targetId).classList.add('active');
        if (targetId === 'view-memory') resetMemoryView();
        if (targetId === 'view-guess') initGuessGame();
        if (targetId === 'view-sequence') initSequenceGame();
        if (targetId === 'view-breaker') initBreakerGame();
        if (targetId === 'view-territory') initTerritoryGame();
        if (targetId === 'view-reaction') initReactionGame();
    }, 350);
}

cards.forEach(card => {
    card.addEventListener('mouseenter', sfx.hover);
    card.addEventListener('click', () => navigateTo(card.getAttribute('data-target')));

    // Tilt and Magnetic physics
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = -(y - centerY) / 8;
        const tiltY = (x - centerX) / 8;
        card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.05, 1.05, 1.05)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
});

backBtns.forEach(btn => {
    btn.addEventListener('mouseenter', sfx.hover);
    btn.addEventListener('click', () => navigateTo('view-home'));
});

// Setup global click interactions
document.body.addEventListener('click', () => initAudio(), { once: true });
document.querySelectorAll('button').forEach(b => {
    b.addEventListener('mouseenter', () => { if (b.id !== 'btn-memory-submit' && b.id !== 'btn-guess-submit' && b.id !== 'btn-sequence-submit') sfx.hover(); });
});

function applyErrorShake(element) {
    element.classList.remove('shake');
    void element.offsetWidth; // trigger reflow
    element.classList.add('shake');
    sfx.error();
}

// ==========================================
// GAME 1: MEMORY GAME
// ==========================================
const modesView = document.getElementById('memory-modes');
const playView = document.getElementById('memory-play');
const flashText = document.getElementById('memory-flash-text');
const memInput = document.getElementById('memory-input');
const memStartBtn = document.getElementById('btn-memory-start');
const memResetBtn = document.getElementById('btn-memory-reset');
const memLevelBadge = document.getElementById('memory-level');
const memTurnBadge = document.getElementById('memory-turn-indicator');
const memDisplayBox = document.getElementById('memory-display');

let memMode = ''; // 'pvc' or 'pvp'
let memSequence = [];
let memPlayerTurn = 1;

document.getElementById('btn-pvc').addEventListener('click', () => { memMode = 'pvc'; startMemorySetup(); });
document.getElementById('btn-pvp').addEventListener('click', () => { memMode = 'pvp'; startMemorySetup(); });

function resetMemoryView() {
    modesView.classList.remove('hidden');
    modesView.classList.add('active');
    playView.classList.remove('active');
    playView.classList.add('hidden');
    memSequence = [];
}

function startMemorySetup() {
    sfx.click();
    modesView.classList.remove('active');
    setTimeout(() => {
        modesView.classList.add('hidden');
        playView.classList.remove('hidden');
        playView.classList.add('active');

        // Setup initial UI
        memSequence = [];
        memPlayerTurn = 1;
        memInput.value = '';
        memInput.disabled = true;
        flashText.textContent = '--';
        memStartBtn.classList.remove('hidden');
        memResetBtn.classList.add('hidden');
        memDisplayBox.className = 'display-box';

        if (memMode === 'pvc') {
            memLevelBadge.textContent = 'Level 1';
            memLevelBadge.className = 'pill pill-cyan';
            memTurnBadge.classList.add('hidden');
            memStartBtn.textContent = 'Start First Round';
        } else {
            memLevelBadge.textContent = 'Versus Mode';
            memLevelBadge.className = 'pill pill-green';
            memTurnBadge.classList.remove('hidden');
            updatePvPTurnUI();
            memStartBtn.textContent = 'Player 1, Start!';
            flashText.textContent = 'P1 enters a number.';
        }
    }, 300);
}

function updatePvPTurnUI() {
    memTurnBadge.textContent = `Player ${memPlayerTurn}'s Turn`;
    memTurnBadge.className = memPlayerTurn === 1 ? 'pill pill-magenta' : 'pill pill-cyan';
}

memStartBtn.addEventListener('click', () => {
    sfx.click();
    memStartBtn.classList.add('hidden');
    memResetBtn.classList.remove('hidden');

    if (memMode === 'pvc') {
        nextPvCRound();
    } else {
        // PvP logic
        flashText.textContent = 'Input Secret Number...';
        memInput.type = 'password';
        memInput.disabled = false;
        memInput.focus();
    }
});

memResetBtn.addEventListener('click', () => { startMemorySetup(); });

// PvC Logic
async function nextPvCRound() {
    memInput.disabled = true;
    memInput.value = '';
    const newNum = Math.floor(Math.random() * 10);
    memSequence.push(newNum);
    memLevelBadge.textContent = `Level ${memSequence.length}`;

    flashText.textContent = 'Watch...';
    await new Promise(r => setTimeout(r, 1000));

    flashText.textContent = newNum;
    flashText.classList.add('flash-green');
    sfx.flash();

    setTimeout(() => {
        flashText.classList.remove('flash-green');
        flashText.textContent = 'Enter sequence';
        memInput.disabled = false;
        memInput.focus();
    }, 1500);
}

memInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = memInput.value.trim();
        if (!val) return;

        if (memMode === 'pvc') {
            const strSeq = memSequence.join('');
            if (val === strSeq) {
                sfx.success();
                memDisplayBox.classList.add('glow-green-border');
                setTimeout(() => memDisplayBox.classList.remove('glow-green-border'), 500);
                nextPvCRound();
            } else {
                applyErrorShake(playView);
                memDisplayBox.classList.add('glow-red-border');
                flashText.textContent = 'GAME OVER';
                flashText.style.color = 'var(--neon-magenta)';
                memInput.disabled = true;
            }
        } else if (memMode === 'pvp') {
            // PvP Logic Flow
            // If it's turn N, the player must enter N digits matching the sequence, THEN add 1 more digit.
            // Actually, a simpler flow: Type the sequence so far + 1 new number
            if (memSequence.length === 0) {
                // First turn ever, player 1 enters 1 digit (or multiple, wait let's just accept what they wrote as string)
                memSequence = val.split('');
                sfx.success();
                switchPvPTurn();
            } else {
                // Must match sequence + 1 char
                const expectedPrefix = memSequence.join('');
                if (val.length === expectedPrefix.length + 1 && val.startsWith(expectedPrefix)) {
                    sfx.success();
                    memSequence = val.split(''); // Update sequence
                    memDisplayBox.classList.add('glow-green-border');
                    setTimeout(() => memDisplayBox.classList.remove('glow-green-border'), 500);
                    switchPvPTurn();
                } else {
                    applyErrorShake(playView);
                    memDisplayBox.classList.add('glow-red-border');
                    flashText.textContent = `P${memPlayerTurn} MISTAKE! P${memPlayerTurn === 1 ? 2 : 1} WINS!`;
                    flashText.style.color = 'var(--neon-magenta)';
                    memInput.type = 'text'; // Show what they wrote
                    memInput.disabled = true;
                }
            }
        }
    }
});

function switchPvPTurn() {
    memInput.value = '';
    memInput.disabled = true;

    let prevPlayer = memPlayerTurn;

    // Switch player
    memPlayerTurn = memPlayerTurn === 1 ? 2 : 1;
    updatePvPTurnUI();

    let sequenceStr = memSequence.join('');

    // ✅ STEP 1: SHOW previous player's sequence
    flashText.textContent = `Player ${prevPlayer} entered: ${sequenceStr}`;
    flashText.style.color = 'var(--neon-green)';
    sfx.success();

    // ✅ STEP 2: WAIT 1.5 sec then HIDE
    setTimeout(() => {
        flashText.textContent = '*'.repeat(sequenceStr.length);

        // ✅ STEP 3: PROMPT NEXT PLAYER
        setTimeout(() => {
            flashText.textContent = `Player ${memPlayerTurn}, repeat + add 1`;
            flashText.style.color = '#fff';

            memInput.disabled = false;
            memInput.focus();
        }, 1000);

    }, 900);
}


// ==========================================
// GAME 2: GUESS THE NUMBER
// ==========================================
const guessInput = document.getElementById('guess-input');
const guessBtn = document.getElementById('btn-guess-submit');
const guessReset = document.getElementById('btn-guess-reset');
const guessFeedback = document.getElementById('guess-feedback-text');
const guessAttemptsBadge = document.getElementById('guess-attempts');
const guessFeedbackBox = document.getElementById('guess-feedback');

let guessTarget = 0;
let guessAttempts = 0;
let guessActive = false;

function initGuessGame() {
    guessTarget = Math.floor(Math.random() * 100) + 1;
    guessAttempts = 0;
    guessActive = true;
    guessAttemptsBadge.textContent = `Attempts: 0`;
    guessFeedback.textContent = "Number 1-100 locked in.";
    guessFeedback.style.color = '#fff';
    guessInput.value = '';
    guessInput.disabled = false;
    guessFeedbackBox.className = 'feedback-box display-box';
}

guessReset.addEventListener('click', () => { sfx.click(); initGuessGame(); });

function handleGuess() {
    if (!guessActive) return;
    const val = parseInt(guessInput.value);
    if (isNaN(val) || val < 1 || val > 100) {
        applyErrorShake(guessInput);
        return;
    }

    guessAttempts++;
    guessAttemptsBadge.textContent = `Attempts: ${guessAttempts}`;

    if (val === guessTarget) {
        sfx.win();
        guessActive = false;
        guessFeedback.textContent = `Correct! It was ${guessTarget}`;
        guessFeedback.style.color = 'var(--neon-green)';
        guessFeedbackBox.classList.add('glow-green-border');
        guessInput.disabled = true;
    } else if (val < guessTarget) {
        sfx.error();
        guessFeedback.textContent = `${val} is TOO LOW`;
        guessFeedback.style.color = 'var(--neon-cyan)';
    } else {
        sfx.error();
        guessFeedback.textContent = `${val} is TOO HIGH`;
        guessFeedback.style.color = 'var(--neon-magenta)';
    }
    guessInput.value = '';
    guessInput.focus();
}

guessBtn.addEventListener('click', handleGuess);
guessInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGuess(); });


// ==========================================
// GAME 3: SEQUENCE RECALL
// ==========================================
const seqStartBtn = document.getElementById('btn-sequence-start');
const seqInputArea = document.getElementById('sequence-input-area');
const seqInput = document.getElementById('sequence-input');
const seqSubmitBtn = document.getElementById('btn-sequence-submit');
const seqDisplayBox = document.getElementById('sequence-display');
const seqFlashText = document.getElementById('sequence-flash-text');
const seqScoreBadge = document.getElementById('sequence-score');
const seqTimerBadge = document.getElementById('sequence-timer');

let seqCurrent = '';
let seqScore = 0;
let seqLength = 3;
let timerInterval;

function initSequenceGame() {
    seqScore = 0;
    seqLength = 4;
    seqScoreBadge.textContent = `Score: 0`;
    seqTimerBadge.textContent = `Ready`;
    seqStartBtn.classList.remove('hidden');
    seqInputArea.classList.add('hidden');
    seqFlashText.textContent = "Get Ready!";
    seqDisplayBox.className = 'display-box';
}

seqStartBtn.addEventListener('click', () => {
    sfx.click();
    if (seqStartBtn.textContent === 'Try Again (Reset Score)') {
        seqScore = 0;
        seqLength = 4;
        seqScoreBadge.textContent = `Score: ${seqScore}`;
    }
    seqStartBtn.classList.add('hidden');
    startSequenceRound();
});

function startSequenceRound() {
    // Generate sequence using characters A-D
    const chars = 'ABCD0123456789';
    seqCurrent = '';
    while (seqCurrent.length < seqLength) {
        seqCurrent += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    seqInputArea.classList.add('hidden');
    seqFlashText.textContent = "3...";
    seqTimerBadge.textContent = "--";

    setTimeout(() => { seqFlashText.textContent = "2..."; sfx.click(); }, 1000);
    setTimeout(() => { seqFlashText.textContent = "1..."; sfx.click(); }, 2000);

    setTimeout(() => {
        sfx.flash();
        seqFlashText.textContent = seqCurrent;
        seqFlashText.classList.add('flash-green');

        setTimeout(() => {
            seqFlashText.classList.remove('flash-green');
            seqFlashText.textContent = '******';
            seqInputArea.classList.remove('hidden');
            seqInput.value = '';
            seqInput.focus();
            startSeqTimer();
        }, 3000); // give 3 seconds to look

    }, 3000);
}

function startSeqTimer() {
    let time = 10.0;
    seqTimerBadge.textContent = `${time.toFixed(1)}s`;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        time -= 0.1;
        if (time <= 0) {
            clearInterval(timerInterval);
            seqTimerBadge.textContent = `0.0s`;
            verifySequence(true); // timed out
        } else {
            seqTimerBadge.textContent = `${time.toFixed(1)}s`;
        }
    }, 100);
}

function verifySequence(timedOut = false) {
    clearInterval(timerInterval);
    const val = seqInput.value.trim().toUpperCase();

    if (timedOut || val !== seqCurrent) {
        sfx.error();
        applyErrorShake(seqInputArea);
        seqDisplayBox.classList.add('glow-red-border');
        seqFlashText.textContent = `Wrong! Was: ${seqCurrent}`;
        seqStartBtn.classList.remove('hidden');
        seqStartBtn.textContent = 'Try Again (Reset Score)';
    } else {
        sfx.win();
        seqDisplayBox.classList.add('glow-green-border');
        setTimeout(() => seqDisplayBox.classList.remove('glow-green-border'), 800);
        seqScore++;
        seqLength++;
        seqScoreBadge.textContent = `Score: ${seqScore}`;
        seqStartBtn.classList.remove('hidden');
        seqStartBtn.textContent = 'Next Level';
    }
    seqInputArea.classList.add('hidden');
}

seqSubmitBtn.addEventListener('click', () => verifySequence(false));
seqInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifySequence(false); });

// ==========================================
// BOOT SEQUENCE (TYPING MATRIX)
// ==========================================
const scrambleText = (el, originalText) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let iter = 0;
    const interval = setInterval(() => {
        el.innerText = originalText.split('').map((letter, index) => {
            if (letter === ' ') return ' ';
            if (index < iter) return letter;
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        if (iter >= originalText.length) { clearInterval(interval); el.innerText = originalText; }
        iter += 0.3;
    }, 30);
};

const mainTitle = document.querySelector('#view-home h1');
if (mainTitle) scrambleText(mainTitle, '⚡ RECALLIUM');


window.onload = () => {
    window.scrollTo(0, 0);
};



const trailCanvas = document.getElementById('trail-canvas');
const tctx = trailCanvas.getContext('2d');

trailCanvas.width = window.innerWidth;
trailCanvas.height = window.innerHeight;

let trail = [];

window.addEventListener('resize', () => {
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
});

document.addEventListener('mousemove', (e) => {
    trail.push({
        x: e.clientX,
        y: e.clientY,
        life: 1
    });
});

function animateTrail() {
    tctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    for (let i = 0; i < trail.length; i++) {
        let p = trail[i];

        tctx.beginPath();
        tctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        tctx.fillStyle = `rgba(0,255,255,${p.life})`;
        tctx.shadowBlur = 20;
        tctx.shadowColor = '#00f0ff';
        tctx.fill();

        p.life -= 0.03;
    }

    trail = trail.filter(p => p.life > 0);

    requestAnimationFrame(animateTrail);
}
animateTrail();


// CLOCK
setInterval(() => {
    const now = new Date();
    document.getElementById('hud-time').textContent =
        now.toLocaleTimeString();
}, 1000);

// FPS COUNTER
let lastFrame = performance.now();
let fps = 0;

function updateFPS() {
    let now = performance.now();
    fps = Math.round(1000 / (now - lastFrame));
    lastFrame = now;

    const fpsEl = document.getElementById('fps');
    if (fpsEl) fpsEl.textContent = fps;

    requestAnimationFrame(updateFPS);
}
updateFPS();







// ==========================================
// GAME 4: BALL BREAKER
// ==========================================
const breakerCanvas = document.getElementById('breaker-canvas');
const bctx = breakerCanvas ? breakerCanvas.getContext('2d') : null;
let breakerActive = false;
let breakerAnimId;
let paddle = { x: 250, y: 380, w: 100, h: 10 };
let ball = { x: 300, y: 370, r: 5, dx: 4, dy: -4 };
let bricks = [];
let breakerScore = 0;
let breakerLives = 3;
let breakerKeys = {};

function initBreakerGame() {
    breakerActive = false;
    cancelAnimationFrame(breakerAnimId);
    breakerScore = 0;
    breakerLives = 3;
    document.getElementById('breaker-score').textContent = 'Score: 0';
    document.getElementById('breaker-lives').textContent = 'Lives: 3';
    document.getElementById('breaker-overlay').classList.remove('hidden');
    document.getElementById('breaker-msg').textContent = 'Press Start';
    initBricks();
    resetBall();
    drawBreaker();
}

function initBricks() {
    bricks = [];
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 8; c++) {
            bricks.push({ x: c * 70 + 25, y: r * 25 + 30, w: 60, h: 15, active: true, color: `hsl(${r * 40}, 100%, 50%)` });
        }
    }
}

function resetBall() {
    paddle.x = 250;
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - 10;
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;
}

const btnBreakerStart = document.getElementById('btn-breaker-start');
if (btnBreakerStart) {
    btnBreakerStart.addEventListener('click', () => {
        sfx.click();
        if (breakerLives <= 0 || bricks.every(b => !b.active)) initBreakerGame();
        document.getElementById('breaker-overlay').classList.add('hidden');
        if (!breakerActive) {
            breakerActive = true;
            updateBreaker();
        }
    });
}

function drawBreaker() {
    if (!bctx) return;
    bctx.clearRect(0, 0, 600, 400);
    // Draw paddle
    bctx.fillStyle = '#00f0ff';
    bctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    // Draw ball
    bctx.beginPath();
    bctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    bctx.fillStyle = '#ff003c';
    bctx.fill();
    // Draw bricks
    bricks.forEach(b => {
        if (b.active) {
            bctx.fillStyle = b.color;
            bctx.fillRect(b.x, b.y, b.w, b.h);
        }
    });
}

function updateBreaker() {
    if (!breakerActive) return;

    // Paddle movement
    if (breakerKeys['ArrowLeft'] || breakerKeys['a']) paddle.x -= 7;
    if (breakerKeys['ArrowRight'] || breakerKeys['d']) paddle.x += 7;
    if (joystick.x === -1) paddle.x -= 7;
    if (joystick.x === 1) paddle.x += 7;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.w > 600) paddle.x = 600 - paddle.w;

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision
    if (ball.x - ball.r < 0 || ball.x + ball.r > 600) ball.dx *= -1;
    if (ball.y - ball.r < 0) ball.dy *= -1;

    // Paddle collision
    if (ball.y + ball.r >= paddle.y && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
        ball.dy = -Math.abs(ball.dy);
        ball.dx = ((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)) * 5;
        sfx.hover();
    }

    // Brick collision
    bricks.forEach(b => {
        if (b.active) {
            if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
                b.active = false;
                ball.dy *= -1;
                breakerScore += 10;
                document.getElementById('breaker-score').textContent = `Score: ${breakerScore}`;
                sfx.click();
            }
        }
    });

    // Floor collision
    if (ball.y + ball.r > 400) {
        breakerLives--;
        document.getElementById('breaker-lives').textContent = `Lives: ${breakerLives}`;
        sfx.error();
        if (breakerLives <= 0) {
            breakerActive = false;
            document.getElementById('breaker-overlay').classList.remove('hidden');
            document.getElementById('breaker-msg').textContent = 'GAME OVER';
        } else {
            resetBall();
        }
    }

    // Win check
    if (bricks.every(b => !b.active)) {
        breakerActive = false;
        document.getElementById('breaker-overlay').classList.remove('hidden');
        document.getElementById('breaker-msg').textContent = 'YOU WIN!';
        sfx.win();
    }

    drawBreaker();
    if (breakerActive) breakerAnimId = requestAnimationFrame(updateBreaker);
}

// ==========================================
// GAME 5: TERRITORY RUSH
// ==========================================
const terrCanvas = document.getElementById('territory-canvas');
const terrCtx = terrCanvas ? terrCanvas.getContext('2d') : null;
const gridSize = 20; // 30x20 grid
let terrActive = false;
let terrAnimId;
let grid = [];
let playerPos = { x: 5, y: 10 };
let aiPos = { x: 24, y: 10 };
let terrKeys = {};
let lastMoveTime = 0;
let aiLastMoveTime = 0;

function initTerritoryGame() {
    terrActive = false;
    cancelAnimationFrame(terrAnimId);
    grid = [];
    for (let i = 0; i < 30; i++) {
        grid[i] = [];
        for (let j = 0; j < 20; j++) grid[i][j] = 0;
    }
    playerPos = { x: 5, y: 10 };
    aiPos = { x: 24, y: 10 };
    grid[playerPos.x][playerPos.y] = 1;
    grid[aiPos.x][aiPos.y] = 2;
    document.getElementById('territory-overlay').classList.remove('hidden');
    document.getElementById('territory-msg').textContent = 'Press Start';
    updateTerritoryScore();
    drawTerritory();
}

function updateTerritoryScore() {
    let p = 0, a = 0;
    for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
            if (grid[i][j] === 1) p++;
            if (grid[i][j] === 2) a++;
        }
    }
    document.getElementById('territory-score-player').textContent = `Player: ${p}`;
    document.getElementById('territory-score-ai').textContent = `AI: ${a}`;
    return { p, a };
}

const btnTerritoryStart = document.getElementById('btn-territory-start');
if (btnTerritoryStart) {
    btnTerritoryStart.addEventListener('click', () => {
        sfx.click();
        initTerritoryGame();
        document.getElementById('territory-overlay').classList.add('hidden');
        terrActive = true;
        lastMoveTime = Date.now();
        aiLastMoveTime = Date.now();
        updateTerritory();
    });
}

function drawTerritory() {
    if (!terrCtx) return;
    terrCtx.clearRect(0, 0, 600, 400);
    for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
            if (grid[i][j] === 1) terrCtx.fillStyle = '#00f0ff'; // Player
            else if (grid[i][j] === 2) terrCtx.fillStyle = '#ff003c'; // AI
            else terrCtx.fillStyle = 'rgba(255,255,255,0.05)';
            terrCtx.fillRect(i * gridSize, j * gridSize, gridSize - 1, gridSize - 1);
        }
    }
    // Highlight heads
    terrCtx.fillStyle = '#fff';
    terrCtx.fillRect(playerPos.x * gridSize + 4, playerPos.y * gridSize + 4, 12, 12);
    terrCtx.fillRect(aiPos.x * gridSize + 4, aiPos.y * gridSize + 4, 12, 12);
}

function updateTerritory() {
    if (!terrActive) return;

    let now = Date.now();

    // Player move (debounced 80ms)
    if (now - lastMoveTime > 80) {
        let moved = false;
        if ((terrKeys['ArrowUp'] || terrKeys['w'] || terrKeys['2']) && playerPos.y > 0) { playerPos.y--; moved = true; }
        else if ((terrKeys['ArrowDown'] || terrKeys['s'] || terrKeys['8']) && playerPos.y < 19) { playerPos.y++; moved = true; }
        else if ((terrKeys['ArrowLeft'] || terrKeys['a'] || terrKeys['4']) && playerPos.x > 0) { playerPos.x--; moved = true; }
        else if ((terrKeys['ArrowRight'] || terrKeys['d'] || terrKeys['6']) && playerPos.x < 29) { playerPos.x++; moved = true; }

        if (moved) {
            grid[playerPos.x][playerPos.y] = 1;
            lastMoveTime = now;
            sfx.hover();
        }
    }

    // AI move (random every 100ms)
    if (now - aiLastMoveTime > 100) {
        let dirs = [];
        if (aiPos.x > 0) dirs.push({ dx: -1, dy: 0 });
        if (aiPos.x < 29) dirs.push({ dx: 1, dy: 0 });
        if (aiPos.y > 0) dirs.push({ dx: 0, dy: -1 });
        if (aiPos.y < 19) dirs.push({ dx: 0, dy: 1 });

        // Seek unowned territory if possible
        let validDirs = dirs.filter(d => grid[aiPos.x + d.dx][aiPos.y + d.dy] === 0);
        if (validDirs.length === 0) validDirs = dirs; // fallback

        let move = validDirs[Math.floor(Math.random() * validDirs.length)];
        aiPos.x += move.dx;
        aiPos.y += move.dy;
        grid[aiPos.x][aiPos.y] = 2;
        aiLastMoveTime = now;
    }

    let scores = updateTerritoryScore();
    if (scores.p + scores.a === 600) {
        terrActive = false;
        document.getElementById('territory-overlay').classList.remove('hidden');
        if (scores.p > scores.a) {
            document.getElementById('territory-msg').textContent = 'YOU WIN!';
            sfx.win();
        } else {
            document.getElementById('territory-msg').textContent = 'AI WINS!';
            sfx.error();
        }
    }

    drawTerritory();
    if (terrActive) terrAnimId = requestAnimationFrame(updateTerritory);
}

// ==========================================
// GAME 6: REACTION DUEL
// ==========================================
let reactState = 'idle'; // idle, wait, ready
let reactTimeout;
let reactStartTime;
let reactBest = Infinity;

function initReactionGame() {
    reactState = 'idle';
    clearTimeout(reactTimeout);
    document.getElementById('reaction-flash-text').textContent = 'Click/Press Space to Start';
    document.getElementById('reaction-flash-text').className = 'number-flash';
    document.getElementById('reaction-display').classList.remove('glow-green-border', 'glow-red-border');
}

const btnReactionReset = document.getElementById('btn-reaction-reset');
if (btnReactionReset) {
    btnReactionReset.addEventListener('click', () => {
        sfx.click();
        reactBest = Infinity;
        document.getElementById('reaction-best').textContent = `Best: -- ms`;
        initReactionGame();
    });
}

function handleReactionAction() {
    if (reactState === 'idle') {
        sfx.click();
        reactState = 'wait';
        document.getElementById('reaction-flash-text').textContent = 'Wait for Green...';
        document.getElementById('reaction-display').classList.remove('glow-green-border', 'glow-red-border');
        document.getElementById('reaction-display').classList.add('glow-red-border');

        // Random time 2-5 seconds
        let delay = 2000 + Math.random() * 3000;

        // 20% chance for a fake signal
        if (Math.random() < 0.2) {
            reactTimeout = setTimeout(() => {
                document.getElementById('reaction-flash-text').textContent = 'FAKE!';
                document.getElementById('reaction-flash-text').classList.add('flash-green'); // actually fake
                sfx.hover();
                setTimeout(() => {
                    document.getElementById('reaction-flash-text').classList.remove('flash-green');
                    document.getElementById('reaction-flash-text').textContent = 'Wait...';
                }, 400);

                reactTimeout = setTimeout(triggerReady, delay - 1000);
            }, delay - 1000);
        } else {
            reactTimeout = setTimeout(triggerReady, delay);
        }
    } else if (reactState === 'wait') {
        // Too early
        clearTimeout(reactTimeout);
        sfx.error();
        applyErrorShake(document.getElementById('reaction-display'));
        document.getElementById('reaction-flash-text').textContent = 'Too Early! Click to Try Again';
        reactState = 'idle';
    } else if (reactState === 'ready') {
        // Reacted
        let time = Date.now() - reactStartTime;
        sfx.win();
        document.getElementById('reaction-flash-text').textContent = `${time} ms`;
        document.getElementById('reaction-current').textContent = `Current: ${time} ms`;
        if (time < reactBest) {
            reactBest = time;
            document.getElementById('reaction-best').textContent = `Best: ${time} ms`;
        }
        reactState = 'idle';
    }
}

function triggerReady() {
    reactState = 'ready';
    reactStartTime = Date.now();
    sfx.flash();
    document.getElementById('reaction-display').classList.remove('glow-red-border');
    document.getElementById('reaction-display').classList.add('glow-green-border');
    document.getElementById('reaction-flash-text').textContent = 'NOW!';
    document.getElementById('reaction-flash-text').classList.add('flash-green');
    setTimeout(() => {
        document.getElementById('reaction-flash-text').classList.remove('flash-green');
    }, 500);
}

const reactionDisplay = document.getElementById('reaction-display');
if (reactionDisplay) {
    reactionDisplay.addEventListener('click', handleReactionAction);
}

// Global Event Listener for keydown/keyup for new games
window.addEventListener('keydown', (e) => {
    breakerKeys[e.key] = true;
    terrKeys[e.key] = true;

    // Spacebar mapping for reaction
    if (e.code === 'Space' && document.body.getAttribute('data-theme') === 'reaction') {
        e.preventDefault(); // prevent scroll
        handleReactionAction();
    }
});
window.addEventListener('keyup', (e) => {
    breakerKeys[e.key] = false;
    terrKeys[e.key] = false;
});


function handleESPInput(key) {

    const theme = document.body.getAttribute('data-theme');

    // 🔴 GLOBAL CONTROLS
    if (key === '#') {
        // SUBMIT based on active game
        if (theme === 'memory') {
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            memInput.dispatchEvent(event);
        }

        if (theme === 'guess') {
            handleGuess();
        }

        if (theme === 'sequence') {
            verifySequence(false);
        }

        if (theme === 'reaction') {
            handleReactionAction();
        }

        return; // ❗ STOP further execution
    }

    // OPTIONAL: CLEAR INPUT
    if (key === '*') {
        const theme = document.body.getAttribute('data-theme');

        if (theme === 'memory' && !memInput.disabled) {
            memInput.value = memInput.value.slice(0, -1);
        }

        if (theme === 'guess') {
            guessInput.value = guessInput.value.slice(0, -1);
        }

        if (theme === 'sequence') {
            seqInput.value = seqInput.value.slice(0, -1);
        }

        return;
    }

    // 🧠 MEMORY GAME
    if (theme === 'memory') {
        if ((memMode === 'pvc' || memMode === 'pvp') && !memInput.disabled) {
            memInput.value += key;
        }
    }

    // 🎯 GUESS GAME
    if (theme === 'guess') {
        guessInput.value += key;
    }

    // 🔢 SEQUENCE GAME
    if (theme === 'sequence') {
        seqInput.value += key;
    }

    // ESP mapping for Breaker & Territory
    if (theme === 'breaker') {
        if (key === '4') breakerKeys['ArrowLeft'] = true;
        if (key === '6') breakerKeys['ArrowRight'] = true;
        setTimeout(() => {
            breakerKeys['ArrowLeft'] = false;
            breakerKeys['ArrowRight'] = false;
        }, 150);
    }

    if (theme === 'territory') {
        if (key === '4') terrKeys['ArrowLeft'] = true;
        if (key === '6') terrKeys['ArrowRight'] = true;
        if (key === '2') terrKeys['ArrowUp'] = true;
        if (key === '8') terrKeys['ArrowDown'] = true;
        setTimeout(() => {
            terrKeys['ArrowLeft'] = false;
            terrKeys['ArrowRight'] = false;
            terrKeys['ArrowUp'] = false;
            terrKeys['ArrowDown'] = false;
        }, 150);
    }
}


function handleJoystick() {
    const theme = document.body.getAttribute('data-theme');

    // 🎮 BUTTON → same as #
    if (joystick.btn === 0) {
        handleESPInput('#');
    }

    // 🎮 BALL BREAKER
    if (theme === 'breaker') {
        if (joystick.x === -1) paddle.x -= 7;
        if (joystick.x === 1) paddle.x += 7;
    }

    // 🎮 TERRITORY
    if (theme === 'territory') {
        if (joystick.x === -1) terrKeys['ArrowLeft'] = true;
        if (joystick.x === 1) terrKeys['ArrowRight'] = true;
        if (joystick.y === -1) terrKeys['ArrowUp'] = true;
        if (joystick.y === 1) terrKeys['ArrowDown'] = true;

        setTimeout(() => {
            terrKeys['ArrowLeft'] = false;
            terrKeys['ArrowRight'] = false;
            terrKeys['ArrowUp'] = false;
            terrKeys['ArrowDown'] = false;
        }, 100);
    }

    // 🎮 REACTION
    if (theme === 'reaction' && joystick.btn === 0) {
        handleReactionAction();
    }
}
