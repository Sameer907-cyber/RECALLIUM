//-------------------------
//ESP,Mechanical Keyboard Controls, Joystick Controls
//-------------------------

// let joystick = {
//     x: 0,
//     y: 0,
//     btn: 1,
//     btnLastState: false,
//     coreLastInput: null
// };

// const ESP_IP = "10.137.98.140";

// const socket = new WebSocket(`ws://${ESP_IP}:81/`);

// socket.onopen = () => {
//     console.log("Connected to ESP 🎮");
// };

// function normalizeDirection(dir) {
//     // Identity mapping based on user request: "up joystick should move up"
//     return dir;
// }

// socket.onmessage = (event) => {
//     const data = event.data.trim();

//     // If joystick format → "dx,dy,btn"
//     if (data.includes(",")) {
//         const [dx, dy, btn] = data.split(",");

//         joystick.x = Number(dx);
//         joystick.y = Number(dy);
//         joystick.btn = Number(btn);

//         handleJoystick();
//     } else {
//         let key = normalizeDirection(data);
//         console.log("RAW:", data, "MAPPED:", key);
//         handleESPInput(key);
//     }
// };

// let lastInputTime = 0;
// const INPUT_DELAY = 80; 



// AUDIO SYNTHESIS & SOUND EFFECTS

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
    win: () => { playTone(400, 'square', 0.1); setTimeout(() => playTone(500, 'square', 0.1), 100); setTimeout(() => playTone(600, 'square', 0.3), 200); if (typeof spawnBurst !== 'undefined') spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 150, '0, 255, 102'); },
    neuroHover: () => playTone(300, 'sine', 0.1, 0.03),
    neuroClick: () => playTone(350, 'sine', 0.2, 0.05),
    neuroSuccess: () => { playTone(300, 'sine', 0.4, 0.05); setTimeout(() => playTone(400, 'sine', 0.6, 0.05), 200); },
    neuroError: () => { playTone(200, 'sine', 0.4, 0.05); setTimeout(() => playTone(180, 'sine', 0.4, 0.05), 200); }
};


// BACKGROUND PARTICLES CANVAS

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


// SPA NAVIGATION LOGIC

const views = document.querySelectorAll('.view');
const cards = document.querySelectorAll('.game-card');
const backBtns = document.querySelectorAll('.btn-back');

function navigateTo(targetId) {
    if (!targetId || !document.getElementById(targetId)) return;
    if (document.getElementById(targetId).classList.contains('active')) return;

    const isNeuro = targetId.includes('neuro');
    const targetZone = targetId === 'view-home' ? 'arcade' : (isNeuro ? 'neuro' : 'arcade');
    const currentZone = document.body.getAttribute('data-zone') || 'arcade';

    if (isNeuro) {
        playTone(300, 'sine', 0.5, 0.05);
    } else {
        sfx.click();
    }

    let transitionDelay = 200;
    if (currentZone !== targetZone && targetId !== 'view-home') {
        if (targetZone === 'neuro') {
            const neuroMorph = document.getElementById('transition-neuro-morph');
            if (neuroMorph) {
                neuroMorph.classList.remove('active');
                void neuroMorph.offsetWidth;
                neuroMorph.classList.add('active');
            }
            transitionDelay = 500;
        } else {
            const glitch = document.getElementById('transition-glitch');
            if (glitch) {
                glitch.classList.remove('active');
                void glitch.offsetWidth;
                glitch.classList.add('active');
            }
            transitionDelay = 200;
        }
    } else {
        const glitch = document.getElementById('transition-glitch');
        if (glitch) {
            glitch.classList.remove('active');
            void glitch.offsetWidth;
            glitch.classList.add('active');
        }
    }

    setTimeout(() => {
        views.forEach(view => view.classList.remove('active'));
        const themeStr = targetId.replace('view-', '');
        document.body.setAttribute('data-theme', themeStr);
        document.body.setAttribute('data-zone', targetZone);

        if (targetZone === 'neuro') {
            startNeuroBg();
        } else {
            stopNeuroBg();
        }

        if (typeof neuroFilterState !== 'undefined') neuroFilterState = 'idle';
        if (typeof neuroFilterSpawnTimer !== 'undefined') clearInterval(neuroFilterSpawnTimer);
        if (typeof neuroPathwayState !== 'undefined') neuroPathwayState = 'idle';
        if (typeof neuroBalanceState !== 'undefined') neuroBalanceState = 'idle';
        if (typeof neuroMatrixState !== 'undefined') neuroMatrixState = 'idle';

    }, transitionDelay);

    setTimeout(() => {
        document.getElementById(targetId).classList.add('active');
        if (targetId === 'view-memory') resetMemoryView();
        if (targetId === 'view-dodge') initDodgeGame();
        if (targetId === 'view-sequence') initSequenceGame();
        if (targetId === 'view-breaker') initBreakerGame();
        if (targetId === 'view-territory') initTerritoryGame();
        if (targetId === 'view-pressure') initPressureGame();

        if (targetId === 'view-neuro-direction') initNeuroDirection();
        if (targetId === 'view-neuro-maze') initNeuroMaze();
        if (targetId === 'view-neuro-pattern') initNeuroPattern();
        if (targetId === 'view-neuro-color') initNeuroColor();

        if (targetId === 'view-neuro-matrix') initNeuroMatrix();
        if (targetId === 'view-neuro-balance') initNeuroBalance();
        if (targetId === 'view-neuro-pathway') initNeuroPathway();
        if (targetId === 'view-neuro-filter') initNeuroFilter();
    }, transitionDelay + 150);
}

const allClickableCards = document.querySelectorAll('.game-card, .zone-card, .neuro-game-card');
allClickableCards.forEach(card => {
    card.addEventListener('mouseenter', sfx.hover);
    card.addEventListener('click', () => navigateTo(card.getAttribute('data-target')));

    if (card.classList.contains('game-card') || card.classList.contains('zone-card')) {
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
    }
});

backBtns.forEach(btn => {
    btn.addEventListener('mouseenter', sfx.hover);
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-target') || 'view-home'));
});


document.body.addEventListener('click', () => initAudio(), { once: true });
document.querySelectorAll('button').forEach(b => {
    b.addEventListener('mouseenter', () => { if (b.id !== 'btn-memory-submit' && b.id !== 'btn-guess-submit' && b.id !== 'btn-sequence-submit') sfx.hover(); });
});

function applyErrorShake(element) {
    element.classList.remove('shake');
    void element.offsetWidth;
    element.classList.add('shake');
    sfx.error();
}

// GAME 1: MEMORY GAME

const modesView = document.getElementById('memory-modes');
const playView = document.getElementById('memory-play');
const flashText = document.getElementById('memory-flash-text');
const memInput = document.getElementById('memory-input');
const memStartBtn = document.getElementById('btn-memory-start');
const memResetBtn = document.getElementById('btn-memory-reset');
const memLevelBadge = document.getElementById('memory-level');
const memTurnBadge = document.getElementById('memory-turn-indicator');
const memDisplayBox = document.getElementById('memory-display');

let memMode = '';
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
            if (memSequence.length === 0) {
                memSequence = val.split('');
                sfx.success();
                switchPvPTurn();
            } else {
                const expectedPrefix = memSequence.join('');
                if (val.length === expectedPrefix.length + 1 && val.startsWith(expectedPrefix)) {
                    sfx.success();
                    memSequence = val.split('');
                    memDisplayBox.classList.add('glow-green-border');
                    setTimeout(() => memDisplayBox.classList.remove('glow-green-border'), 500);
                    switchPvPTurn();
                } else {
                    applyErrorShake(playView);
                    memDisplayBox.classList.add('glow-red-border');
                    flashText.textContent = `P${memPlayerTurn} MISTAKE! P${memPlayerTurn === 1 ? 2 : 1} WINS!`;
                    flashText.style.color = 'var(--neon-magenta)';
                    memInput.type = 'text';
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
    memPlayerTurn = memPlayerTurn === 1 ? 2 : 1;
    updatePvPTurnUI();

    let sequenceStr = memSequence.join('');
    flashText.textContent = `Player ${prevPlayer} entered: ${sequenceStr}`;
    flashText.style.color = 'var(--neon-green)';
    sfx.success();

    setTimeout(() => {
        flashText.textContent = '*'.repeat(sequenceStr.length);
        setTimeout(() => {
            flashText.textContent = `Player ${memPlayerTurn}, repeat + add 1`;
            flashText.style.color = '#fff';

            memInput.disabled = false;
            memInput.focus();
        }, 1000);

    }, 900);
}

// GAME 2: NEON SKY DODGE
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
    if (dodgeKeys.ArrowLeft || dodgeKeys.a || joystick.x < -0.3) kx = -1;
    if (dodgeKeys.ArrowRight || dodgeKeys.d || joystick.x > 0.3) kx = 1;
    if (dodgeKeys.ArrowUp || dodgeKeys.w || joystick.y < -0.3) ky = -1;
    if (dodgeKeys.ArrowDown || dodgeKeys.s || joystick.y > 0.3) ky = 1;

    let moveX = kx * player.speed;
    let moveY = ky * player.speed;

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



// GAME 3: SEQUENCE RECALL

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
        }, 2000);

    }, 2000);
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
            verifySequence(true);
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


// Clock
setInterval(() => {
    const now = new Date();
    document.getElementById('hud-time').textContent =
        now.toLocaleTimeString();
}, 1000);

// FPS Counter
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



// GAME 4: BALL BREAKER

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
    bctx.fillStyle = '#00f0ff';
    bctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    bctx.beginPath();
    bctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    bctx.fillStyle = '#ff003c';
    bctx.fill();
    bricks.forEach(b => {
        if (b.active) {
            bctx.fillStyle = b.color;
            bctx.fillRect(b.x, b.y, b.w, b.h);
        }
    });
}

function updateBreaker() {
    if (!breakerActive) return;

    if (breakerKeys['ArrowLeft'] || breakerKeys['a']) paddle.x -= 7;
    if (breakerKeys['ArrowRight'] || breakerKeys['d']) paddle.x += 7;
    if (joystick.x < -0.3) paddle.x -= 7;
    if (joystick.x > 0.3) paddle.x += 7;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.w > 600) paddle.x = 600 - paddle.w;

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.r < 0 || ball.x + ball.r > 600) ball.dx *= -1;
    if (ball.y - ball.r < 0) ball.dy *= -1;

    if (ball.y + ball.r >= paddle.y && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
        ball.dy = -Math.abs(ball.dy);
        ball.dx = ((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)) * 5;
        sfx.hover();
    }

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

    if (bricks.every(b => !b.active)) {
        breakerActive = false;
        document.getElementById('breaker-overlay').classList.remove('hidden');
        document.getElementById('breaker-msg').textContent = 'YOU WIN!';
        sfx.win();
    }

    drawBreaker();
    if (breakerActive) breakerAnimId = requestAnimationFrame(updateBreaker);
}

