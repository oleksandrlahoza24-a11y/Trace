// ── GAME ENGINE ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── STATE ────────────────────────────────────────────────────────────────────
let state = 'menu';  // menu | playing | dead | skilltree
let score = 0;
let lives = 3;
let combo = 1;
let comboTimer = 0;
let circles = [];
let trail   = [];
let particles = [];
let shockwaves = [];
let inkBlots = [];
let shakeX = 0, shakeY = 0, shakeDur = 0;
let touching = false;
let touchX = 0, touchY = 0;
let spawnTimer = 0;
let spawnInterval = 1800;
let circleTimeout = 3200; // ms a circle lives
let frameTime = 0;
let lastTime = 0;
let animId = null;
let fx = {};
let totalPtsEarned = 0;

// Colour palette for spectral trails
const SPECTRAL = [
  '#f5f2ec','#c8bfad','#a89880','#8a7a6e','#6e6058','#504840'
];

// ── RESIZE ───────────────────────────────────────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── UTILS ────────────────────────────────────────────────────────────────────
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

// ── CIRCLE FACTORY ───────────────────────────────────────────────────────────
function spawnCircle() {
  const margin = 80;
  const r = rand(28, 44);
  circles.push({
    x: rand(margin, canvas.width  - margin),
    y: rand(margin, canvas.height - margin),
    r,
    born: frameTime,
    life: circleTimeout + (fx.extraTime || 0),
    pulsePhase: Math.random() * Math.PI * 2,
  });
}

// ── HIT A CIRCLE ─────────────────────────────────────────────────────────────
function hitCircle(c) {
  // Score
  const pts = Math.round(10 * combo);
  score += pts;
  totalPtsEarned += pts;
  combo = Math.min(combo + 1, 16);
  comboTimer = 2200 + (fx.comboSpeed || 0) * 300;
  updateHUD();

  // Combo banner
  if (combo >= 3) showComboBanner(`×${combo}`);

  // Screen shake
  if (fx.screenShake > 0) {
    shakeX = (Math.random() - 0.5) * fx.screenShake * 6;
    shakeY = (Math.random() - 0.5) * fx.screenShake * 6;
    shakeDur = 180;
  }

  // Flash
  triggerFlash(0.04 + (fx.flashIntensity || 0) * 0.06);

  // Burst particles
  const count = fx.burstParticles || 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = rand(2, 5 + combo * 0.3);
    particles.push({
      x: c.x, y: c.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, decay: rand(0.02, 0.05),
      r: rand(2, 5),
    });
  }

  // Shockwave
  if (fx.shockwave > 0) {
    for (let s = 0; s < fx.shockwave; s++) {
      shockwaves.push({ x: c.x, y: c.y, r: c.r, maxR: 80 + s * 40, life: 1 });
    }
  }

  // Ink splatter
  if (fx.inkSplatter > 0) {
    for (let i = 0; i < fx.inkSplatter * 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = rand(10, 50 * fx.inkSplatter);
      inkBlots.push({
        x: c.x + Math.cos(angle) * d,
        y: c.y + Math.sin(angle) * d,
        r: rand(4, 14),
        life: 1, decay: rand(0.008, 0.02),
      });
    }
  }

  // Remove circle
  circles.splice(circles.indexOf(c), 1);
  // Speed up slightly
  spawnInterval = Math.max(700, spawnInterval - 18);
}

// ── LOSE A LIFE ──────────────────────────────────────────────────────────────
function loseLife() {
  if (state !== 'playing') return;
  lives--;
  combo = 1;
  comboTimer = 0;
  updateHUD();
  triggerFlash(0.18);
  if (lives <= 0) endGame();
}

// ── END GAME ─────────────────────────────────────────────────────────────────
function endGame() {
  state = 'dead';
  cancelAnimationFrame(animId);
  ST.addPoints(totalPtsEarned);

  document.getElementById('go-score').textContent = score.toLocaleString();
  document.getElementById('go-pts').textContent =
    `+ ${totalPtsEarned.toLocaleString()} skill points earned`;

  show('gameover');
  hide('hud');
  hide('gameCanvas');
}

