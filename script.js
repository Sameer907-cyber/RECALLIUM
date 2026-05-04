let joystick = {
    x: 0,
    y: 0,
    btn: 1,
    btnLastState: false,
    coreLastInput: null
};

const ESP_IP = "10.54.228.140";

const socket = new WebSocket(`ws://${ESP_IP}:81/`);

socket.onopen = () => {
    console.log("Connected to ESP 🎮");
};

function normalizeDirection(dir) {
    const map = {
        "UP": "LEFT",
        "DOWN": "RIGHT",
        "LEFT": "DOWN",
        "RIGHT": "UP"
    };
    return map[dir] || dir;
}

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
        let key = normalizeDirection(data);
        console.log("RAW:", data, "MAPPED:", key);
        handleESPInput(key);
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
        if (targetId === 'view-dodge') initDodgeGame();
        if (targetId === 'view-sequence') initSequenceGame();
        if (targetId === 'view-breaker') initBreakerGame();
        if (targetId === 'view-territory') initTerritoryGame();
        if (targetId === 'view-pressure') initPressureGame();
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
// GAME 2: NEON SKY DODGE
// ==========================================
const dodgeCanvas = document.getElementById('dodge-canvas');
const dodgeCtx = dodgeCanvas ? dodgeCanvas.getContext('2d') : null;
const dodgeScoreBadge = document.getElementById('dodge-score');
const dodgeLivesBadge = document.getElementById('dodge-lives');
const dodgeSpeedBadge = document.getElementById('dodge-speed');
const dodgeOverlay = document.getElementById('dodge-overlay');
const dodgeMsg = document.getElementById('dodge-msg');

let dodgeState = 'idle'; // idle, running, paused, gameover
let dodgeScore = 0;
let dodgeLives = 3;
let dodgeSpeedLevel = 1;
let dodgeFrames = 0;
let dodgeAnimFrame = null;

let player = { x: 300, y: 350, w: 20, h: 20, vx: 0, vy: 0, speed: 5, invincibility: 0, boost: 1 };
let dodgeObstacles = [];
let dodgeParticles = [];
let dodgePowerups = [];

// Keyboard support
let dodgeKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
    if (document.body.getAttribute('data-theme') !== 'dodge') return;
    if (dodgeKeys.hasOwnProperty(e.key)) dodgeKeys[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') handleESPInput('#');
    if (e.key.toLowerCase() === 'p') handleESPInput('*');
});
window.addEventListener('keyup', (e) => {
    if (document.body.getAttribute('data-theme') !== 'dodge') return;
    if (dodgeKeys.hasOwnProperty(e.key)) dodgeKeys[e.key] = false;
});

function initDodgeGame() {
    dodgeState = 'idle';
    dodgeScore = 0;
    dodgeLives = 3;
    dodgeSpeedLevel = 1;
    player.x = dodgeCanvas.width / 2 - player.w / 2;
    player.y = dodgeCanvas.height - 50;
    dodgeObstacles = [];
    dodgeParticles = [];
    dodgePowerups = [];

    updateDodgeUI();
    dodgeOverlay.classList.remove('hidden');
    dodgeMsg.textContent = "Press # to Start";

    dodgeCtx.clearRect(0, 0, dodgeCanvas.width, dodgeCanvas.height);
    drawPlayer();
}

function startDodgeGame() {
    if (dodgeState === 'running') return;
    sfx.click();
    dodgeState = 'running';
    dodgeScore = 0;
    dodgeLives = 3;
    dodgeSpeedLevel = 1;
    dodgeFrames = 0;
    player.x = dodgeCanvas.width / 2 - player.w / 2;
    player.y = dodgeCanvas.height - 50;
    dodgeObstacles = [];
    dodgeParticles = [];
    dodgePowerups = [];

    updateDodgeUI();
    dodgeOverlay.classList.add('hidden');

    cancelAnimationFrame(dodgeAnimFrame);
    updateDodgeGame();
}

function updateDodgeUI() {
    dodgeScoreBadge.textContent = `Score: ${Math.floor(dodgeScore)}`;
    dodgeLivesBadge.textContent = `Lives: ${dodgeLives}`;
    dodgeSpeedBadge.textContent = `Speed: ${dodgeSpeedLevel.toFixed(1)}x`;
}

function drawPlayer() {
    dodgeCtx.fillStyle = 'var(--neon-cyan)';
    dodgeCtx.shadowBlur = 15;
    dodgeCtx.shadowColor = '#00f0ff';
    if (player.invincibility > 0) {
        if (dodgeFrames % 10 < 5) dodgeCtx.globalAlpha = 0.5;
    }

    dodgeCtx.beginPath();
    dodgeCtx.moveTo(player.x + player.w / 2, player.y);
    dodgeCtx.lineTo(player.x + player.w, player.y + player.h);
    dodgeCtx.lineTo(player.x, player.y + player.h);
    dodgeCtx.closePath();
    dodgeCtx.fill();

    dodgeCtx.globalAlpha = 1;
    dodgeCtx.shadowBlur = 0;
}