// GAME 5: TERRITORY RUSH
const terrCanvas = document.getElementById('territory-canvas');
const terrCtx = terrCanvas ? terrCanvas.getContext('2d') : null;
const gridSize = 20;

let terrActive = false;
let terrAnimId;
let grid = [];

let playerPos = { x: 5, y: 10 };
let aiPos = { x: 24, y: 10 };

let terrKeys = {};
let p2Input = { dx: 0, dy: 0 };

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

    p2Input = { dx: 0, dy: 0 };

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
    document.getElementById('territory-score-ai').textContent =
        terrMode === 'pve' ? `AI: ${a}` : `P2: ${a}`;

    return { p, a };
}

const btnTerritoryMode = document.getElementById('btn-territory-mode');
const btnTerritoryStart = document.getElementById('btn-territory-start');

if (btnTerritoryMode) {
    btnTerritoryMode.addEventListener('click', () => {
        sfx.click();
        terrMode = terrMode === 'pve' ? 'pvp' : 'pve';
        btnTerritoryMode.textContent = `Mode: ${terrMode === 'pve' ? 'Vs AI' : 'PvP (Joystick)'}`;
        updateTerritoryScore();
    });
}

if (btnTerritoryStart) {
    btnTerritoryStart.addEventListener('click', () => {
        sfx.click();
        startTerritoryGame();
    });
}

function startTerritoryGame() {
    initTerritoryGame();
    document.getElementById('territory-overlay').classList.add('hidden');
    terrActive = true;
    lastMoveTime = Date.now();
    aiLastMoveTime = Date.now();
    terrAnimId = requestAnimationFrame(updateTerritory);
}

function drawTerritory() {
    if (!terrCtx) return;

    terrCtx.clearRect(0, 0, 600, 400);

    for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
            if (grid[i][j] === 1) {
                terrCtx.fillStyle = '#00f0ff';
            } else if (grid[i][j] === 2) {
                terrCtx.fillStyle = '#ff003c';
            } else if (grid[i][j] === 3) {
                terrCtx.fillStyle = '#00ff66';
            } else if (grid[i][j] === 4) {
                terrCtx.fillStyle = '#ffaa00';
            } else {
                terrCtx.fillStyle = 'rgba(255,255,255,0.05)';
            }

            terrCtx.fillRect(i * gridSize, j * gridSize, gridSize - 1, gridSize - 1);
        }
    }

    terrCtx.fillStyle = '#fff';
    terrCtx.fillRect(playerPos.x * gridSize + 4, playerPos.y * gridSize + 4, 12, 12);
    terrCtx.fillRect(aiPos.x * gridSize + 4, aiPos.y * gridSize + 4, 12, 12);
}

function updateTerritory() {
    if (!terrActive) return;

    let now = Date.now();

    // PLAYER 1 

    if (now - lastMoveTime > 80) {
        let moved = false;
        let nextX = playerPos.x;
        let nextY = playerPos.y;

        if ((terrKeys['2'] || terrKeys['ArrowUp'] || (terrMode === 'pve' && joystick.y < -0.3)) && playerPos.y > 0) { nextY--; moved = true; }
        else if ((terrKeys['8'] || terrKeys['ArrowDown'] || (terrMode === 'pve' && joystick.y > 0.3)) && playerPos.y < 19) { nextY++; moved = true; }
        else if ((terrKeys['4'] || terrKeys['ArrowLeft'] || (terrMode === 'pve' && joystick.x < -0.3)) && playerPos.x > 0) { nextX--; moved = true; }
        else if ((terrKeys['6'] || terrKeys['ArrowRight'] || (terrMode === 'pve' && joystick.x > 0.3)) && playerPos.x < 29) { nextX++; moved = true; }

        if (moved) {
            let targetState = grid[nextX][nextY];

            if (targetState === 3) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'P1 TRAIL COLLISION! GAME OVER!';
                sfx.error();
                return;
            }
            if (targetState === 4) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'YOU CUT AI TRAIL! YOU WIN!';
                sfx.win();
                return;
            }

            playerPos.x = nextX;
            playerPos.y = nextY;

            if (targetState === 1) {
                if (playerTrail.length > 2) {
                    fillTerritory(1, 3, playerTrail);
                    sfx.win();
                    if (typeof spawnBurst !== 'undefined') spawnBurst(playerPos.x * gridSize + gridSize / 2, playerPos.y * gridSize + gridSize / 2, 50, '0, 255, 102');
                } else if (playerTrail.length > 0) {
                    for (let t of playerTrail) grid[t.x][t.y] = 1;
                    playerTrail = [];
                }
            } else if (targetState === 0 || targetState === 2) {
                grid[playerPos.x][playerPos.y] = 3;
                playerTrail.push({ x: playerPos.x, y: playerPos.y });
            }

            updateTerritoryScore();
            lastMoveTime = now;
        }
    }

    // PLAYER 2 / AI
    if (terrMode === 'pvp' && now - aiLastMoveTime > 80) {
        let moved = false;
        let nextX = aiPos.x;
        let nextY = aiPos.y;

        if (p2Input.dy === -1 && aiPos.y > 0) { nextY--; moved = true; }
        else if (p2Input.dy === 1 && aiPos.y < 19) { nextY++; moved = true; }
        else if (p2Input.dx === -1 && aiPos.x > 0) { nextX--; moved = true; }
        else if (p2Input.dx === 1 && aiPos.x < 29) { nextX++; moved = true; }

        if (moved) {
            let state = grid[nextX][nextY];

            if (state === 4) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'P2 TRAIL COLLISION! P1 WINS!';
                sfx.win();
                return;
            }
            if (state === 3) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'P2 CUT P1 TRAIL! P2 WINS!';
                sfx.error();
                return;
            }

            aiPos.x = nextX;
            aiPos.y = nextY;

            if (state === 2) {
                if (aiTrail.length > 2) {
                    fillTerritory(2, 4, aiTrail);
                    sfx.win();
                    if (typeof spawnBurst !== 'undefined') spawnBurst(aiPos.x * gridSize + gridSize / 2, aiPos.y * gridSize + gridSize / 2, 50, '255, 0, 60');
                } else if (aiTrail.length > 0) {
                    for (let t of aiTrail) grid[t.x][t.y] = 2;
                    aiTrail = [];
                }
            } else if (state === 0 || state === 1) {
                grid[aiPos.x][aiPos.y] = 4;
                aiTrail.push({ x: aiPos.x, y: aiPos.y });
            }

            updateTerritoryScore();
            aiLastMoveTime = now;
        }
    } else if (terrMode === 'pve' && now - aiLastMoveTime > 90) {
        let nextX = aiPos.x;
        let nextY = aiPos.y;

        let dx = playerPos.x - aiPos.x;
        let dy = playerPos.y - aiPos.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && aiPos.x < 29) nextX++;
            else if (dx < 0 && aiPos.x > 0) nextX--;
        } else {
            if (dy > 0 && aiPos.y < 19) nextY++;
            else if (dy < 0 && aiPos.y > 0) nextY--;
        }
        if (grid[nextX][nextY] === 4) {
            let dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            for (let d of dirs) {
                let nx = aiPos.x + d.x;
                let ny = aiPos.y + d.y;
                if (nx >= 0 && nx < 30 && ny >= 0 && ny < 20 && grid[nx][ny] !== 4) {
                    nextX = nx; nextY = ny; break;
                }
            }
        }

        if (nextX !== aiPos.x || nextY !== aiPos.y) {
            let state = grid[nextX][nextY];

            if (state === 4) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'AI TRAIL COLLISION! P1 WINS!';
                sfx.win();
                return;
            }
            if (state === 3) {
                terrActive = false;
                document.getElementById('territory-overlay').classList.remove('hidden');
                document.getElementById('territory-msg').textContent = 'AI CUT YOUR TRAIL! GAME OVER!';
                sfx.error();
                return;
            }

            aiPos.x = nextX;
            aiPos.y = nextY;

            if (state === 2) {
                if (aiTrail.length > 2) {
                    fillTerritory(2, 4, aiTrail);
                    if (typeof spawnBurst !== 'undefined') spawnBurst(aiPos.x * gridSize + gridSize / 2, aiPos.y * gridSize + gridSize / 2, 50, '255, 0, 60');
                } else if (aiTrail.length > 0) {
                    for (let t of aiTrail) grid[t.x][t.y] = 2;
                    aiTrail = [];
                }
            } else if (state === 0 || state === 1) {
                grid[aiPos.x][aiPos.y] = 4;
                aiTrail.push({ x: aiPos.x, y: aiPos.y });
            }

            updateTerritoryScore();
            aiLastMoveTime = now;
        }
    }

    drawTerritory();
    if (terrActive) terrAnimId = requestAnimationFrame(updateTerritory);
}

// JOYSTICK HANDLER
function updateJoystick(x, y) {
    if (Math.abs(x) < 0.3) x = 0;
    if (Math.abs(y) < 0.3) y = 0;

    if (x === 0 && y === 0) {
        p2Input.dx = 0;
        p2Input.dy = 0;
        return;
    }

    if (Math.abs(x) > Math.abs(y)) {
        p2Input.dx = x > 0 ? 1 : -1;
        p2Input.dy = 0;
    } else {
        p2Input.dy = y > 0 ? 1 : -1;
        p2Input.dx = 0;
    }
}

function fillTerritory(ownerId, trailId, trailArray) {
    let visited = Array.from({ length: 30 }, () => Array(20).fill(false));
    let stack = [];

    for (let i = 0; i < 30; i++) {
        stack.push({ x: i, y: 0 });
        stack.push({ x: i, y: 19 });
    }

    for (let j = 1; j < 19; j++) {
        stack.push({ x: 0, y: j });
        stack.push({ x: 29, y: j });
    }

    while (stack.length) {
        let { x, y } = stack.pop();
        if (x < 0 || y < 0 || x >= 30 || y >= 20) continue;
        if (visited[x][y]) continue;
        if (grid[x][y] === ownerId || grid[x][y] === trailId) continue;

        visited[x][y] = true;

        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x: x, y: y + 1 });
        stack.push({ x: x, y: y - 1 });
    }

    for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
            if (!visited[i][j]) grid[i][j] = ownerId;
        }
    }

    for (let t of trailArray) grid[t.x][t.y] = ownerId;
    trailArray.length = 0;
}