// ── FLASH ────────────────────────────────────────────────────────────────────
function triggerFlash(alpha) {
  const el = document.getElementById('flash');
  el.style.opacity = String(clamp(alpha, 0, 1));
  setTimeout(() => el.style.opacity = '0', 90);
}

// ── COMBO BANNER ─────────────────────────────────────────────────────────────
let comboBannerTimer = null;
function showComboBanner(text) {
  const el = document.getElementById('combo-banner');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(comboBannerTimer);
  comboBannerTimer = setTimeout(() => el.classList.remove('show'), 500);
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-score').textContent = score.toLocaleString();
  const livesEl = document.getElementById('hud-lives');
  livesEl.innerHTML = '';
  const maxLives = 3 + (fx.bonusLives || 0);
  for (let i = 0; i < maxLives; i++) {
    const dot = document.createElement('div');
    dot.className = 'life-dot' + (i >= lives ? ' dead' : '');
    livesEl.appendChild(dot);
  }
}

// ── SCREEN HELPERS ───────────────────────────────────────────────────────────
function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ── START GAME ───────────────────────────────────────────────────────────────
function startGame() {
  fx = ST.effects();
  state  = 'playing';
  score  = 0;
  combo  = 1;
  comboTimer = 0;
  lives  = 3 + (fx.bonusLives || 0);
  circles = [];
  trail   = [];
  particles = [];
  shockwaves = [];
  inkBlots = [];
  touching = false;
  spawnTimer = 0;
  spawnInterval = 1800;
  circleTimeout = 3200;
  totalPtsEarned = 0;
  shakeDur = 0;
  shakeX = 0;
  shakeY = 0;

  hide('menu');
  hide('gameover');
  hide('skilltree');
  hide('st-close');
  show('hud');
  show('gameCanvas');
  updateHUD();

  lastTime = performance.now();
  loop(lastTime);

  // Spawn first two circles
  spawnCircle();
  setTimeout(spawnCircle, 600);
}

// ── MAIN LOOP ────────────────────────────────────────────────────────────────
function loop(ts) {
  if (state !== 'playing') return;
  animId = requestAnimationFrame(loop);

  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  frameTime = ts;

  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnCircle();
  }

  // Combo decay
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) { combo = 1; }
  }

  // Shake decay
  if (shakeDur > 0) {
    shakeDur -= dt;
    if (shakeDur <= 0) { shakeX = 0; shakeY = 0; }
    else {
      const t = shakeDur / 180;
      shakeX = (Math.random() - 0.5) * fx.screenShake * 6 * t;
      shakeY = (Math.random() - 0.5) * fx.screenShake * 6 * t;
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.93; p.vy *= 0.93;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Update shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.r += 3.5;
    s.life = 1 - (s.r - (s.maxR * 0.1)) / (s.maxR * 0.9);
    if (s.life <= 0) shockwaves.splice(i, 1);
  }

  // Update ink blots
  for (let i = inkBlots.length - 1; i >= 0; i--) {
    const b = inkBlots[i];
    b.life -= b.decay;
    if (b.life <= 0) inkBlots.splice(i, 1);
  }

  // Expire circles
  for (let i = circles.length - 1; i >= 0; i--) {
    const c = circles[i];
    if (frameTime - c.born > c.life) {
      circles.splice(i, 1);
      loseLife();
    }
  }

  // Check touch on circles
  if (touching) {
    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i];
      if (dist(touchX, touchY, c.x, c.y) < c.r + 10) {
        hitCircle(c);
        break;
      }
    }
  }

  draw();
}