function spawnDodgeParticle(x, y, color) {
    dodgeParticles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color: color
    });
}

function updateDodgeGame() {
    if (dodgeState !== 'running') return;

    dodgeFrames++;
    dodgeCtx.clearRect(0, 0, dodgeCanvas.width, dodgeCanvas.height);

    if (dodgeFrames % 60 === 0) {
        dodgeScore += 10 * dodgeSpeedLevel;
        dodgeSpeedLevel += 0.01;
        updateDodgeUI();
    }

    if (player.invincibility > 0) player.invincibility--;

    let kx = 0; let ky = 0;
    if (dodgeKeys.ArrowLeft || dodgeKeys.a) kx = -1;
    if (dodgeKeys.ArrowRight || dodgeKeys.d) kx = 1;
    if (dodgeKeys.ArrowUp || dodgeKeys.w) ky = -1;
    if (dodgeKeys.ArrowDown || dodgeKeys.s) ky = 1;

    let moveX = player.vx || (kx * player.speed);
    let moveY = player.vy || (ky * player.speed);

    if (player.boost > 1) {
        moveX *= player.boost;
        moveY *= player.boost;
        if (moveX !== 0 || moveY !== 0) {
            spawnDodgeParticle(player.x + player.w / 2, player.y + player.h, '#00f0ff');
        }
        player.boost -= 0.02;
        if (player.boost < 1) player.boost = 1;
    }

    player.x += moveX;
    player.y += moveY;

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > dodgeCanvas.width) player.x = dodgeCanvas.width - player.w;
    if (player.y < 0) player.y = 0;
    if (player.y + player.h > dodgeCanvas.height) player.y = dodgeCanvas.height - player.h;

    drawPlayer();

    let spawnRate = Math.max(10, 40 - Math.floor(dodgeSpeedLevel * 5));
    if (dodgeFrames % spawnRate === 0 && dodgeObstacles.length < 20) {
        let isSide = Math.random() < 0.2;
        let obs = {
            x: isSide ? (Math.random() < 0.5 ? 0 : dodgeCanvas.width) : Math.random() * (dodgeCanvas.width - 30),
            y: isSide ? Math.random() * (dodgeCanvas.height - 100) : -30,
            w: 20 + Math.random() * 20,
            h: 20 + Math.random() * 20,
            vx: isSide ? (Math.random() < 0.5 ? 1 : -1) * 3 * dodgeSpeedLevel : 0,
            vy: isSide ? 0 : (2 + Math.random() * 3) * dodgeSpeedLevel,
            type: Math.random() < 0.1 ? 'fast' : 'normal'
        };
        if (obs.type === 'fast') { obs.vy *= 1.5; obs.w = 15; obs.h = 40; }
        dodgeObstacles.push(obs);
    }

    if (dodgeFrames % 600 === 0 && Math.random() < 0.5) {
        dodgePowerups.push({
            x: Math.random() * (dodgeCanvas.width - 20),
            y: -20, w: 20, h: 20, vy: 2, type: Math.random() < 0.5 ? 'shield' : 'slow'
        });
    }

    for (let i = dodgePowerups.length - 1; i >= 0; i--) {
        let p = dodgePowerups[i];
        p.y += p.vy;
        dodgeCtx.fillStyle = p.type === 'shield' ? '#00ff66' : '#ffcc00';
        dodgeCtx.shadowBlur = 10;
        dodgeCtx.shadowColor = dodgeCtx.fillStyle;
        dodgeCtx.beginPath();
        dodgeCtx.arc(p.x + p.w / 2, p.y + p.h / 2, 10, 0, Math.PI * 2);
        dodgeCtx.fill();
        dodgeCtx.shadowBlur = 0;

        if (player.x < p.x + p.w && player.x + player.w > p.x &&
            player.y < p.y + p.h && player.y + player.h > p.y) {
            sfx.success();
            if (p.type === 'shield') player.invincibility = 180;
            if (p.type === 'slow') {
                dodgeSpeedLevel = Math.max(1, dodgeSpeedLevel - 0.5);
            }
            updateDodgeUI();
            dodgePowerups.splice(i, 1);
            continue;
        }
        if (p.y > dodgeCanvas.height) dodgePowerups.splice(i, 1);
    }

    dodgeCtx.fillStyle = 'var(--neon-magenta)';
    dodgeCtx.shadowBlur = 15;
    dodgeCtx.shadowColor = '#ff003c';

    for (let i = dodgeObstacles.length - 1; i >= 0; i--) {
        let obs = dodgeObstacles[i];
        obs.x += obs.vx;
        obs.y += obs.vy;

        dodgeCtx.fillRect(obs.x, obs.y, obs.w, obs.h);

        if (player.invincibility <= 0 &&
            player.x < obs.x + obs.w && player.x + player.w > obs.x &&
            player.y < obs.y + obs.h && player.y + player.h > obs.y) {

            sfx.error();
            applyErrorShake(dodgeCanvas);
            for (let j = 0; j < 15; j++) spawnDodgeParticle(player.x + 10, player.y + 10, '#ff003c');
            dodgeLives--;
            player.invincibility = 60;
            updateDodgeUI();

            dodgeObstacles.splice(i, 1);

            if (dodgeLives <= 0) {
                dodgeState = 'gameover';
                dodgeCtx.shadowBlur = 0;
                dodgeOverlay.classList.remove('hidden');
                dodgeMsg.textContent = "GAME OVER";
                return;
            }
            continue;
        }

        if (obs.y > dodgeCanvas.height || obs.x < -100 || obs.x > dodgeCanvas.width + 100) {
            dodgeObstacles.splice(i, 1);
        }
    }
    dodgeCtx.shadowBlur = 0;

    for (let i = dodgeParticles.length - 1; i >= 0; i--) {
        let p = dodgeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) { dodgeParticles.splice(i, 1); continue; }

        dodgeCtx.fillStyle = p.color;
        dodgeCtx.globalAlpha = p.life;
        dodgeCtx.beginPath();
        dodgeCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        dodgeCtx.fill();
    }
    dodgeCtx.globalAlpha = 1;

    dodgeAnimFrame = requestAnimationFrame(updateDodgeGame);
}


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
let playerTrail = [];
let aiTrail = [];
let terrMode = 'pve';

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
    playerTrail = [];
    aiTrail = [];
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
    document.getElementById('territory-score-ai').textContent = terrMode === 'pve' ? `AI: ${a}` : `P2: ${a}`;
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