// GAME 7: PRESSURE CORE
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
            if (a.type === 'HOLD') {
                let holdMatch = (coreHeldInput === a.payload);
                if (a.payload === 'UP' && coreHeldInput === '2') holdMatch = true;
                if (a.payload === 'DOWN' && coreHeldInput === '8') holdMatch = true;
                if (a.payload === 'LEFT' && coreHeldInput === '4') holdMatch = true;
                if (a.payload === 'RIGHT' && coreHeldInput === '6') holdMatch = true;

                if (holdMatch) {
                    a.holdProgress += dt;
                    a.el.querySelector('.core-alert-icon').style.transform = `scale(${1 + a.holdProgress / 1000})`;
                    if (a.holdProgress >= 1000) {
                        resolveCoreAlert(a.id, true);
                    }
                    break;
                }
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
        if (a.type === 'DIRECTION') {
            let isMatch = (input === a.payload);
            if (a.payload === 'UP' && input === '2') isMatch = true;
            if (a.payload === 'DOWN' && input === '8') isMatch = true;
            if (a.payload === 'LEFT' && input === '4') isMatch = true;
            if (a.payload === 'RIGHT' && input === '6') isMatch = true;

            if (isMatch) {
                resolveCoreAlert(a.id, true);
                matched = true;
                break;
            }
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
            let dirMatch = (input === a.payload.dir);
            if (a.payload.dir === 'UP' && input === '2') dirMatch = true;
            if (a.payload.dir === 'DOWN' && input === '8') dirMatch = true;
            if (a.payload.dir === 'LEFT' && input === '4') dirMatch = true;
            if (a.payload.dir === 'RIGHT' && input === '6') dirMatch = true;

            if (a.step === 0 && dirMatch) {
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
            let holdMatch = (input === a.payload);
            if (a.payload === 'UP' && input === '2') holdMatch = true;
            if (a.payload === 'DOWN' && input === '8') holdMatch = true;
            if (a.payload === 'LEFT' && input === '4') holdMatch = true;
            if (a.payload === 'RIGHT' && input === '6') holdMatch = true;

            if (holdMatch) {
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

// NEURO GAME: MEMORY FOCUS
const neuroMemoryGrid = document.getElementById('neuro-memory-grid');
const btnNeuroMemoryStart = document.getElementById('btn-neuro-memory-start');
const neuroMemoryMovesBadge = document.getElementById('neuro-memory-moves');
const neuroMemoryMatchesBadge = document.getElementById('neuro-memory-matches');

const memoryEmojis = ['🌿', '💧', '☁️', '🌙', '✨', '🌸'];
let memoryCards = [];
let memoryFlipped = [];
let memoryMatches = 0;
let memoryMoves = 0;
let memoryLock = false;

function initNeuroMemory() {
    if (!neuroMemoryGrid) return;
    neuroMemoryGrid.innerHTML = '';
    memoryFlipped = [];
    memoryMatches = 0;
    memoryMoves = 0;
    memoryLock = false;
    updateMemoryStats();

    memoryCards = [...memoryEmojis, ...memoryEmojis];
    memoryCards.sort(() => Math.random() - 0.5);

    memoryCards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.className = 'neuro-card';
        card.dataset.emoji = emoji;
        card.dataset.index = index;

        card.innerHTML = `
            <div class="neuro-card-front"></div>
            <div class="neuro-card-back">${emoji}</div>
        `;

        card.addEventListener('click', () => flipNeuroCard(card));
        neuroMemoryGrid.appendChild(card);
    });
}

function flipNeuroCard(card) {
    if (memoryLock || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    card.classList.add('flipped');
    memoryFlipped.push(card);
    sfx.click();

    if (memoryFlipped.length === 2) {
        memoryMoves++;
        memoryLock = true;
        updateMemoryStats();

        const [card1, card2] = memoryFlipped;
        if (card1.dataset.emoji === card2.dataset.emoji) {
            setTimeout(() => {
                card1.classList.add('matched');
                card2.classList.add('matched');
                memoryMatches++;
                updateMemoryStats();
                sfx.success();
                memoryFlipped = [];
                memoryLock = false;

                if (memoryMatches === 6) {
                    sfx.win();
                    btnNeuroMemoryStart.textContent = "Restart Focus";
                }
            }, 500);
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                sfx.error();
                memoryFlipped = [];
                memoryLock = false;
            }, 1000);
        }
    }
}

function updateMemoryStats() {
    if (neuroMemoryMovesBadge) neuroMemoryMovesBadge.textContent = `Moves: ${memoryMoves}`;
    if (neuroMemoryMatchesBadge) neuroMemoryMatchesBadge.textContent = `Matches: ${memoryMatches}/6`;
}

if (btnNeuroMemoryStart) {
    btnNeuroMemoryStart.addEventListener('click', () => {
        sfx.click();
        initNeuroMemory();
        btnNeuroMemoryStart.textContent = "Restart Focus";
    });
}

// NEURO GAME: CALM FLOW
const flowCanvas = document.getElementById('neuro-flow-canvas');
const flowCtx = flowCanvas ? flowCanvas.getContext('2d') : null;
const flowOverlay = document.getElementById('neuro-flow-overlay');
const flowMsg = document.getElementById('neuro-flow-msg');
const btnFlowStart = document.getElementById('btn-neuro-flow-start');
const flowScoreBadge = document.getElementById('neuro-flow-score');

let flowActive = false;
let flowAnimId;
let flowScore = 0;
let flowBubbles = [];
let flowLastTime = 0;
let flowSpawnTimer = 0;
let flowTargetSize = 50;
let flowBreathePhase = 0;

function initNeuroFlow() {
    flowActive = false;
    cancelAnimationFrame(flowAnimId);
    flowScore = 0;
    flowBubbles = [];
    if (flowScoreBadge) flowScoreBadge.textContent = `Clarity: ${flowScore}`;

    if (flowOverlay) {
        flowOverlay.classList.remove('hidden');
        flowMsg.innerHTML = "Breathe deeply.<br>Click to start.";
    }
    drawFlowFrame(0);
}

if (btnFlowStart) {
    btnFlowStart.addEventListener('click', () => {
        sfx.click();
        if (flowOverlay) flowOverlay.classList.add('hidden');
        flowScore = 0;
        flowBubbles = [];
        if (flowScoreBadge) flowScoreBadge.textContent = `Clarity: ${flowScore}`;
        flowActive = true;
        flowLastTime = performance.now();
        flowAnimId = requestAnimationFrame(updateNeuroFlow);
    });
}

function spawnFlowBubble() {
    const radius = Math.random() * 20 + 15;
    flowBubbles.push({
        x: Math.random() * (600 - radius * 2) + radius,
        y: 400 + radius,
        radius: radius,
        speed: Math.random() * 0.5 + 0.2,
        drift: (Math.random() - 0.5) * 0.5,
        opacity: 0,
        popped: false,
        popScale: 1
    });
}

function updateNeuroFlow(time) {
    if (!flowActive) return;

    const dt = time - flowLastTime;
    flowLastTime = time;

    flowSpawnTimer += dt;
    if (flowSpawnTimer > 1500) {
        spawnFlowBubble();
        flowSpawnTimer = 0;
    }

    flowBreathePhase += dt * 0.0005;

    for (let i = flowBubbles.length - 1; i >= 0; i--) {
        const b = flowBubbles[i];
        if (b.popped) {
            b.popScale += 0.05;
            b.opacity -= 0.05;
            if (b.opacity <= 0) flowBubbles.splice(i, 1);
        } else {
            b.y -= b.speed;
            b.x += b.drift;
            if (b.opacity < 0.6) b.opacity += 0.01;

            if (b.y + b.radius < 0) {
                flowBubbles.splice(i, 1);
            }
        }
    }

    drawFlowFrame(flowBreathePhase);

    if (flowActive) flowAnimId = requestAnimationFrame(updateNeuroFlow);
}

function drawFlowFrame(phase) {
    if (!flowCtx) return;
    flowCtx.clearRect(0, 0, 600, 400);

    const breatheScale = Math.sin(phase) * 20;
    const centerGradient = flowCtx.createRadialGradient(300, 200, 0, 300, 200, 150 + breatheScale);
    centerGradient.addColorStop(0, 'rgba(0, 240, 255, 0.05)');
    centerGradient.addColorStop(1, 'transparent');

    flowCtx.fillStyle = centerGradient;
    flowCtx.fillRect(0, 0, 600, 400);

    flowBubbles.forEach(b => {
        flowCtx.beginPath();
        flowCtx.arc(b.x, b.y, b.radius * (b.popped ? b.popScale : 1), 0, Math.PI * 2);

        const grad = flowCtx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, 0, b.x, b.y, b.radius);
        if (b.popped) {
            grad.addColorStop(0, `rgba(255, 255, 255, ${b.opacity})`);
            grad.addColorStop(1, `rgba(0, 240, 255, 0)`);
        } else {
            grad.addColorStop(0, `rgba(255, 255, 255, ${b.opacity * 0.8})`);
            grad.addColorStop(1, `rgba(168, 218, 220, ${b.opacity * 0.2})`);

            flowCtx.strokeStyle = `rgba(255, 255, 255, ${b.opacity * 0.5})`;
            flowCtx.lineWidth = 1;
            flowCtx.stroke();
        }

        flowCtx.fillStyle = grad;
        flowCtx.fill();
    });
}

if (flowCanvas) {
    flowCanvas.addEventListener('mousedown', (e) => {
        if (!flowActive) return;
        const rect = flowCanvas.getBoundingClientRect();
        const scaleX = flowCanvas.width / rect.width;
        const scaleY = flowCanvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        let poppedAny = false;
        for (let i = flowBubbles.length - 1; i >= 0; i--) {
            const b = flowBubbles[i];
            if (!b.popped) {
                const dist = Math.hypot(b.x - x, b.y - y);
                if (dist <= b.radius) {
                    b.popped = true;
                    poppedAny = true;
                    flowScore++;
                    if (flowScoreBadge) flowScoreBadge.textContent = `Clarity: ${flowScore}`;
                    sfx.hover();
                }
            }
        }
        if (!poppedAny) {
        }
    });
}