// ── DRAW ─────────────────────────────────────────────────────────────────────
function draw() {
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

  // Ink blots (draw below trail)
  for (const b of inkBlots) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20,20,20,${b.life * 0.9})`;
    ctx.fill();
  }

  // Trail
  drawTrail();

  // Shockwaves
  for (const s of shockwaves) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245,242,236,${s.life * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Particles
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(245,242,236,${p.life})`;
    ctx.fill();
  }

  // Circles
  drawCircles();

  // Touch cursor glow
  if (touching) {
    const g = ctx.createRadialGradient(touchX, touchY, 0, touchX, touchY, 20);
    g.addColorStop(0, 'rgba(245,242,236,0.25)');
    g.addColorStop(1, 'rgba(245,242,236,0)');
    ctx.beginPath();
    ctx.arc(touchX, touchY, 20, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  ctx.restore();
}

function drawTrail() {
  if (trail.length < 2) return;
  const maxLen = fx.trailLength || 40;
  const trailSlice = trail.slice(-maxLen);

  for (let i = 1; i < trailSlice.length; i++) {
    const t   = i / trailSlice.length;
    const p0  = trailSlice[i - 1];
    const p1  = trailSlice[i];
    const alpha = t * 0.9;

    let color;
    if ((fx.trailSpectral || 0) > 0) {
      const idx = Math.floor((i / trailSlice.length) * SPECTRAL.length * fx.trailSpectral) % SPECTRAL.length;
      color = hexToRgba(SPECTRAL[idx], alpha);
    } else {
      color = `rgba(245,242,236,${alpha})`;
    }

    // Glow layers
    if ((fx.trailGlow || 0) > 0) {
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(245,242,236,${alpha * 0.15})`;
      ctx.lineWidth = 3 + fx.trailGlow * 5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function drawCircles() {
  const now = frameTime;
  for (const c of circles) {
    const age   = now - c.born;
    const lifeT = age / c.life;               // 0..1 (1 = expired)
    const alpha = lifeT > 0.7
      ? 1 - (lifeT - 0.7) / 0.3              // fade last 30%
      : 1;

    // Pulse rings
    if ((fx.circlePulse || 0) > 0) {
      const pulseT = (now * 0.002 + c.pulsePhase) % 1;
      const pR = c.r + pulseT * 30 * fx.circlePulse;
      const pA = (1 - pulseT) * 0.25 * alpha;
      ctx.beginPath();
      ctx.arc(c.x, c.y, pR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(245,242,236,${pA})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Life ring (shrinks as time runs out)
    const lifeRingAlpha = 0.3 * alpha;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lifeT));
    ctx.strokeStyle = `rgba(245,242,236,${lifeRingAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Core circle
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245,242,236,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner fill (subtle)
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, `rgba(245,242,236,${0.08 * alpha})`);
    g.addColorStop(1, `rgba(245,242,236,0)`);
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── TOUCH / POINTER INPUT ─────────────────────────────────────────────────────

function getPos(e) {
  if (e.touches) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'playing') return;
  touching = true;
  const p = getPos(e);
  touchX = p.x; touchY = p.y;
  trail = [{ x: p.x, y: p.y }];
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (state !== 'playing' || !touching) return;
  const p = getPos(e);
  touchX = p.x; touchY = p.y;
  trail.push({ x: p.x, y: p.y });
  if (trail.length > 300) trail.shift();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('pointerup', (e) => {
  if (state !== 'playing') return;
  touching = false;
  trail = [];
  loseLife();  // lifting finger costs a life
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('pointercancel', (e) => {
  if (state !== 'playing') return;
  touching = false;
  trail = [];
  loseLife();
  e.preventDefault();
}, { passive: false });

// ── MENU / NAV BUTTONS ────────────────────────────────────────────────────────

let skillTreeFrom = 'menu';

function openSkillTree(from) {
  skillTreeFrom = from;
  state = 'skilltree';
  hide('menu');
  hide('gameover');
  show('skilltree');
  show('st-close');
  renderSkillTree();
}

function closeSkillTree() {
  hide('skilltree');
  hide('st-close');
  if (skillTreeFrom === 'gameover') {
    show('gameover');
  } else {
    state = 'menu';
    show('menu');
  }
}

document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('btn-skills').addEventListener('click', () => openSkillTree('menu'));
document.getElementById('btn-skills2').addEventListener('click', () => openSkillTree('gameover'));
document.getElementById('btn-menu').addEventListener('click', () => {
  state = 'menu';
  hide('gameover');
  show('menu');
});
document.getElementById('st-close').addEventListener('click', closeSkillTree);

// ── INIT ──────────────────────────────────────────────────────────────────────
// All screens start hidden via CSS class; just reveal the menu
show('menu');