const btnTerritoryMode = document.getElementById('btn-territory-mode');
if (btnTerritoryMode) {
    btnTerritoryMode.addEventListener('click', () => {
        sfx.click();
        if (terrMode === 'pve') {
            terrMode = 'pvp';
            btnTerritoryMode.textContent = 'Mode: PvP';
            document.getElementById('territory-score-ai').textContent = 'P2: 1';
        } else {
            terrMode = 'pve';
            btnTerritoryMode.textContent = 'Mode: Vs AI';
            document.getElementById('territory-score-ai').textContent = 'AI: 1';
        }
        initTerritoryGame();
    });
}

function drawTerritory() {
    if (!terrCtx) return;
    terrCtx.clearRect(0, 0, 600, 400);
    for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
            if (grid[i][j] === 1) { terrCtx.fillStyle = '#00f0ff'; terrCtx.shadowBlur = 5; terrCtx.shadowColor = '#00f0ff'; } // Player
            else if (grid[i][j] === 2) { terrCtx.fillStyle = '#ff003c'; terrCtx.shadowBlur = 0; } // AI
            else if (grid[i][j] === 3) { terrCtx.fillStyle = '#00ff66'; terrCtx.shadowBlur = 10; terrCtx.shadowColor = '#00ff66'; } // Trail
            else if (grid[i][j] === 4) { terrCtx.fillStyle = '#ffaa00'; terrCtx.shadowBlur = 10; terrCtx.shadowColor = '#ffaa00'; } // AI Trail
            else { terrCtx.fillStyle = 'rgba(255,255,255,0.05)'; terrCtx.shadowBlur = 0; }
            terrCtx.fillRect(i * gridSize, j * gridSize, gridSize - 1, gridSize - 1);
        }
    }
    terrCtx.shadowBlur = 0;
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
        let nextX = playerPos.x;
        let nextY = playerPos.y;

        if ((terrKeys['w'] || terrKeys['2']) && playerPos.y > 0) { nextY--; moved = true; }
        else if ((terrKeys['s'] || terrKeys['8']) && playerPos.y < 19) { nextY++; moved = true; }
        else if ((terrKeys['a'] || terrKeys['4']) && playerPos.x > 0) { nextX--; moved = true; }
        else if ((terrKeys['d'] || terrKeys['6']) && playerPos.x < 29) { nextX++; moved = true; }

        if (moved) {
            let targetState = grid[nextX][nextY];

            if (targetState === 3) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = terrMode === 'pve' ? 'TRAIL COLLISION!' : 'P1 TRAIL COLLISION! P2 WINS!';
                sfx.error();
                return;
            } else if (targetState === 4) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = terrMode === 'pve' ? 'YOU CUT AI TRAIL! YOU WIN!' : 'P1 CUT P2 TRAIL! P1 WINS!';
                sfx.win();
                return;
            }

            playerPos.x = nextX;
            playerPos.y = nextY;

            if (targetState === 1) {
                if (playerTrail.length > 2) {
                    fillTerritory(1, 3, playerTrail);
                } else if (playerTrail.length > 0) {
                    for (let t of playerTrail) grid[t.x][t.y] = 0;
                    playerTrail = [];
                }
            } else if (targetState === 0 || targetState === 2) {
                grid[playerPos.x][playerPos.y] = 3;
                playerTrail.push({ x: playerPos.x, y: playerPos.y });
            }

            lastMoveTime = now;
            sfx.hover();
        }
    }

    if (terrMode === 'pvp') {
        // Player 2 move (debounced 80ms, using Arrow Keys)
        if (now - aiLastMoveTime > 80) {
            let movedP2 = false;
            let nextAiX = aiPos.x;
            let nextAiY = aiPos.y;

            if (terrKeys['ArrowUp'] && aiPos.y > 0) { nextAiY--; movedP2 = true; }
            else if (terrKeys['ArrowDown'] && aiPos.y < 19) { nextAiY++; movedP2 = true; }
            else if (terrKeys['ArrowLeft'] && aiPos.x > 0) { nextAiX--; movedP2 = true; }
            else if (terrKeys['ArrowRight'] && aiPos.x < 29) { nextAiX++; movedP2 = true; }

            if (movedP2) {
                let aiTargetState = grid[nextAiX][nextAiY];
                if (aiTargetState === 4) {
                    terrActive = false;
                    document.getElementById('territory-overlay').classList.remove('hidden');
                    document.getElementById('territory-msg').textContent = 'P2 TRAIL COLLISION! P1 WINS!';
                    sfx.win();
                    return;
                } else if (aiTargetState === 3) {
                    terrActive = false;
                    document.getElementById('territory-overlay').classList.remove('hidden');
                    document.getElementById('territory-msg').textContent = 'P2 CUT P1 TRAIL! P2 WINS!';
                    sfx.error();
                    return;
                }

                aiPos.x = nextAiX;
                aiPos.y = nextAiY;

                if (aiTargetState === 2) {
                    if (aiTrail.length > 2) {
                        fillTerritory(2, 4, aiTrail);
                    } else if (aiTrail.length > 0) {
                        for (let t of aiTrail) grid[t.x][t.y] = 0;
                        aiTrail = [];
                    }
                } else if (aiTargetState === 0 || aiTargetState === 1) {
                    grid[aiPos.x][aiPos.y] = 4;
                    aiTrail.push({ x: aiPos.x, y: aiPos.y });
                }

                aiLastMoveTime = now;
                sfx.hover();
            }
        }
    } else {
        // AI move (faster, smarter every 75ms)
        if (now - aiLastMoveTime > 75) {
            let dirs = [];
            if (aiPos.x > 0) dirs.push({ dx: -1, dy: 0 });
            if (aiPos.x < 29) dirs.push({ dx: 1, dy: 0 });
            if (aiPos.y > 0) dirs.push({ dx: 0, dy: -1 });
            if (aiPos.y < 19) dirs.push({ dx: 0, dy: 1 });

            // Filter out immediate suicide
            dirs = dirs.filter(d => grid[aiPos.x + d.dx][aiPos.y + d.dy] !== 4);
            if (dirs.length === 0) dirs = [{ dx: 0, dy: 0 }]; // stuck

            let validDirs = dirs;

            // Smarter behavior: Look for player trail nearby to attack
            let attackDirs = dirs.filter(d => grid[aiPos.x + d.dx][aiPos.y + d.dy] === 3);

            let closingDirs = dirs.filter(d => grid[aiPos.x + d.dx][aiPos.y + d.dy] === 2);
            let closingChance = aiTrail.length > 15 ? 0.9 : (aiTrail.length > 5 ? 0.7 : 0.2);

            if (attackDirs.length > 0 && Math.random() < 0.8) {
                // Highly likely to attack player trail if adjacent
                validDirs = attackDirs;
            } else if (aiTrail.length > 2 && closingDirs.length > 0 && Math.random() < closingChance) {
                // Close loop based on trail length
                validDirs = closingDirs;
            } else {
                // Continue exploring empty or player territory
                let emptyDirs = dirs.filter(d => grid[aiPos.x + d.dx][aiPos.y + d.dy] === 0 || grid[aiPos.x + d.dx][aiPos.y + d.dy] === 1);
                if (emptyDirs.length > 0) {
                    validDirs = emptyDirs;
                }
            }

            let move = validDirs[Math.floor(Math.random() * validDirs.length)];
            let nextAiX = aiPos.x + move.dx;
            let nextAiY = aiPos.y + move.dy;
            let aiTargetState = grid[nextAiX][nextAiY];

            if (aiTargetState === 4) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'AI TRAIL COLLISION! YOU WIN!';
                sfx.win();
                return;
            } else if (aiTargetState === 3) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'AI CUT TRAIL!';
                sfx.error();
                return;
            }

            aiPos.x = nextAiX;
            aiPos.y = nextAiY;

            if (aiTargetState === 2) {
                if (aiTrail.length > 2) {
                    fillTerritory(2, 4, aiTrail);
                } else if (aiTrail.length > 0) {
                    for (let t of aiTrail) grid[t.x][t.y] = 0;
                    aiTrail = [];
                }
            } else if (aiTargetState === 0 || aiTargetState === 1) {
                grid[aiPos.x][aiPos.y] = 4;
                aiTrail.push({ x: aiPos.x, y: aiPos.y });
            }

            aiLastMoveTime = now;
        }
    }

    let scores = updateTerritoryScore();
    if (scores.p + scores.a === 600) {
        terrActive = false;
        document.getElementById('territory-overlay').classList.remove('hidden');
        if (scores.p > scores.a) {
            document.getElementById('territory-msg').textContent = terrMode === 'pve' ? 'YOU WIN!' : 'P1 WINS!';
            sfx.win();
        } else {
            document.getElementById('territory-msg').textContent = terrMode === 'pve' ? 'AI WINS!' : 'P2 WINS!';
            sfx.error();
        }
    }

    drawTerritory();
    if (terrActive) terrAnimId = requestAnimationFrame(updateTerritory);
}