window.addEventListener('keydown', (e) => {
    breakerKeys[e.key] = true;
    terrKeys[e.key] = true;

    const theme = document.body.getAttribute('data-theme');

    if (e.code === 'Space' && theme === 'reaction') {
        e.preventDefault();
        handleReactionAction();
    }

    // Pressure Core keyboard mapping
    if (theme === 'pressure') {
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

    // Zen Balance keyboard mapping
    if (theme === 'neuro-balance' && typeof neuroBalanceState !== 'undefined' && neuroBalanceState === 'playing') {
        let handled = false;
        if (e.key === 'ArrowLeft' || e.key === 'a') { balanceKeys.left = true; handled = true; }
        if (e.key === 'ArrowRight' || e.key === 'd') { balanceKeys.right = true; handled = true; }
        if (e.key === 'ArrowUp' || e.key === 'w') { balanceKeys.up = true; handled = true; }
        if (e.key === 'ArrowDown' || e.key === 's') { balanceKeys.down = true; handled = true; }

        if (handled) {
            e.preventDefault();
        }
    }
});
window.addEventListener('keyup', (e) => {
    breakerKeys[e.key] = false;
    terrKeys[e.key] = false;

    const theme = document.body.getAttribute('data-theme');
    if (theme === 'pressure') {
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

    if (theme === 'neuro-balance') {
        if (e.key === 'ArrowLeft' || e.key === 'a') balanceKeys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') balanceKeys.right = false;
        if (e.key === 'ArrowUp' || e.key === 'w') balanceKeys.up = false;
        if (e.key === 'ArrowDown' || e.key === 's') balanceKeys.down = false;
    }
});


function handleESPInput(key) {

    const theme = document.body.getAttribute('data-theme');

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
                initDodgeGame();
            }
        }

        if (theme === 'territory') {
            if (!terrActive) {
                startTerritoryGame();
            }
        }

        if (theme === 'sequence') {
            verifySequence(false);
        }

        if (theme === 'reaction') {
            handleReactionAction();
        }

        return;
    }
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

    if (theme === 'memory') {
        if (/^\d$/.test(key) && (memMode === 'pvc' || memMode === 'pvp') && !memInput.disabled) {
            memInput.value += key;
        }
    }

    if (theme === 'dodge') {
        if (key === '5') player.boost = 2.5;
        if (key === '0') dodgeSpeedLevel = Math.max(0.5, dodgeSpeedLevel - 0.2);

        if (key === '4' || key === 'LEFT') dodgeKeys['ArrowLeft'] = true;
        if (key === '6' || key === 'RIGHT') dodgeKeys['ArrowRight'] = true;
        if (key === '2' || key === 'UP') dodgeKeys['ArrowUp'] = true;
        if (key === '8' || key === 'DOWN') dodgeKeys['ArrowDown'] = true;

        setTimeout(() => {
            dodgeKeys['ArrowLeft'] = false;
            dodgeKeys['ArrowRight'] = false;
            dodgeKeys['ArrowUp'] = false;
            dodgeKeys['ArrowDown'] = false;
        }, 150);
    }

    if (theme === 'sequence') {
        if (/^\d$/.test(key)) {
            seqInput.value += key;
        }
    }

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
        if (key === '4') terrKeys['4'] = true;
        if (key === '6') terrKeys['6'] = true;
        if (key === '2') terrKeys['2'] = true;
        if (key === '8') terrKeys['8'] = true;

        if (key === 'LEFT') terrKeys['ArrowLeft'] = true;
        if (key === 'RIGHT') terrKeys['ArrowRight'] = true;
        if (key === 'UP') terrKeys['ArrowUp'] = true;
        if (key === 'DOWN') terrKeys['ArrowDown'] = true;

        setTimeout(() => {
            if (key === '4') terrKeys['4'] = false;
            if (key === '6') terrKeys['6'] = false;
            if (key === '2') terrKeys['2'] = false;
            if (key === '8') terrKeys['8'] = false;

            if (key === 'LEFT') terrKeys['ArrowLeft'] = false;
            if (key === 'RIGHT') terrKeys['ArrowRight'] = false;
            if (key === 'UP') terrKeys['ArrowUp'] = false;
            if (key === 'DOWN') terrKeys['ArrowDown'] = false;
        }, 150);
    }

    // 🧭 NEURO DIRECTION
    if (theme === 'neuro-direction') {
        if (key === 'UP' || key === '2') handleDirInput('⬆️');
        if (key === 'DOWN' || key === '8') handleDirInput('⬇️');
        if (key === 'LEFT' || key === '4') handleDirInput('⬅️');
        if (key === 'RIGHT' || key === '6') handleDirInput('➡️');
    }

    // 🛤️ NEURO MAZE
    if (theme === 'neuro-maze' && mazeActive) {
        const eventMap = {
            'UP': 'ArrowUp', '2': 'ArrowUp',
            'DOWN': 'ArrowDown', '8': 'ArrowDown',
            'LEFT': 'ArrowLeft', '4': 'ArrowLeft',
            'RIGHT': 'ArrowRight', '6': 'ArrowRight'
        };
        if (eventMap[key]) {
            const event = new KeyboardEvent('keydown', { key: eventMap[key] });
            window.dispatchEvent(event);
        }
    }

    // 🎵 NEURO PATTERN
    if (theme === 'neuro-pattern' && patternActive) {
        if (key === '#') {
            handlePatternClick();
        }
    }

    // 🖱️ VIRTUAL CURSOR (ESP Keypad)
    const needsCursor = ['neuro-matrix', 'neuro-pathway', 'neuro-filter', 'neuro-color'].includes(theme);
    if (needsCursor && window.virtualCursor) {
        let vx = 0, vy = 0;
        if (key === '4' || key === 'LEFT') vx = -30;
        if (key === '6' || key === 'RIGHT') vx = 30;
        if (key === '2' || key === 'UP') vy = -30;
        if (key === '8' || key === 'DOWN') vy = 30;

        if (vx !== 0 || vy !== 0) {
            window.vcX += vx;
            window.vcY += vy;
            window.vcX = Math.max(0, Math.min(window.innerWidth, window.vcX));
            window.vcY = Math.max(0, Math.min(window.innerHeight, window.vcY));
            window.virtualCursor.style.transform = `translate(${window.vcX}px, ${window.vcY}px)`;
        }

        if (key === '#') {
            const el = document.elementFromPoint(window.vcX, window.vcY);
            if (el) {
                window.virtualCursor.style.background = '#fff';
                setTimeout(() => window.virtualCursor.style.background = 'rgba(168, 218, 220, 0.8)', 150);
                const clickEvent = new MouseEvent('click', {
                    view: window, bubbles: true, cancelable: true,
                    clientX: window.vcX, clientY: window.vcY
                });
                el.dispatchEvent(clickEvent);
            }
        }
    }

    // Neuro balance for ESP Keypad
    if (theme === 'neuro-balance' && typeof neuroBalanceState !== 'undefined' && neuroBalanceState === 'playing') {
        if (key === '4' || key === 'LEFT') balanceKeys.left = true;
        if (key === '6' || key === 'RIGHT') balanceKeys.right = true;
        if (key === '2' || key === 'UP') balanceKeys.up = true;
        if (key === '8' || key === 'DOWN') balanceKeys.down = true;

        setTimeout(() => {
            if (key === '4' || key === 'LEFT') balanceKeys.left = false;
            if (key === '6' || key === 'RIGHT') balanceKeys.right = false;
            if (key === '2' || key === 'UP') balanceKeys.up = false;
            if (key === '8' || key === 'DOWN') balanceKeys.down = false;
        }, 150);
    }
}


function handleJoystick() {
    const theme = document.body.getAttribute('data-theme');

    let jx = 0;
    let jy = 0;

    if (joystick.x < -0.3) jx = -1;
    else if (joystick.x > 0.3) jx = 1;

    if (joystick.y < -0.3) jy = -1;
    else if (joystick.y > 0.3) jy = 1;

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
        if (jx === -1) dodgeKeys['ArrowLeft'] = true;
        if (jx === 1) dodgeKeys['ArrowRight'] = true;
        if (jy === -1) dodgeKeys['ArrowUp'] = true;
        if (jy === 1) dodgeKeys['ArrowDown'] = true;

        setTimeout(() => {
            dodgeKeys['ArrowLeft'] = false;
            dodgeKeys['ArrowRight'] = false;
            dodgeKeys['ArrowUp'] = false;
            dodgeKeys['ArrowDown'] = false;
        }, 100);
    }

    // 🎮 BALL BREAKER
    if (theme === 'breaker') {
        if (jx === -1) paddle.x -= 7;
        if (jx === 1) paddle.x += 7;
    }

    // 🎮 TERRITORY
    if (theme === 'territory') {
        if (typeof terrMode !== 'undefined' && terrMode === 'pvp') {
            updateJoystick(joystick.x, joystick.y);
        }
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

    // 🧭 NEURO DIRECTION
    if (theme === 'neuro-direction') {
        let input = null;
        if (jx === -1) input = '⬅️';
        else if (jx === 1) input = '➡️';
        else if (jy === -1) input = '⬆️';
        else if (jy === 1) input = '⬇️';

        if (input && input !== joystick.dirLastInput) {
            handleDirInput(input);
        }
        joystick.dirLastInput = input;
    }

    // 🛤️ NEURO MAZE
    if (theme === 'neuro-maze' && mazeActive) {
        let inputKey = null;
        if (jx === -1) inputKey = 'ArrowLeft';
        else if (jx === 1) inputKey = 'ArrowRight';
        else if (jy === -1) inputKey = 'ArrowUp';
        else if (jy === 1) inputKey = 'ArrowDown';

        if (inputKey && inputKey !== joystick.mazeLastInput) {
            const event = new KeyboardEvent('keydown', { key: inputKey });
            window.dispatchEvent(event);
        }
        joystick.mazeLastInput = inputKey;
    }

    const needsCursor = ['neuro-matrix', 'neuro-pathway', 'neuro-filter', 'neuro-color'].includes(theme);
    if (needsCursor) {
        if (!window.virtualCursor) {
            window.virtualCursor = document.createElement('div');
            window.virtualCursor.id = 'virtual-cursor';
            window.virtualCursor.style.position = 'fixed';
            window.virtualCursor.style.width = '20px';
            window.virtualCursor.style.height = '20px';
            window.virtualCursor.style.background = 'rgba(168, 218, 220, 0.8)';
            window.virtualCursor.style.borderRadius = '50%';
            window.virtualCursor.style.pointerEvents = 'none';
            window.virtualCursor.style.zIndex = '100000';
            window.virtualCursor.style.boxShadow = '0 0 10px var(--neon-cyan)';
            window.virtualCursor.style.transition = 'transform 0.1s';
            document.body.appendChild(window.virtualCursor);
            window.vcX = window.innerWidth / 2;
            window.vcY = window.innerHeight / 2;
        }

        window.vcX += jx * 12;
        window.vcY += jy * 12;
        window.vcX = Math.max(0, Math.min(window.innerWidth, window.vcX));
        window.vcY = Math.max(0, Math.min(window.innerHeight, window.vcY));
        window.virtualCursor.style.transform = `translate(${window.vcX}px, ${window.vcY}px)`;

        if (joystick.btn === 0 && !joystick.btnLastState) {

            const el = document.elementFromPoint(window.vcX, window.vcY);
            if (el) {
                window.virtualCursor.style.background = '#fff';
                setTimeout(() => window.virtualCursor.style.background = 'rgba(168, 218, 220, 0.8)', 150);

                const clickEvent = new MouseEvent('click', {
                    view: window, bubbles: true, cancelable: true,
                    clientX: window.vcX, clientY: window.vcY
                });
                el.dispatchEvent(clickEvent);
            }
        }
    } else {
        if (window.virtualCursor) {
            window.virtualCursor.remove();
            window.virtualCursor = null;
        }
    }

}

// NEURO BACKGROUND ANIMATION
const neuroBgCanvas = document.getElementById('neuro-bg-canvas');
const neuroBgCtx = neuroBgCanvas ? neuroBgCanvas.getContext('2d') : null;
let neuroParticles = [];
let neuroBgAnimFrame;
let neuroBgActive = false;