function fillTerritory(ownerId, trailId, trailArray) {
    let visited = [];
    for (let i = 0; i < 30; i++) {
        visited[i] = [];
        for (let j = 0; j < 20; j++) visited[i][j] = false;
    }

    let stack = [];
    for (let i = 0; i < 30; i++) {
        stack.push({ x: i, y: 0 });
        stack.push({ x: i, y: 19 });
    }
    for (let j = 1; j < 19; j++) {
        stack.push({ x: 0, y: j });
        stack.push({ x: 29, y: j });
    }

    while (stack.length > 0) {
        let curr = stack.pop();
        let cx = curr.x;
        let cy = curr.y;

        if (cx < 0 || cx >= 30 || cy < 0 || cy >= 20) continue;
        if (visited[cx][cy]) continue;

        if (grid[cx][cy] === ownerId || grid[cx][cy] === trailId) continue;

        visited[cx][cy] = true;

        stack.push({ x: cx + 1, y: cy });
        stack.push({ x: cx - 1, y: cy });
        stack.push({ x: cx, y: cy + 1 });
        stack.push({ x: cx, y: cy - 1 });
    }

    let filledCount = 0;
    for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
            if (!visited[i][j] && grid[i][j] !== ownerId && grid[i][j] !== trailId) {
                grid[i][j] = ownerId;
                filledCount++;
                if (Math.random() < 0.1 && typeof spawnBurst !== 'undefined') {
                    let c = ownerId === 1 ? '0, 255, 204' : '255, 0, 60';
                    spawnBurst(i * gridSize, j * gridSize, 5, c);
                }
            }
        }
    }

    for (let t of trailArray) {
        grid[t.x][t.y] = ownerId;
    }
    trailArray.length = 0;

    if (filledCount > 0) {
        if (ownerId === 1) sfx.win(); else sfx.error();
        updateTerritoryScore();
    }
}