function resizeNeuroBg() {
    if (!neuroBgCanvas) return;
    neuroBgCanvas.width = window.innerWidth;
    neuroBgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeNeuroBg);
resizeNeuroBg();

function startNeuroBg() {
    if (neuroBgActive) return;
    neuroBgActive = true;
    if (neuroParticles.length === 0) {
        for (let i = 0; i < 80; i++) {
            neuroParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1
            });
        }
    }
    animateNeuroBg();
}

function stopNeuroBg() {
    neuroBgActive = false;
    cancelAnimationFrame(neuroBgAnimFrame);
}

function animateNeuroBg() {
    if (!neuroBgActive || !neuroBgCtx) return;
    neuroBgCtx.clearRect(0, 0, neuroBgCanvas.width, neuroBgCanvas.height);

    const time = Date.now() * 0.0005;
    const gradient = neuroBgCtx.createLinearGradient(
        Math.sin(time) * 100, Math.cos(time) * 100,
        neuroBgCanvas.width + Math.cos(time) * 100, neuroBgCanvas.height + Math.sin(time) * 100
    );
    gradient.addColorStop(0, 'rgba(15, 17, 35, 1)');
    gradient.addColorStop(0.5, 'rgba(30, 35, 60, 1)');
    gradient.addColorStop(1, 'rgba(15, 17, 35, 1)');
    neuroBgCtx.fillStyle = gradient;
    neuroBgCtx.fillRect(0, 0, neuroBgCanvas.width, neuroBgCanvas.height);

    neuroBgCtx.fillStyle = 'rgba(168, 218, 220, 0.6)';
    neuroBgCtx.strokeStyle = 'rgba(168, 218, 220, 0.15)';

    for (let i = 0; i < neuroParticles.length; i++) {
        let p = neuroParticles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > neuroBgCanvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > neuroBgCanvas.height) p.vy *= -1;

        neuroBgCtx.beginPath();
        neuroBgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        neuroBgCtx.fill();

        for (let j = i + 1; j < neuroParticles.length; j++) {
            let p2 = neuroParticles[j];
            let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 120) {
                neuroBgCtx.beginPath();
                neuroBgCtx.moveTo(p.x, p.y);
                neuroBgCtx.lineTo(p2.x, p2.y);
                neuroBgCtx.stroke();
            }
        }
    }

    neuroBgAnimFrame = requestAnimationFrame(animateNeuroBg);
}
// NEURO GAME: DIRECTION RECALL

const dirDisplay = document.getElementById('neuro-direction-display');
const dirOverlay = document.getElementById('neuro-direction-overlay');
const btnDirStart = document.getElementById('btn-neuro-direction-start');
const dirLevelBadge = document.getElementById('neuro-direction-level');

let dirSequence = [];
let dirPlayerInput = [];
let dirActive = false;
let dirLevel = 1;

function initNeuroDirection() {
    dirActive = false;
    dirSequence = [];
    dirPlayerInput = [];
    dirLevel = 1;
    if (dirLevelBadge) dirLevelBadge.textContent = 'Level: 1';
    if (dirOverlay) {
        dirOverlay.classList.remove('hidden');
        document.getElementById('neuro-direction-msg').textContent = 'Memorize the directions.';
    }
    if (dirDisplay) dirDisplay.textContent = '--';
    if (btnDirStart) {
        btnDirStart.classList.remove('hidden');
        btnDirStart.textContent = 'Start Sequence';
    }
}

if (btnDirStart) {
    btnDirStart.addEventListener('click', () => {
        sfx.neuroClick();
        if (dirOverlay) dirOverlay.classList.add('hidden');
        btnDirStart.classList.add('hidden');
        nextDirLevel();
    });
}

function nextDirLevel() {
    dirActive = false;
    dirPlayerInput = [];
    const dirs = ['⬆️', '⬇️', '⬅️', '➡️'];
    dirSequence.push(dirs[Math.floor(Math.random() * dirs.length)]);
    if (dirLevelBadge) dirLevelBadge.textContent = `Level: ${dirLevel}`;

    let i = 0;
    dirDisplay.textContent = 'Get Ready';
    setTimeout(() => {
        const interval = setInterval(() => {
            if (i >= dirSequence.length) {
                clearInterval(interval);
                dirDisplay.textContent = 'Your Turn';
                dirDisplay.style.color = '#fff';
                dirActive = true;
                return;
            }
            dirDisplay.textContent = dirSequence[i];
            dirDisplay.style.color = 'var(--neon-cyan)';
            sfx.neuroHover();
            setTimeout(() => { dirDisplay.textContent = ''; }, 600);
            i++;
        }, 1000);
    }, 1000);
}

let lastDirInputTime = 0;

function handleDirInput(dirIcon) {
    if (!dirActive) return;
    if (Date.now() - lastDirInputTime < 300) return;
    lastDirInputTime = Date.now();

    dirPlayerInput.push(dirIcon);
    dirDisplay.textContent = dirIcon;
    dirDisplay.style.color = 'var(--neon-green)';

    const currentIndex = dirPlayerInput.length - 1;
    if (dirPlayerInput[currentIndex] !== dirSequence[currentIndex]) {
        sfx.neuroError();
        dirActive = false;
        applyErrorShake(dirDisplay);
        dirDisplay.textContent = 'Failed';
        dirDisplay.style.color = 'var(--neon-magenta)';
        btnDirStart.classList.remove('hidden');
        btnDirStart.textContent = 'Restart';
        dirLevel = 1;
        dirSequence = [];
    } else {
        sfx.neuroClick();
        if (dirPlayerInput.length === dirSequence.length) {
            dirActive = false;
            sfx.neuroSuccess();
            dirDisplay.textContent = 'Perfect!';
            dirLevel++;
            setTimeout(nextDirLevel, 1500);
        }
    }
}

// Keyboard/ESP support for Direction Recall
window.addEventListener('keydown', (e) => {
    if (document.body.getAttribute('data-theme') === 'neuro-direction') {
        if (e.key === 'ArrowUp' || e.key === '2') handleDirInput('⬆️');
        if (e.key === 'ArrowDown' || e.key === '8') handleDirInput('⬇️');
        if (e.key === 'ArrowLeft' || e.key === '4') handleDirInput('⬅️');
        if (e.key === 'ArrowRight' || e.key === '6') handleDirInput('➡️');
    }
});

// NEURO GAME: COGNITIVE MAZE
const mazeCanvas = document.getElementById('neuro-maze-canvas');
const mctx = mazeCanvas ? mazeCanvas.getContext('2d') : null;
const mazeOverlay = document.getElementById('neuro-maze-overlay');
const btnMazeStart = document.getElementById('btn-neuro-maze-start');
const mazeLevelBadge = document.getElementById('neuro-maze-level');

let mazeActive = false;
let mazeLevel = 1;
let mazeGrid = [];
let mazePlayer = { x: 0, y: 0 };
let mazeEnd = { x: 9, y: 9 };
let mazeVisible = true;

function initNeuroMaze() {
    mazeActive = false;
    mazeLevel = 1;
    mazeVisible = true;
    if (mazeLevelBadge) mazeLevelBadge.textContent = 'Level: 1';
    if (mazeOverlay) {
        mazeOverlay.classList.remove('hidden');
        document.getElementById('neuro-maze-msg').textContent = 'Memorize the path, then navigate.';
    }
    if (btnMazeStart) {
        btnMazeStart.classList.remove('hidden');
        btnMazeStart.textContent = 'Generate Maze';
    }
    if (mctx) mctx.clearRect(0, 0, 600, 400);
}

if (btnMazeStart) {
    btnMazeStart.addEventListener('click', () => {
        sfx.neuroClick();
        if (mazeOverlay) mazeOverlay.classList.add('hidden');
        btnMazeStart.classList.add('hidden');
        generateMaze();
    });
}

function generateMaze() {
    mazeGrid = Array.from({ length: 10 }, () => Array(10).fill(0));
    let obstaclesCount = Math.min(40, mazeLevel * 5);
    for (let i = 0; i < obstaclesCount; i++) {
        let ox = Math.floor(Math.random() * 10);
        let oy = Math.floor(Math.random() * 10);
        if ((ox === 0 && oy === 0) || (ox === 9 && oy === 9)) continue;
        mazeGrid[oy][ox] = 1;
    }
    mazePlayer = { x: 0, y: 0 };
    mazeVisible = true;
    drawMaze();

    setTimeout(() => {
        mazeVisible = false;
        mazeActive = true;
        drawMaze();
    }, Math.max(1000, 4000 - (mazeLevel * 200)));
}