// ==========================================
// GAME 7: PRESSURE CORE
// ==========================================
const coreCanvasArea = document.getElementById('core-canvas-area');
const coreOverlay = document.getElementById('core-overlay');
const coreMsg = document.getElementById('core-msg');
const coreHealthBadge = document.getElementById('core-health');
const coreScoreBadge = document.getElementById('core-score');
const coreStreakBadge = document.getElementById('core-streak');
const btnCoreStart = document.getElementById('btn-core-start');

let coreActive = false;
let coreHealth = 5;
let coreScore = 0;
let coreStreak = 0;
let coreAlerts = [];
let coreNextAlertId = 0;
let coreAnimId;
let coreLastTime = 0;
let coreSpawnTimer = 0;
let coreSpawnRate = 2000;
let coreHeldInput = null;

function initPressureGame() {
    coreActive = false;
    cancelAnimationFrame(coreAnimId);
    coreHealth = 5;
    coreScore = 0;
    coreStreak = 0;
    coreAlerts = [];
    coreNextAlertId = 0;
    coreSpawnRate = 2000;
    coreHeldInput = null;

    document.querySelectorAll('.core-alert').forEach(el => el.remove());

    if (coreHealthBadge) coreHealthBadge.textContent = `Health: 5`;
    if (coreScoreBadge) coreScoreBadge.textContent = `Score: 0`;
    if (coreStreakBadge) coreStreakBadge.textContent = `Streak: 0`;

    if (coreOverlay) {
        coreOverlay.classList.remove('hidden');
        coreMsg.textContent = 'System Ready';
    }
    if (btnCoreStart) btnCoreStart.classList.remove('hidden');
}