function drawMaze() {
    if (!mctx) return;
    mctx.clearRect(0, 0, 600, 400);
    const cellSize = 40;
    const offsetX = 100;

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            if (mazeGrid[y][x] === 1 && mazeVisible) {
                mctx.fillStyle = 'rgba(168, 218, 220, 0.4)';
                mctx.fillRect(offsetX + x * cellSize, y * cellSize, cellSize, cellSize);
            }
            mctx.strokeStyle = 'rgba(255,255,255,0.1)';
            mctx.strokeRect(offsetX + x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    mctx.fillStyle = 'var(--neon-green)';
    mctx.beginPath();
    mctx.arc(offsetX + mazePlayer.x * cellSize + cellSize / 2, mazePlayer.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    mctx.fill();

    if (mazeVisible) {
        mctx.fillStyle = 'var(--neon-magenta)';
        mctx.fillRect(offsetX + mazeEnd.x * cellSize + 10, mazeEnd.y * cellSize + 10, cellSize - 20, cellSize - 20);
    }
}

window.addEventListener('keydown', (e) => {
    if (document.body.getAttribute('data-theme') === 'neuro-maze' && mazeActive) {
        let nx = mazePlayer.x;
        let ny = mazePlayer.y;
        if (e.key === 'ArrowUp' || e.key === '2') ny--;
        if (e.key === 'ArrowDown' || e.key === '8') ny++;
        if (e.key === 'ArrowLeft' || e.key === '4') nx--;
        if (e.key === 'ArrowRight' || e.key === '6') nx++;

        if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
            if (mazeGrid[ny][nx] === 1) {
                sfx.neuroError();
                mazeVisible = true;
                mazeActive = false;
                drawMaze();
                setTimeout(() => {
                    btnMazeStart.classList.remove('hidden');
                    btnMazeStart.textContent = 'Restart Maze';
                    mazeLevel = 1;
                }, 1000);
            } else {
                mazePlayer.x = nx;
                mazePlayer.y = ny;
                sfx.neuroHover();
                drawMaze();
                if (nx === 9 && ny === 9) {
                    sfx.neuroSuccess();
                    mazeVisible = true;
                    mazeActive = false;
                    drawMaze();
                    mazeLevel++;
                    if (mazeLevelBadge) mazeLevelBadge.textContent = `Level: ${mazeLevel}`;
                    setTimeout(generateMaze, 1500);
                }
            }
        }
    }
});

// NEURO GAME: PATTERN SYNC
const btnPatternStart = document.getElementById('btn-neuro-pattern-start');
const patternPad = document.getElementById('neuro-pattern-pad');
const patternOverlay = document.getElementById('neuro-pattern-overlay');
const patternScoreBadge = document.getElementById('neuro-pattern-score');

let patternActive = false;
let patternScore = 0;
let patternSequence = [];
let patternUserClicks = [];
let patternPlaybackTime = 0;

function initNeuroPattern() {
    patternActive = false;
    patternScore = 0;
    patternSequence = [];
    if (patternScoreBadge) patternScoreBadge.textContent = `Score: 0`;
    if (patternOverlay) patternOverlay.classList.remove('hidden');
    if (btnPatternStart) btnPatternStart.classList.remove('hidden');
}

if (btnPatternStart) {
    btnPatternStart.addEventListener('click', () => {
        sfx.neuroClick();
        if (patternOverlay) patternOverlay.classList.add('hidden');
        btnPatternStart.classList.add('hidden');
        nextPatternRound();
    });
}

function nextPatternRound() {
    patternActive = false;
    patternUserClicks = [];
    const len = 3 + Math.floor(patternScore / 2);
    patternSequence = [];
    let currentTime = 500;
    for (let i = 0; i < len; i++) {
        patternSequence.push(currentTime);
        currentTime += 400 + Math.random() * 800;
    }

    patternSequence.forEach((time, index) => {
        setTimeout(() => {
            sfx.neuroHover();
            if (patternPad) {
                patternPad.style.background = 'var(--neon-cyan)';
                setTimeout(() => { patternPad.style.background = 'transparent'; }, 150);
            }
            if (index === patternSequence.length - 1) {
                setTimeout(() => { patternActive = true; }, 300);
            }
        }, time);
    });
}

if (patternPad) {
    patternPad.addEventListener('click', handlePatternClick);
}

function handlePatternClick() {
    if (!patternActive) return;
    sfx.neuroClick();
    patternPad.style.background = 'var(--neon-green)';
    setTimeout(() => { patternPad.style.background = 'transparent'; }, 100);

    patternUserClicks.push(Date.now());
    if (patternUserClicks.length === patternSequence.length) {
        sfx.neuroSuccess();
        patternScore++;
        if (patternScoreBadge) patternScoreBadge.textContent = `Score: ${patternScore}`;
        patternActive = false;
        setTimeout(nextPatternRound, 1500);
    }
}

window.addEventListener('keydown', (e) => {
    if (document.body.getAttribute('data-theme') === 'neuro-pattern' && patternActive) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === '#') {
            handlePatternClick();
        }
    }
});

// NEURO GAME: COLOR ASSOCIATION
const btnColorStart = document.getElementById('btn-neuro-color-start');
const colorOverlay = document.getElementById('neuro-color-overlay');
const colorScoreBadge = document.getElementById('neuro-color-score');
const colorTimeBadge = document.getElementById('neuro-color-time');
const colorTarget = document.getElementById('neuro-color-target');
const colorRule = document.getElementById('neuro-color-rule');
const colorOptionsBox = document.getElementById('neuro-color-options');

let colorActive = false;
let colorScore = 0;
let colorTime = 30;
let colorTimerInt;
let currentColorCorrect = '';

const colorWords = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE'];
const colorHex = ['#ff003c', '#00f0ff', '#00ff66', '#ffaa00', '#cdb4db'];

function initNeuroColor() {
    colorActive = false;
    colorScore = 0;
    colorTime = 30;
    clearInterval(colorTimerInt);
    if (colorScoreBadge) colorScoreBadge.textContent = 'Score: 0';
    if (colorTimeBadge) colorTimeBadge.textContent = 'Time: 30s';
    if (colorOverlay) colorOverlay.classList.remove('hidden');
    if (btnColorStart) btnColorStart.classList.remove('hidden');
    if (colorOptionsBox) colorOptionsBox.innerHTML = '';
}

if (btnColorStart) {
    btnColorStart.addEventListener('click', () => {
        sfx.neuroClick();
        if (colorOverlay) colorOverlay.classList.add('hidden');
        btnColorStart.classList.add('hidden');
        startColorGame();
    });
}

function startColorGame() {
    colorActive = true;
    colorTime = 30;
    colorScore = 0;
    nextColorRound();
    colorTimerInt = setInterval(() => {
        colorTime--;
        if (colorTimeBadge) colorTimeBadge.textContent = `Time: ${colorTime}s`;
        if (colorTime <= 0) {
            clearInterval(colorTimerInt);
            colorActive = false;
            sfx.neuroError();
            if (colorOverlay) {
                colorOverlay.classList.remove('hidden');
                document.getElementById('neuro-color-msg').textContent = 'Time Up!';
            }
            if (btnColorStart) {
                btnColorStart.classList.remove('hidden');
                btnColorStart.textContent = 'Play Again';
            }
        }
    }, 1000);
}

function nextColorRound() {
    if (!colorActive) return;
    const isTextRule = Math.random() > 0.5;
    colorRule.textContent = isTextRule ? "Match the TEXT MEANING" : "Match the TEXT COLOR";

    const wordIdx = Math.floor(Math.random() * colorWords.length);
    const styleIdx = Math.floor(Math.random() * colorHex.length);

    colorTarget.textContent = colorWords[wordIdx];
    colorTarget.style.color = colorHex[styleIdx];

    currentColorCorrect = isTextRule ? colorWords[wordIdx] : colorWords[styleIdx];

    colorOptionsBox.innerHTML = '';

    let options = [...colorWords];
    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn glow-btn neuro-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
            if (!colorActive) return;
            if (opt === currentColorCorrect) {
                sfx.neuroSuccess();
                colorScore++;
                if (colorScoreBadge) colorScoreBadge.textContent = `Score: ${colorScore}`;
                nextColorRound();
            } else {
                sfx.neuroError();
                colorTime = Math.max(0, colorTime - 3); // Penalty
                if (colorTimeBadge) colorTimeBadge.textContent = `Time: ${colorTime}s`;
                applyErrorShake(colorTarget);
            }
        });
        colorOptionsBox.appendChild(btn);
    });
}


// NEURO GAME: MEMORY MATRIX

let neuroMatrixLevel = 1;
let neuroMatrixStreak = 0;
let neuroMatrixGridSize = 3;
let neuroMatrixActiveTiles = [];
let neuroMatrixPlayerTiles = [];
let neuroMatrixState = 'idle'; // idle, showing, playing

function initNeuroMatrix() {
    neuroMatrixLevel = 1;
    neuroMatrixStreak = 0;
    neuroMatrixGridSize = 3;
    document.getElementById('neuro-matrix-level').textContent = `Level: ${neuroMatrixLevel}`;
    document.getElementById('neuro-matrix-streak').textContent = `Streak: ${neuroMatrixStreak}`;

    const overlay = document.getElementById('neuro-matrix-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('neuro-matrix-msg').textContent = 'Memorize the pattern.';

    const startBtn = document.getElementById('btn-neuro-matrix-start');
    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.onclick = startNeuroMatrixRound;
    }

    renderNeuroMatrixGrid();
}