if (btnCoreStart) btnCoreStart.addEventListener('click', () => { sfx.click(); startCoreGame(); });

function startCoreGame() {
    initPressureGame();
    if (coreOverlay) coreOverlay.classList.add('hidden');
    if (btnCoreStart) btnCoreStart.classList.add('hidden');

    coreActive = true;
    coreLastTime = performance.now();
    coreSpawnTimer = 0;
    coreAnimId = requestAnimationFrame(updateCoreGame);
}

function spawnCoreAlert() {
    const types = ['DIRECTION', 'CODE', 'IGNORE', 'HOLD', 'MULTI'];
    const r = Math.random();
    let type = 'DIRECTION';

    if (coreScore < 5) {
        type = r < 0.6 ? 'DIRECTION' : 'CODE';
    } else {
        if (r < 0.3) type = 'DIRECTION';
        else if (r < 0.6) type = 'CODE';
        else if (r < 0.75) type = 'IGNORE';
        else if (r < 0.9) type = 'HOLD';
        else type = 'MULTI';
    }

    const alert = {
        id: coreNextAlertId++,
        type: type,
        payload: null,
        maxTime: Math.max(1000, 3000 - (coreScore * 50)),
        timeLeft: 0,
        el: null,
        x: 0,
        y: 0,
        completed: false
    };
    alert.timeLeft = alert.maxTime;

    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const keys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];

    if (type === 'DIRECTION') {
        alert.payload = dirs[Math.floor(Math.random() * dirs.length)];
    } else if (type === 'CODE') {
        alert.payload = '';
        const len = Math.random() < 0.5 ? 1 : 2;
        for (let i = 0; i < len; i++) alert.payload += keys[Math.floor(Math.random() * keys.length)];
    } else if (type === 'IGNORE') {
        alert.payload = 'DO NOT TOUCH';
        alert.maxTime = 2000;
        alert.timeLeft = 2000;
    } else if (type === 'HOLD') {
        alert.payload = dirs[Math.floor(Math.random() * dirs.length)];
        alert.holdProgress = 0;
    } else if (type === 'MULTI') {
        alert.payload = {
            dir: dirs[Math.floor(Math.random() * dirs.length)],
            key: keys[Math.floor(Math.random() * keys.length)]
        };
        alert.step = 0;
    }

    const el = document.createElement('div');
    el.className = `core-alert type-${type.toLowerCase()}`;

    const bw = 600, bh = 400;
    alert.x = Math.random() * (bw - 160) + 80;
    alert.y = Math.random() * (bh - 100) + 50;
    el.style.left = `${alert.x}px`;
    el.style.top = `${alert.y}px`;

    let icon = '', desc = '';
    if (type === 'DIRECTION') {
        if (alert.payload === 'UP') icon = '⬆️';
        if (alert.payload === 'DOWN') icon = '⬇️';
        if (alert.payload === 'LEFT') icon = '⬅️';
        if (alert.payload === 'RIGHT') icon = '➡️';
        desc = 'SWIPE';
    } else if (type === 'CODE') {
        icon = alert.payload;
        desc = 'TYPE CODE';
    } else if (type === 'IGNORE') {
        icon = '⚠️';
        desc = 'IGNORE';
    } else if (type === 'HOLD') {
        icon = `⏱️ ${alert.payload}`;
        desc = 'HOLD';
    } else if (type === 'MULTI') {
        icon = `${alert.payload.dir} + ${alert.payload.key}`;
        desc = 'SEQUENCE';
    }

    el.innerHTML = `
        <div class="core-alert-icon">${icon}</div>
        <div class="core-alert-desc">${desc}</div>
        <div class="core-progress"><div class="core-progress-bar"></div></div>
    `;

    if (coreCanvasArea) coreCanvasArea.appendChild(el);
    alert.el = el;
    coreAlerts.push(alert);
    sfx.hover();
}

function updateCoreGame(time) {
    if (!coreActive) return;

    const dt = time - coreLastTime;
    coreLastTime = time;

    coreSpawnTimer += dt;
    if (coreSpawnTimer >= coreSpawnRate) {
        coreSpawnTimer = 0;
        spawnCoreAlert();
        coreSpawnRate = Math.max(400, 2000 - (coreScore * 30));
    }

    if (coreHeldInput) {
        for (let a of coreAlerts) {
            if (a.type === 'HOLD' && a.payload === coreHeldInput) {
                a.holdProgress += dt;
                a.el.querySelector('.core-alert-icon').style.transform = `scale(${1 + a.holdProgress / 1000})`;
                if (a.holdProgress >= 1000) {
                    resolveCoreAlert(a.id, true);
                }
                break;
            }
        }
    }

    for (let i = coreAlerts.length - 1; i >= 0; i--) {
        const a = coreAlerts[i];
        a.timeLeft -= dt;

        if (a.timeLeft <= 0) {
            if (a.type === 'IGNORE') resolveCoreAlert(a.id, true);
            else resolveCoreAlert(a.id, false);
        } else {
            const bar = a.el.querySelector('.core-progress-bar');
            if (bar) bar.style.transform = `scaleX(${a.timeLeft / a.maxTime})`;

            if (a.timeLeft < 500 && a.type !== 'IGNORE') {
                a.el.style.transform = `translate(-50%, -50%) scale(${1 + Math.sin(time / 20) * 0.1})`;
            }
        }
    }

    if (coreActive) coreAnimId = requestAnimationFrame(updateCoreGame);
}

function resolveCoreAlert(id, success) {
    const idx = coreAlerts.findIndex(a => a.id === id);
    if (idx === -1) return;
    const a = coreAlerts[idx];

    if (success) {
        sfx.success();
        a.el.style.borderColor = 'var(--neon-green)';
        a.el.style.boxShadow = '0 0 20px rgba(0, 255, 102, 0.8)';
        coreScore++;
        coreStreak++;
        if (coreStreak > 0 && coreStreak % 10 === 0) { coreHealth = Math.min(5, coreHealth + 1); }
    } else {
        sfx.error();
        applyErrorShake(coreCanvasArea);
        a.el.style.borderColor = 'var(--neon-magenta)';
        a.el.style.boxShadow = '0 0 20px rgba(255, 0, 60, 0.8)';
        coreHealth--;
        coreStreak = 0;
    }

    coreHealthBadge.textContent = `Health: ${coreHealth}`;
    coreScoreBadge.textContent = `Score: ${coreScore}`;
    coreStreakBadge.textContent = `Streak: ${coreStreak}`;

    const el = a.el;
    setTimeout(() => { if (el) el.remove(); }, 200);
    coreAlerts.splice(idx, 1);

    if (coreHealth <= 0) gameOverCore();
}

function gameOverCore() {
    coreActive = false;
    cancelAnimationFrame(coreAnimId);
    sfx.error();
    if (coreOverlay) {
        coreOverlay.classList.remove('hidden');
        coreMsg.innerHTML = `SYSTEM FAILURE<br><span style="font-size:1.5rem">Score: ${coreScore}</span>`;
    }
    if (btnCoreStart) {
        btnCoreStart.textContent = "Reboot System";
        btnCoreStart.classList.remove('hidden');
    }
}

function handleCoreInput(input, isDown = true) {
    if (!coreActive) return;

    if (!isDown) {
        if (coreHeldInput === input) coreHeldInput = null;
        return;
    }

    coreHeldInput = input;
    let matched = false;
    const sortedAlerts = [...coreAlerts].sort((a, b) => a.timeLeft - b.timeLeft);

    for (let a of sortedAlerts) {
        if (a.type === 'DIRECTION' && input === a.payload) {
            resolveCoreAlert(a.id, true);
            matched = true;
            break;
        } else if (a.type === 'CODE') {
            if (a.payload.startsWith(input)) {
                a.payload = a.payload.substring(input.length);
                if (a.payload.length === 0) resolveCoreAlert(a.id, true);
                else {
                    a.el.querySelector('.core-alert-icon').textContent = a.payload;
                    sfx.click();
                }
                matched = true;
                break;
            }
        } else if (a.type === 'MULTI') {
            if (a.step === 0 && input === a.payload.dir) {
                a.step = 1;
                a.el.querySelector('.core-alert-icon').textContent = a.payload.key;
                sfx.click();
                matched = true;
                break;
            } else if (a.step === 1 && input === a.payload.key) {
                resolveCoreAlert(a.id, true);
                matched = true;
                break;
            }
        } else if (a.type === 'HOLD') {
            if (input === a.payload) {
                matched = true;
                break;
            }
        }
    }

    if (!matched) {
        const ignoreAlert = sortedAlerts.find(a => a.type === 'IGNORE');
        if (ignoreAlert) {
            resolveCoreAlert(ignoreAlert.id, false);
        } else {
            coreHealth--;
            coreStreak = 0;
            coreHealthBadge.textContent = `Health: ${coreHealth}`;
            coreStreakBadge.textContent = `Streak: 0`;
            sfx.error();
            applyErrorShake(coreCanvasArea);
            if (coreHealth <= 0) gameOverCore();
        }
    }
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

    // Pressure Core keyboard mapping
    if (document.body.getAttribute('data-theme') === 'pressure') {
        let input = null;
        if (e.key === 'ArrowUp') input = 'UP';
        if (e.key === 'ArrowDown') input = 'DOWN';
        if (e.key === 'ArrowLeft') input = 'LEFT';
        if (e.key === 'ArrowRight') input = 'RIGHT';
        if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'].includes(e.key)) input = e.key;

        if (input && !e.repeat) {
            e.preventDefault();
            handleCoreInput(input, true);
        }
    }
});
window.addEventListener('keyup', (e) => {
    breakerKeys[e.key] = false;
    terrKeys[e.key] = false;

    if (document.body.getAttribute('data-theme') === 'pressure') {
        let input = null;
        if (e.key === 'ArrowUp') input = 'UP';
        if (e.key === 'ArrowDown') input = 'DOWN';
        if (e.key === 'ArrowLeft') input = 'LEFT';
        if (e.key === 'ArrowRight') input = 'RIGHT';
        if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'].includes(e.key)) input = e.key;

        if (input) {
            handleCoreInput(input, false);
        }
    }
});