function renderNeuroMatrixGrid() {
    const grid = document.getElementById('neuro-matrix-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${neuroMatrixGridSize}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${neuroMatrixGridSize}, 1fr)`;

    for (let i = 0; i < neuroMatrixGridSize * neuroMatrixGridSize; i++) {
        const tile = document.createElement('div');
        tile.className = 'neuro-matrix-tile';
        tile.dataset.idx = i;
        tile.onclick = () => handleNeuroMatrixClick(i, tile);
        grid.appendChild(tile);
    }
}

function startNeuroMatrixRound() {
    neuroMatrixState = 'showing';
    const overlay = document.getElementById('neuro-matrix-overlay');
    overlay.classList.add('hidden');

    const startBtn = document.getElementById('btn-neuro-matrix-start');
    if (startBtn) startBtn.classList.add('hidden');

    renderNeuroMatrixGrid();

    const totalTiles = neuroMatrixGridSize * neuroMatrixGridSize;
    const numActive = neuroMatrixGridSize + Math.floor(neuroMatrixLevel / 2);
    neuroMatrixActiveTiles = [];
    neuroMatrixPlayerTiles = [];

    while (neuroMatrixActiveTiles.length < numActive) {
        let r = Math.floor(Math.random() * totalTiles);
        if (!neuroMatrixActiveTiles.includes(r)) neuroMatrixActiveTiles.push(r);
    }

    const tiles = document.querySelectorAll('.neuro-matrix-tile');
    neuroMatrixActiveTiles.forEach(idx => {
        tiles[idx].classList.add('active');
    });
    sfx.neuroHover();

    setTimeout(() => {
        neuroMatrixActiveTiles.forEach(idx => {
            tiles[idx].classList.remove('active');
        });
        neuroMatrixState = 'playing';
        sfx.neuroClick();
    }, Math.max(800, 2500 - (neuroMatrixLevel * 100)));
}

function handleNeuroMatrixClick(idx, tileElement) {
    if (neuroMatrixState !== 'playing') return;
    if (neuroMatrixPlayerTiles.includes(idx)) return;

    if (neuroMatrixActiveTiles.includes(idx)) {
        neuroMatrixPlayerTiles.push(idx);
        tileElement.classList.add('correct');
        sfx.neuroClick();

        if (neuroMatrixPlayerTiles.length === neuroMatrixActiveTiles.length) {
            neuroMatrixState = 'idle';
            sfx.neuroSuccess();
            neuroMatrixLevel++;
            neuroMatrixStreak++;

            if (neuroMatrixLevel % 3 === 0 && neuroMatrixGridSize < 7) {
                neuroMatrixGridSize++;
            }

            document.getElementById('neuro-matrix-level').textContent = `Level: ${neuroMatrixLevel}`;
            document.getElementById('neuro-matrix-streak').textContent = `Streak: ${neuroMatrixStreak}`;

            setTimeout(startNeuroMatrixRound, 1000);
        }
    } else {
        neuroMatrixState = 'idle';
        tileElement.classList.add('wrong');
        sfx.neuroError();
        neuroMatrixStreak = 0;
        document.getElementById('neuro-matrix-streak').textContent = `Streak: ${neuroMatrixStreak}`;

        const overlay = document.getElementById('neuro-matrix-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('neuro-matrix-msg').textContent = 'Incorrect. Try again.';

        const startBtn = document.getElementById('btn-neuro-matrix-start');
        if (startBtn) {
            startBtn.textContent = 'Retry Pattern';
            startBtn.classList.remove('hidden');
        }
    }
}


// NEURO GAME: ZEN BALANCE

const neuroBalanceCanvas = document.getElementById('neuro-balance-canvas');
const neuroBalanceCtx = neuroBalanceCanvas ? neuroBalanceCanvas.getContext('2d') : null;
let neuroBalanceState = 'idle';
let neuroBalanceOrb = { x: 300, y: 200, vx: 0, vy: 0 };
let neuroBalanceDrift = { vx: 0, vy: 0 };
let neuroBalanceTime = 0;
let neuroBalanceBest = 0;
let neuroBalanceStartTime = 0;
let neuroBalanceAnimFrame;
let neuroBalanceTilt = { x: 0, y: 0 };
let neuroBalanceTargetTilt = { x: 0, y: 0 };
let neuroBalanceTrail = [];
let balanceKeys = { left: false, right: false, up: false, down: false };

function initNeuroBalance() {
    neuroBalanceState = 'idle';
    if (neuroBalanceCanvas) {
        neuroBalanceOrb = { x: neuroBalanceCanvas.width / 2, y: neuroBalanceCanvas.height / 2, vx: 0, vy: 0 };
    }
    neuroBalanceTilt = { x: 0, y: 0 };
    neuroBalanceTargetTilt = { x: 0, y: 0 };
    neuroBalanceTrail = [];

    document.getElementById('neuro-balance-time').textContent = `Focus Time: 0s`;

    const overlay = document.getElementById('neuro-balance-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('neuro-balance-msg').textContent = 'Keep the orb centered using small, gentle movements.';

    const startBtn = document.getElementById('btn-neuro-balance-start');
    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Find Balance';
        startBtn.onclick = startNeuroBalanceRound;
    }

    drawNeuroBalance();
}

function startNeuroBalanceRound() {
    neuroBalanceState = 'playing';
    if (neuroBalanceCanvas) {
        neuroBalanceOrb = { x: neuroBalanceCanvas.width / 2, y: neuroBalanceCanvas.height / 2, vx: 0, vy: 0 };
    }
    neuroBalanceTilt = { x: 0, y: 0 };
    neuroBalanceTargetTilt = { x: 0, y: 0 };
    neuroBalanceTrail = [];
    neuroBalanceDrift = { vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 };
    neuroBalanceStartTime = Date.now();
    neuroBalanceTime = 0;

    const overlay = document.getElementById('neuro-balance-overlay');
    overlay.classList.add('hidden');

    const startBtn = document.getElementById('btn-neuro-balance-start');
    if (startBtn) startBtn.classList.add('hidden');

    animateNeuroBalance();
}

function drawNeuroBalance() {
    if (!neuroBalanceCtx || !neuroBalanceCanvas) return;
    const w = neuroBalanceCanvas.width;
    const h = neuroBalanceCanvas.height;
    neuroBalanceCtx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    neuroBalanceCtx.beginPath();
    neuroBalanceCtx.ellipse(centerX, centerY + 20, 120, 60, 0, 0, Math.PI * 2);
    neuroBalanceCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    neuroBalanceCtx.filter = 'blur(15px)';
    neuroBalanceCtx.fill();
    neuroBalanceCtx.filter = 'none';

    neuroBalanceCtx.save();
    neuroBalanceCtx.translate(centerX, centerY);

    neuroBalanceCtx.scale(1, 0.8 + neuroBalanceTilt.y * 0.05);
    neuroBalanceCtx.rotate(neuroBalanceTilt.x * 0.15);

    neuroBalanceCtx.beginPath();
    neuroBalanceCtx.arc(0, 0, 80, 0, Math.PI * 2);
    neuroBalanceCtx.strokeStyle = 'rgba(168, 218, 220, 0.6)';
    neuroBalanceCtx.lineWidth = 4;
    neuroBalanceCtx.stroke();

    neuroBalanceCtx.beginPath();
    neuroBalanceCtx.arc(0, 0, 80, 0, Math.PI * 2);
    neuroBalanceCtx.fillStyle = 'rgba(168, 218, 220, 0.05)';
    neuroBalanceCtx.fill();

    neuroBalanceCtx.beginPath();
    neuroBalanceCtx.arc(0, 0, 40, 0, Math.PI * 2);
    neuroBalanceCtx.strokeStyle = 'rgba(168, 218, 220, 0.3)';
    neuroBalanceCtx.lineWidth = 2;
    neuroBalanceCtx.stroke();
    neuroBalanceCtx.restore();

    if (neuroBalanceTrail.length > 1) {
        neuroBalanceCtx.beginPath();
        neuroBalanceCtx.moveTo(neuroBalanceTrail[0].x, neuroBalanceTrail[0].y);
        for (let i = 1; i < neuroBalanceTrail.length; i++) {
            neuroBalanceCtx.lineTo(neuroBalanceTrail[i].x, neuroBalanceTrail[i].y);
        }
        neuroBalanceCtx.strokeStyle = 'rgba(189, 224, 254, 0.4)';
        neuroBalanceCtx.lineWidth = 8;
        neuroBalanceCtx.lineCap = 'round';
        neuroBalanceCtx.lineJoin = 'round';
        neuroBalanceCtx.stroke();
    }

    neuroBalanceCtx.beginPath();
    neuroBalanceCtx.arc(neuroBalanceOrb.x, neuroBalanceOrb.y, 16, 0, Math.PI * 2);
    neuroBalanceCtx.fillStyle = '#bde0fe';
    neuroBalanceCtx.shadowColor = '#a8dadc';
    neuroBalanceCtx.shadowBlur = 20;
    neuroBalanceCtx.fill();

    neuroBalanceCtx.beginPath();
    neuroBalanceCtx.arc(neuroBalanceOrb.x - 4, neuroBalanceOrb.y - 4, 6, 0, Math.PI * 2);
    neuroBalanceCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    neuroBalanceCtx.shadowBlur = 0;
    neuroBalanceCtx.fill();
}

function animateNeuroBalance() {
    if (neuroBalanceState !== 'playing') return;

    let inputX = 0;
    let inputY = 0;

    // DEAD ZONE
    if (Math.abs(joystick.x) > 0.1) inputX = joystick.x;
    if (Math.abs(joystick.y) > 0.1) inputY = joystick.y;

    if (balanceKeys.left) inputX = -1;
    if (balanceKeys.right) inputX = 1;
    if (balanceKeys.up) inputY = -1;
    if (balanceKeys.down) inputY = 1;

    neuroBalanceTargetTilt.x = inputX;
    neuroBalanceTargetTilt.y = inputY;

    if (Math.random() < 0.1) {
        neuroBalanceDrift.vx += (Math.random() - 0.5) * 0.2;
        neuroBalanceDrift.vy += (Math.random() - 0.5) * 0.2;
        neuroBalanceDrift.vx = Math.max(-0.6, Math.min(0.6, neuroBalanceDrift.vx));
        neuroBalanceDrift.vy = Math.max(-0.6, Math.min(0.6, neuroBalanceDrift.vy));
    }
    neuroBalanceTargetTilt.x += neuroBalanceDrift.vx;
    neuroBalanceTargetTilt.y += neuroBalanceDrift.vy;

    neuroBalanceTilt.x += (neuroBalanceTargetTilt.x - neuroBalanceTilt.x) * 0.08;
    neuroBalanceTilt.y += (neuroBalanceTargetTilt.y - neuroBalanceTilt.y) * 0.08;

    const accelMultiplier = 0.5;
    neuroBalanceOrb.vx += neuroBalanceTilt.x * accelMultiplier;
    neuroBalanceOrb.vy += neuroBalanceTilt.y * accelMultiplier;

    const centerX = neuroBalanceCanvas.width / 2;
    const centerY = neuroBalanceCanvas.height / 2;
    const dx = centerX - neuroBalanceOrb.x;
    const dy = centerY - neuroBalanceOrb.y;

    let assistForce = Math.max(0, 0.002 - (neuroBalanceTime * 0.0001));
    neuroBalanceOrb.vx += dx * assistForce;
    neuroBalanceOrb.vy += dy * assistForce;

    neuroBalanceOrb.vx *= 0.92;
    neuroBalanceOrb.vy *= 0.92;

    const maxSpeed = 8;
    const speed = Math.hypot(neuroBalanceOrb.vx, neuroBalanceOrb.vy);
    if (speed > maxSpeed) {
        neuroBalanceOrb.vx = (neuroBalanceOrb.vx / speed) * maxSpeed;
        neuroBalanceOrb.vy = (neuroBalanceOrb.vy / speed) * maxSpeed;
    }

    neuroBalanceOrb.x += neuroBalanceOrb.vx;
    neuroBalanceOrb.y += neuroBalanceOrb.vy;

    neuroBalanceTrail.push({ x: neuroBalanceOrb.x, y: neuroBalanceOrb.y });
    if (neuroBalanceTrail.length > 20) {
        neuroBalanceTrail.shift();
    }

    drawNeuroBalance();

    const dist = Math.hypot(neuroBalanceOrb.x - centerX, neuroBalanceOrb.y - centerY);

    if (dist < 80) {
        neuroBalanceTime = Math.floor((Date.now() - neuroBalanceStartTime) / 1000);
        document.getElementById('neuro-balance-time').textContent = `Focus Time: ${neuroBalanceTime}s`;
        if (neuroBalanceTime > neuroBalanceBest) {
            neuroBalanceBest = neuroBalanceTime;
            document.getElementById('neuro-balance-best').textContent = `Best: ${neuroBalanceBest}s`;
        }
    } else {
        neuroBalanceState = 'idle';
        sfx.neuroError();
        const overlay = document.getElementById('neuro-balance-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('neuro-balance-msg').textContent = `Equilibrium lost.`;

        const startBtn = document.getElementById('btn-neuro-balance-start');
        if (startBtn) {
            startBtn.textContent = 'Retry Balance';
            startBtn.classList.remove('hidden');
        }
        return;
    }

    neuroBalanceAnimFrame = requestAnimationFrame(animateNeuroBalance);
}


// NEURO GAME: NEURAL PATHWAY

let neuroPathwayLevel = 1;
let neuroPathwayNodes = [];
let neuroPathwaySequence = [];
let neuroPathwayPlayerSeq = [];
let neuroPathwayState = 'idle'; // idle, showing, playing
const neuroPathwayCanvas = document.getElementById('neuro-pathway-canvas');
const neuroPathwayCtx = neuroPathwayCanvas ? neuroPathwayCanvas.getContext('2d') : null;

function initNeuroPathway() {
    neuroPathwayLevel = 1;
    document.getElementById('neuro-pathway-level').textContent = `Level: ${neuroPathwayLevel}`;

    const overlay = document.getElementById('neuro-pathway-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('neuro-pathway-msg').textContent = `Recreate the path.`;

    const startBtn = document.getElementById('btn-neuro-pathway-start');
    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Start Pathway';
        startBtn.onclick = startNeuroPathwayRound;
    }

    if (neuroPathwayCanvas) {
        neuroPathwayCanvas.addEventListener('click', handleNeuroPathwayClick);
    }

    neuroPathwayNodes = [];
    drawNeuroPathway();
}

function generateNeuroPathwayNodes(count) {
    neuroPathwayNodes = [];
    neuroPathwaySequence = [];
    const padding = 50;
    const w = neuroPathwayCanvas.width;
    const h = neuroPathwayCanvas.height;

    for (let i = 0; i < count; i++) {
        let valid = false;
        let p;
        while (!valid) {
            p = {
                x: padding + Math.random() * (w - padding * 2),
                y: padding + Math.random() * (h - padding * 2),
                id: i,
                active: false
            };
            valid = true;
            for (let n of neuroPathwayNodes) {
                if (Math.hypot(p.x - n.x, p.y - n.y) < 60) valid = false;
            }
        }
        neuroPathwayNodes.push(p);
        neuroPathwaySequence.push(i);
    }
}

function drawNeuroPathway() {
    if (!neuroPathwayCtx) return;
    const w = neuroPathwayCanvas.width;
    const h = neuroPathwayCanvas.height;
    neuroPathwayCtx.clearRect(0, 0, w, h);

    neuroPathwayCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    neuroPathwayCtx.lineWidth = 2;
    for (let i = 0; i < neuroPathwayNodes.length; i++) {
        for (let j = i + 1; j < neuroPathwayNodes.length; j++) {
            neuroPathwayCtx.beginPath();
            neuroPathwayCtx.moveTo(neuroPathwayNodes[i].x, neuroPathwayNodes[i].y);
            neuroPathwayCtx.lineTo(neuroPathwayNodes[j].x, neuroPathwayNodes[j].y);
            neuroPathwayCtx.stroke();
        }
    }

    if (neuroPathwayPlayerSeq.length > 1) {
        neuroPathwayCtx.strokeStyle = 'rgba(168, 218, 220, 0.8)';
        neuroPathwayCtx.lineWidth = 4;
        neuroPathwayCtx.beginPath();
        neuroPathwayCtx.moveTo(neuroPathwayNodes[neuroPathwayPlayerSeq[0]].x, neuroPathwayNodes[neuroPathwayPlayerSeq[0]].y);
        for (let i = 1; i < neuroPathwayPlayerSeq.length; i++) {
            neuroPathwayCtx.lineTo(neuroPathwayNodes[neuroPathwayPlayerSeq[i]].x, neuroPathwayNodes[neuroPathwayPlayerSeq[i]].y);
        }
        neuroPathwayCtx.stroke();
    }

    for (let n of neuroPathwayNodes) {
        neuroPathwayCtx.beginPath();
        neuroPathwayCtx.arc(n.x, n.y, 20, 0, Math.PI * 2);
        if (n.active) {
            neuroPathwayCtx.fillStyle = 'rgba(189, 224, 254, 1)';
            neuroPathwayCtx.shadowColor = 'rgba(189, 224, 254, 0.8)';
            neuroPathwayCtx.shadowBlur = 15;
        } else {
            neuroPathwayCtx.fillStyle = 'rgba(15, 17, 35, 0.8)';
            neuroPathwayCtx.shadowBlur = 0;
        }
        neuroPathwayCtx.fill();
        neuroPathwayCtx.strokeStyle = 'rgba(168, 218, 220, 0.5)';
        neuroPathwayCtx.lineWidth = 2;
        neuroPathwayCtx.stroke();
        neuroPathwayCtx.shadowBlur = 0;
    }
}

function startNeuroPathwayRound() {
    neuroPathwayState = 'showing';
    neuroPathwayPlayerSeq = [];

    const overlay = document.getElementById('neuro-pathway-overlay');
    overlay.classList.add('hidden');

    const startBtn = document.getElementById('btn-neuro-pathway-start');
    if (startBtn) startBtn.classList.add('hidden');

    generateNeuroPathwayNodes(neuroPathwayLevel + 2);
    drawNeuroPathway();

    let step = 0;
    const interval = setInterval(() => {
        if (step > 0) neuroPathwayNodes[neuroPathwaySequence[step - 1]].active = false;
        if (step < neuroPathwaySequence.length) {
            neuroPathwayNodes[neuroPathwaySequence[step]].active = true;
            sfx.neuroHover();
            drawNeuroPathway();
            step++;
        } else {
            clearInterval(interval);
            neuroPathwayState = 'playing';
            drawNeuroPathway();
        }
    }, 800);
}

function handleNeuroPathwayClick(e) {
    if (neuroPathwayState !== 'playing') return;

    const rect = neuroPathwayCanvas.getBoundingClientRect();
    const scaleX = neuroPathwayCanvas.width / rect.width;
    const scaleY = neuroPathwayCanvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (let i = 0; i < neuroPathwayNodes.length; i++) {
        let n = neuroPathwayNodes[i];
        if (Math.hypot(x - n.x, y - n.y) < 30) {
            if (neuroPathwayPlayerSeq.includes(n.id)) return;

            neuroPathwayPlayerSeq.push(n.id);
            n.active = true;
            drawNeuroPathway();
            setTimeout(() => { n.active = false; drawNeuroPathway(); }, 300);

            const expected = neuroPathwaySequence[neuroPathwayPlayerSeq.length - 1];
            if (n.id === expected) {
                sfx.neuroClick();
                if (neuroPathwayPlayerSeq.length === neuroPathwaySequence.length) {
                    neuroPathwayState = 'idle';
                    sfx.neuroSuccess();
                    neuroPathwayLevel++;
                    document.getElementById('neuro-pathway-level').textContent = `Level: ${neuroPathwayLevel}`;
                    setTimeout(startNeuroPathwayRound, 1000);
                }
            } else {
                neuroPathwayState = 'idle';
                sfx.neuroError();

                const overlay = document.getElementById('neuro-pathway-overlay');
                overlay.classList.remove('hidden');
                document.getElementById('neuro-pathway-msg').textContent = 'Path broken.';

                const startBtn = document.getElementById('btn-neuro-pathway-start');
                if (startBtn) {
                    startBtn.textContent = 'Retry Path';
                    startBtn.classList.remove('hidden');
                }
            }
            break;
        }
    }
}


// NEURO GAME: FOCUS FILTER

const neuroFilterCanvas = document.getElementById('neuro-filter-canvas');
const neuroFilterCtx = neuroFilterCanvas ? neuroFilterCanvas.getContext('2d') : null;
let neuroFilterScore = 0;
let neuroFilterTargets = ['🔵', '🟢', '🟡', '🟣'];
let neuroFilterDistractors = ['🔴', '🟥', '⭐', '🔺', '✖️', '⬜'];
let neuroFilterCurrentTarget = '🔵';
let neuroFilterEntities = [];
let neuroFilterState = 'idle'; // idle, playing
let neuroFilterAnimFrame;
let neuroFilterSpawnTimer;

function initNeuroFilter() {
    neuroFilterState = 'idle';
    neuroFilterScore = 0;

    document.getElementById('neuro-filter-score').textContent = `Score: ${neuroFilterScore}`;

    const overlay = document.getElementById('neuro-filter-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('neuro-filter-msg').textContent = `Click only the target.`;

    const startBtn = document.getElementById('btn-neuro-filter-start');
    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Start Filter';
        startBtn.onclick = startNeuroFilterRound;
    }

    if (neuroFilterCanvas) {
        neuroFilterCanvas.addEventListener('click', handleNeuroFilterClick);
    }

    neuroFilterEntities = [];
    if (neuroFilterCtx) {
        neuroFilterCtx.clearRect(0, 0, neuroFilterCanvas.width, neuroFilterCanvas.height);
    }
}

function startNeuroFilterRound() {
    neuroFilterState = 'playing';
    neuroFilterScore = 0;
    document.getElementById('neuro-filter-score').textContent = `Score: ${neuroFilterScore}`;

    neuroFilterCurrentTarget = neuroFilterTargets[Math.floor(Math.random() * neuroFilterTargets.length)];
    document.getElementById('neuro-filter-target').textContent = `Target: ${neuroFilterCurrentTarget}`;

    const overlay = document.getElementById('neuro-filter-overlay');
    overlay.classList.add('hidden');

    const startBtn = document.getElementById('btn-neuro-filter-start');
    if (startBtn) startBtn.classList.add('hidden');

    neuroFilterEntities = [];
    neuroFilterSpawnTimer = setInterval(spawnNeuroFilterEntity, 1000);
    animateNeuroFilter();
}

function spawnNeuroFilterEntity() {
    if (neuroFilterState !== 'playing') return;

    const isTarget = Math.random() < 0.3;
    let symbol = isTarget ? neuroFilterCurrentTarget : neuroFilterDistractors[Math.floor(Math.random() * neuroFilterDistractors.length)];

    if (!isTarget && symbol === neuroFilterCurrentTarget) {
        symbol = '✖️';
    }

    const y = Math.random() * (neuroFilterCanvas.height - 40) + 20;

    neuroFilterEntities.push({
        symbol: symbol,
        isTarget: isTarget,
        x: -30,
        y: y,
        vx: Math.random() * 1.5 + 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: 0,
        size: 30
    });
}

function animateNeuroFilter() {
    if (neuroFilterState !== 'playing' || !neuroFilterCtx) return;

    neuroFilterCtx.clearRect(0, 0, neuroFilterCanvas.width, neuroFilterCanvas.height);
    neuroFilterCtx.font = '30px Arial';
    neuroFilterCtx.textAlign = 'center';
    neuroFilterCtx.textBaseline = 'middle';

    for (let i = neuroFilterEntities.length - 1; i >= 0; i--) {
        let e = neuroFilterEntities[i];
        e.x += e.vx;
        e.y += e.vy;

        if (e.opacity < 1) e.opacity += 0.05;

        neuroFilterCtx.globalAlpha = e.opacity;
        neuroFilterCtx.fillText(e.symbol, e.x, e.y);

        if (e.x > neuroFilterCanvas.width + 30) {
            if (e.isTarget) {
                neuroFilterScore = Math.max(0, neuroFilterScore - 5);
                document.getElementById('neuro-filter-score').textContent = `Score: ${neuroFilterScore}`;
                sfx.neuroError();
            }
            neuroFilterEntities.splice(i, 1);
        }
    }

    neuroFilterCtx.globalAlpha = 1;
    neuroFilterAnimFrame = requestAnimationFrame(animateNeuroFilter);
}

function handleNeuroFilterClick(event) {
    if (neuroFilterState !== 'playing') return;

    const rect = neuroFilterCanvas.getBoundingClientRect();
    const scaleX = neuroFilterCanvas.width / rect.width;
    const scaleY = neuroFilterCanvas.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    let hit = false;
    for (let i = neuroFilterEntities.length - 1; i >= 0; i--) {
        let e = neuroFilterEntities[i];
        if (Math.hypot(x - e.x, y - e.y) < 25) {
            hit = true;
            if (e.isTarget) {
                sfx.neuroSuccess();
                neuroFilterScore += 10;
            } else {
                sfx.neuroError();
                neuroFilterScore = Math.max(0, neuroFilterScore - 10);
            }
            document.getElementById('neuro-filter-score').textContent = `Score: ${neuroFilterScore}`;
            neuroFilterEntities.splice(i, 1);
            break;
        }
    }
}