function handleESPInput(key) {

    const theme = document.body.getAttribute('data-theme');

    // 🔴 GLOBAL CONTROLS
    if (key === '#') {
        if (theme === 'pressure') {
            handleCoreInput('#', true);
            setTimeout(() => handleCoreInput('#', false), 50);
            return;
        }

        // SUBMIT based on active game
        if (theme === 'memory') {
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            memInput.dispatchEvent(event);
        }

        if (theme === 'dodge') {
            if (dodgeState === 'idle' || dodgeState === 'gameover') {
                startDodgeGame();
            } else {
                initDodgeGame(); // Reset game
            }
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
        if (theme === 'pressure') {
            handleCoreInput('*', true);
            setTimeout(() => handleCoreInput('*', false), 50);
            return;
        }

        if (theme === 'memory' && !memInput.disabled) {
            memInput.value = memInput.value.slice(0, -1);
        }

        if (theme === 'dodge') {
            if (dodgeState === 'running') {
                dodgeState = 'paused';
            } else if (dodgeState === 'paused') {
                dodgeState = 'running';
                updateDodgeGame();
            }
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

    // 🚀 NEON SKY DODGE
    if (theme === 'dodge') {
        if (key === '5') player.boost = 2.5;
        if (key === '0') dodgeSpeedLevel = Math.max(0.5, dodgeSpeedLevel - 0.2);
    }

    // 🔢 SEQUENCE GAME
    if (theme === 'sequence') {
        seqInput.value += key;
    }

    // ☢️ PRESSURE CORE
    if (theme === 'pressure') {
        handleCoreInput(key, true);
        setTimeout(() => handleCoreInput(key, false), 50);
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

    let jx = 0;
    let jy = 0;

    let dirX = joystick.x === -1 ? 'LEFT' : (joystick.x === 1 ? 'RIGHT' : null);
    let dirY = joystick.y === -1 ? 'UP' : (joystick.y === 1 ? 'DOWN' : null);

    if (dirX) {
        let mapped = normalizeDirection(dirX);
        if (mapped === 'LEFT') jx = -1;
        if (mapped === 'RIGHT') jx = 1;
        if (mapped === 'UP') jy = -1;
        if (mapped === 'DOWN') jy = 1;
    }
    if (dirY) {
        let mapped = normalizeDirection(dirY);
        if (mapped === 'LEFT') jx = -1;
        if (mapped === 'RIGHT') jx = 1;
        if (mapped === 'UP') jy = -1;
        if (mapped === 'DOWN') jy = 1;
    }

    // 🎮 BUTTON → same as #
    if (joystick.btn === 0) {
        if (!joystick.btnLastState) {
            handleESPInput('#');
            joystick.btnLastState = true;
        }
    } else {
        joystick.btnLastState = false;
    }

    // 🎮 NEON SKY DODGE
    if (theme === 'dodge') {
        player.vx = jx * player.speed;
        player.vy = jy * player.speed;
    }

    // 🎮 BALL BREAKER
    if (theme === 'breaker') {
        if (jx === -1) paddle.x -= 7;
        if (jx === 1) paddle.x += 7;
    }

    // 🎮 TERRITORY
    if (theme === 'territory') {
        if (jx === -1) terrKeys['ArrowLeft'] = true;
        if (jx === 1) terrKeys['ArrowRight'] = true;
        if (jy === -1) terrKeys['ArrowUp'] = true;
        if (jy === 1) terrKeys['ArrowDown'] = true;

        setTimeout(() => {
            terrKeys['ArrowLeft'] = false;
            terrKeys['ArrowRight'] = false;
            terrKeys['ArrowUp'] = false;
            terrKeys['ArrowDown'] = false;
        }, 100);
    }

    // 🎮 PRESSURE CORE
    if (theme === 'pressure') {
        let input = null;
        if (jx === -1) input = 'LEFT';
        else if (jx === 1) input = 'RIGHT';
        else if (jy === -1) input = 'UP';
        else if (jy === 1) input = 'DOWN';

        if (input !== joystick.coreLastInput) {
            if (joystick.coreLastInput) {
                handleCoreInput(joystick.coreLastInput, false);
            }
            if (input) {
                handleCoreInput(input, true);
            }
            joystick.coreLastInput = input;
        }
    }
}
