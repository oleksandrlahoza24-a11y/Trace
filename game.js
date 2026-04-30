cat > /home/claude/flames/game.js << 'JSEOF'
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

let state = 'menu';
let score = 0;
let lives = 3;
let combo = 1;
let comboTimer = 0;
let circles = [];
let trail   = [];
let trailGhost = [];
let particles = [];
let shockwaves = [];
let inkBlots = [];
let embers = [];
let shakeX = 0, shakeY = 0, shakeDur = 0;
let rippleT = 0, rippleActive = false;
let chromaticT = 0, chromaticActive = false;
let touching = false;
let touchX = 0, touchY = 0;
let lastTouchX = 0, lastTouchY = 0;
let touchSpeed = 0;
let spawnTimer = 0;
let spawnInterval = 1800;
let circleTimeout = 3200;
let frameTime = 0;
let lastTime = 0;
let animId = null;
let fx = {};
let totalPtsEarned = 0;
let vignetteAlpha = 0;
let bgScanY = 0;

const SPECTRAL = ['#f5f2ec','#d4c9b8','#b8a898','#9e8878','#856858','#6c5040','#a06040','#c08050'];
const EMBER_COLORS = ['#ff9955','#ffcc44','#ff7722','#ffee88'];

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function lerp(a, b, t) { return a + (b - a) * t; }

function spawnCircle(isPhantom) {
  const margin = 100;
  const shrink = fx.circleShrink || 0;
  const baseMin = Math.max(14, 28 - shrink * 3);
  const baseMax = Math.max(22, 44 - shrink * 4);
  const r = rand(baseMin, baseMax);

  const vx = (fx.circleDrift || 0) > 0 ? rand(-1, 1) * fx.circleDrift : 0;
  const vy = (fx.circleDrift || 0) > 0 ? rand(-1, 1) * fx.circleDrift : 0;

  circles.push({
    x: rand(margin, canvas.width  - margin),
    y: rand(margin, canvas.height - margin),
    vx, vy, r,
    born: frameTime,
    life: circleTimeout + (fx.extraTime || 0),
    pulsePhase: Math.random() * Math.PI * 2,
    phantom: !!isPhantom,
    glowPhase: Math.random() * Math.PI * 2,
  });
}

function hitCircle(c, hitX, hitY) {
  if (c.phantom) {
    loseLife();
    triggerFlash(0.35);
    spawnDeathBurst(c.x, c.y, '#cc2233');
    circles.splice(circles.indexOf(c), 1);
    return;
  }

  const centerDist = dist(hitX, hitY, c.x, c.y);
  const perfBonus  = fx.perfectBonus > 0 && centerDist < c.r * 0.4
    ? 1 + fx.perfectBonus : 1;
  const speedBonus = fx.momentumBonus > 0
    ? 1 + Math.min(touchSpeed / 12, 1) * fx.momentumBonus * 0.3 : 1;
  const stakesMult = fx.highStakes ? 2 : 1;
  const lastMult   = (fx.lastStandMult || 1) > 1 && lives === 1 ? fx.lastStandMult : 1;

  const pts = Math.round(10 * combo * perfBonus * speedBonus * stakesMult * lastMult);
  score += pts;
  totalPtsEarned += pts;

  const maxCombo = fx.unlimitedCombo ? 999 : 16;
  combo = Math.min(combo + 1, maxCombo);
  comboTimer = 2200 + (fx.comboSpeed || 0) * 280;
  updateHUD();

  if (combo >= 3) showComboBanner(`×${combo}`);

  if (fx.screenShake > 0) {
    shakeX = (Math.random() - 0.5) * fx.screenShake * 8;
    shakeY = (Math.random() - 0.5) * fx.screenShake * 8;
    shakeDur = 200;
  }
  if ((fx.ripple || 0) > 0) { rippleT = 0; rippleActive = true; }
  if ((fx.chromatic || 0) > 0) { chromaticT = 0; chromaticActive = true; }

  triggerFlash(0.04 + (fx.flashIntensity || 0) * 0.07);

  const count = fx.burstParticles || 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = rand(2, 6 + combo * 0.4);
    particles.push({
      x: c.x, y: c.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, decay: rand(0.015, 0.04),
      r: rand(2, 6),
    });
  }

  if (fx.shockwave > 0) {
    for (let s = 0; s < fx.shockwave; s++) {
      shockwaves.push({ x: c.x, y: c.y, r: c.r, maxR: 90 + s * 50, life: 1 });
    }
  }

  if (fx.inkSplatter > 0) {
    for (let i = 0; i < Math.floor(fx.inkSplatter * 4); i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = rand(8, 55 * fx.inkSplatter);
      inkBlots.push({
        x: c.x + Math.cos(angle) * d,
        y: c.y + Math.sin(angle) * d,
        r: rand(3, 16),
        life: 1, decay: rand(0.006, 0.018),
      });
    }
  }

  if (fx.chainRadius > 0) {
    for (let i = circles.length - 1; i >= 0; i--) {
      const other = circles[i];
      if (other === c) continue;
      if (dist(c.x, c.y, other.x, other.y) < fx.chainRadius) {
        shockwaves.push({ x: other.x, y: other.y, r: other.r, maxR: 70, life: 1 });
        const chainPts = Math.round(5 * combo * stakesMult);
        score += chainPts;
        totalPtsEarned += chainPts;
        circles.splice(i, 1);
      }
    }
    updateHUD();
  }

  if (fx.circleSplit > 0 && c.r > 22) {
    for (let s = 0; s < 2; s++) {
      const angle = Math.random() * Math.PI * 2;
      const nr = c.r * 0.6;
      circles.push({
        x: c.x + Math.cos(angle) * nr,
        y: c.y + Math.sin(angle) * nr,
        vx: Math.cos(angle) * 0.5, vy: Math.sin(angle) * 0.5,
        r: nr,
        born: frameTime,
        life: (circleTimeout + (fx.extraTime || 0)) * 0.6,
        pulsePhase: Math.random() * Math.PI * 2,
        phantom: false, glowPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  circles.splice(circles.indexOf(c), 1);
  spawnInterval = Math.max(600, spawnInterval - 20);
}

function spawnDeathBurst(x, y, color) {
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const speed = rand(3, 8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, decay: rand(0.02, 0.05),
      r: rand(3, 8),
      color,
    });
  }
}

function loseLife() {
  if (state !== 'playing') return;
  lives--;
  combo = 1;
  comboTimer = 0;
  updateHUD();
  triggerFlash(0.22);
  if (fx.highStakes) { endGame(); return; }
  if (lives <= 0) endGame();
}

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

function triggerFlash(alpha) {
  const el = document.getElementById('flash');
  el.style.opacity = String(clamp(alpha, 0, 1));
  setTimeout(() => el.style.opacity = '0', 100);
}

let comboBannerTimer = null;
function showComboBanner(text) {
  const el = document.getElementById('combo-banner');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(comboBannerTimer);
  comboBannerTimer = setTimeout(() => el.classList.remove('show'), 550);
}

function updateHUD() {
  document.getElementById('hud-score').textContent = score.toLocaleString();
  document.getElementById('hud-combo').textContent = combo > 1 ? `×${combo}` : '';
  const livesEl = document.getElementById('hud-lives');
  livesEl.innerHTML = '';
  const maxLives = 3 + (fx.bonusLives || 0);
  for (let i = 0; i < maxLives; i++) {
    const dot = document.createElement('div');
    dot.className = 'life-dot' + (i >= lives ? ' dead' : '') + (lives === 1 && i === 0 ? ' danger' : '');
    livesEl.appendChild(dot);
  }
}

function show(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function hide(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

function startGame() {
  fx = ST.effects();
  state = 'playing';
  score = 0; combo = 1; comboTimer = 0;
  lives = 3 + (fx.bonusLives || 0);
  circles = []; trail = []; trailGhost = [];
  particles = []; shockwaves = []; inkBlots = []; embers = [];
  touching = false;
  spawnTimer = 0; spawnInterval = 1800;
  circleTimeout = 3200;
  totalPtsEarned = 0;
  shakeDur = 0; shakeX = 0; shakeY = 0;
  vignetteAlpha = 0; bgScanY = 0;
  rippleActive = false; chromaticActive = false;
  touchSpeed = 0;

  hide('menu'); hide('gameover'); hide('skilltree'); hide('st-close');
  show('hud'); show('gameCanvas');
  updateHUD();

  lastTime = performance.now();
  loop(lastTime);
  spawnCircle();
  setTimeout(spawnCircle, 500);
  if ((fx.spawnBoost || 0) >= 3) setTimeout(spawnCircle, 900);
}

function loop(ts) {
  if (state !== 'playing') return;
  animId = requestAnimationFrame(loop);

  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  frameTime = ts;

  spawnTimer += dt;
  const effectiveInterval = Math.max(450, spawnInterval - (fx.spawnBoost || 0) * 120);
  if (spawnTimer >= effectiveInterval) {
    spawnTimer = 0;
    spawnCircle(Math.random() < (fx.phantomChance || 0));
  }

  if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 1; }

  if (shakeDur > 0) {
    shakeDur -= dt;
    if (shakeDur <= 0) { shakeX = 0; shakeY = 0; }
    else {
      const t = shakeDur / 200;
      shakeX = (Math.random() - 0.5) * (fx.screenShake || 0) * 8 * t;
      shakeY = (Math.random() - 0.5) * (fx.screenShake || 0) * 8 * t;
    }
  }

  if (rippleActive) { rippleT += dt / 400; if (rippleT >= 1) rippleActive = false; }
  if (chromaticActive) { chromaticT += dt / 300; if (chromaticT >= 1) chromaticActive = false; }

  const targetVignette = lives === 1 ? 0.45 : lives === 2 ? 0.2 : 0;
  vignetteAlpha = lerp(vignetteAlpha, targetVignette + (fx.vignette || 0) * 0.1, 0.04);

  bgScanY = (bgScanY + dt * 0.04) % canvas.height;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.r += 4;
    s.life = 1 - (s.r - s.maxR * 0.1) / (s.maxR * 0.9);
    if (s.life <= 0) shockwaves.splice(i, 1);
  }
  for (let i = inkBlots.length - 1; i >= 0; i--) {
    const b = inkBlots[i]; b.life -= b.decay;
    if (b.life <= 0) inkBlots.splice(i, 1);
  }
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.x += e.vx; e.y += e.vy;
    e.vy -= 0.06;
    e.life -= e.decay;
    if (e.life <= 0) embers.splice(i, 1);
  }

  for (let i = circles.length - 1; i >= 0; i--) {
    const c = circles[i];
    if ((c.vx || 0) !== 0) { c.x += c.vx; c.y += c.vy; }
    if (fx.magnetStrength > 0 && touching && !c.phantom) {
      const dx = touchX - c.x, dy = touchY - c.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) { c.x += (dx / d) * fx.magnetStrength; c.y += (dy / d) * fx.magnetStrength; }
    }
    if (frameTime - c.born > c.life) {
      circles.splice(i, 1);
      if (!c.phantom) loseLife();
    }
  }

  if (touching) {
    if ((fx.trailEmbers || 0) > 0 && Math.random() < fx.trailEmbers * 0.3) {
      embers.push({
        x: touchX + rand(-4, 4), y: touchY + rand(-4, 4),
        vx: rand(-0.6, 0.6), vy: rand(-1.5, -0.5),
        life: 1, decay: rand(0.02, 0.05),
        r: rand(1.5, 3.5),
        color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
      });
    }
    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i];
      if (dist(touchX, touchY, c.x, c.y) < c.r + 12) {
        hitCircle(c, touchX, touchY);
        break;
      }
    }
  }

  if ((fx.trailGhost || 0) > 0 && touching && frameTime % 3 < 1.5) {
    if (trail.length > 0) trailGhost.push({ ...trail[trail.length - 1], born: frameTime });
    if (trailGhost.length > 80) trailGhost.shift();
  }

  draw();
}

function draw() {
  const ca = (fx.chromatic || 0) > 0 && chromaticActive
    ? Math.sin(chromaticT * Math.PI) * fx.chromatic * 6 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground();

  for (const b of inkBlots) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(15,10,8,${b.life * 0.85})`;
    ctx.fill();
  }

  if (ca > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.4;
    drawTrailAt(-ca, 0, '#ff2200');
    drawTrailAt(ca, 0, '#0044ff');
    ctx.restore();
  }
  drawTrailAt(0, 0, null);

  if ((fx.trailGhost || 0) > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 / fx.trailGhost;
    for (let i = 1; i < trailGhost.length; i++) {
      const t = i / trailGhost.length;
      ctx.beginPath();
      ctx.moveTo(trailGhost[i-1].x, trailGhost[i-1].y);
      ctx.lineTo(trailGhost[i].x, trailGhost[i].y);
      ctx.strokeStyle = `rgba(200,180,160,${t * 0.6})`;
      ctx.lineWidth = (fx.trailWidth || 2.5) * 0.6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const e of embers) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * e.life, 0, Math.PI * 2);
    ctx.fillStyle = e.color.replace(')', `,${e.life})`).replace('rgb', 'rgba');
    ctx.fill();
  }

  for (const s of shockwaves) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245,242,236,${s.life * 0.55})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    const col = p.color || 'rgba(245,242,236,';
    if (p.color) {
      ctx.fillStyle = p.color.includes('rgba') ? p.color : `rgba(200,30,50,${p.life})`;
    } else {
      ctx.fillStyle = `rgba(245,242,236,${p.life})`;
    }
    ctx.fill();
  }

  drawCircles();

  if (touching) {
    const g = ctx.createRadialGradient(touchX, touchY, 0, touchX, touchY, 28);
    g.addColorStop(0, 'rgba(245,242,236,0.3)');
    g.addColorStop(1, 'rgba(245,242,236,0)');
    ctx.beginPath();
    ctx.arc(touchX, touchY, 28, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  drawVignette();
  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = '#080808';
  ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let y = bgScanY % 4; y < canvas.height; y += 4) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, y, canvas.width, 1);
  }
  ctx.restore();
}

function drawTrailAt(offsetX, offsetY, tintColor) {
  if (trail.length < 2) return;
  const maxLen = fx.trailLength || 40;
  const trailSlice = trail.slice(-maxLen);

  for (let i = 1; i < trailSlice.length; i++) {
    const t     = i / trailSlice.length;
    const p0    = trailSlice[i - 1];
    const p1    = trailSlice[i];
    const alpha = t * 0.92;

    let color;
    if (tintColor) {
      color = tintColor.includes('#') ? hexToRgba(tintColor, alpha) : tintColor;
    } else if ((fx.trailSpectral || 0) > 0) {
      const idx = Math.floor((i / trailSlice.length) * SPECTRAL.length * fx.trailSpectral) % SPECTRAL.length;
      color = hexToRgba(SPECTRAL[idx], alpha);
    } else {
      color = `rgba(245,242,236,${alpha})`;
    }

    if ((fx.trailGlow || 0) > 0) {
      ctx.beginPath();
      ctx.moveTo(p0.x + offsetX, p0.y + offsetY);
      ctx.lineTo(p1.x + offsetX, p1.y + offsetY);
      ctx.strokeStyle = `rgba(245,242,236,${alpha * 0.18})`;
      ctx.lineWidth = (fx.trailWidth || 2.5) + fx.trailGlow * 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(p0.x + offsetX, p0.y + offsetY);
    ctx.lineTo(p1.x + offsetX, p1.y + offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = fx.trailWidth || 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function drawCircles() {
  const now = frameTime;
  for (const c of circles) {
    const age   = now - c.born;
    const lifeT = age / c.life;
    const alpha = lifeT > 0.75 ? 1 - (lifeT - 0.75) / 0.25 : 1;

    const isPhantom = c.phantom;
    const baseColor = isPhantom ? '200,50,80' : '245,242,236';

    if ((fx.circlePulse || 0) > 0 && !isPhantom) {
      const pulseT = (now * 0.002 + c.pulsePhase) % 1;
      const pR = c.r + pulseT * 35 * fx.circlePulse;
      const pA = (1 - pulseT) * 0.28 * alpha;
      ctx.beginPath();
      ctx.arc(c.x, c.y, pR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${baseColor},${pA})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if ((fx.circleAura || 0) > 0 && !isPhantom) {
      const auraAlpha = (1 - lifeT) * 0.35 * fx.circleAura * alpha;
      const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.5, c.x, c.y, c.r * 2.5);
      g.addColorStop(0, `rgba(245,220,180,${auraAlpha})`);
      g.addColorStop(1, 'rgba(245,220,180,0)');
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    if (isPhantom) {
      const ghostT = (now * 0.003 + c.glowPhase) % 1;
      const ghostA = (0.5 + Math.sin(ghostT * Math.PI * 2) * 0.3) * alpha;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220,40,60,${ghostA * 0.4})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lifeT));
    ctx.strokeStyle = `rgba(${baseColor},${0.35 * alpha})`;
    ctx.lineWidth = isPhantom ? 2 : 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${baseColor},${alpha})`;
    ctx.lineWidth = isPhantom ? 2.5 : 1.5;
    ctx.stroke();

    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, `rgba(${baseColor},${0.1 * alpha})`);
    g.addColorStop(1, `rgba(${baseColor},0)`);
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function drawVignette() {
  if (vignetteAlpha <= 0.01) return;
  const gx = ctx.createRadialGradient(
    canvas.width/2, canvas.height/2, canvas.height * 0.3,
    canvas.width/2, canvas.height/2, canvas.height * 0.85
  );
  gx.addColorStop(0, 'rgba(100,0,0,0)');
  gx.addColorStop(1, `rgba(80,0,0,${vignetteAlpha})`);
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getPos(e) {
  return e.touches
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX, y: e.clientY };
}

canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'playing') return;
  touching = true;
  const p = getPos(e);
  touchX = p.x; touchY = p.y;
  lastTouchX = p.x; lastTouchY = p.y;
  touchSpeed = 0;
  trail = [{ x: p.x, y: p.y }];
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (state !== 'playing' || !touching) return;
  const p = getPos(e);
  touchSpeed = dist(p.x, p.y, touchX, touchY);
  lastTouchX = touchX; lastTouchY = touchY;
  touchX = p.x; touchY = p.y;
  trail.push({ x: p.x, y: p.y });
  if (trail.length > 400) trail.shift();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('pointerup', (e) => {
  if (state !== 'playing') return;
  touching = false; trail = []; touchSpeed = 0;
  loseLife();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('pointercancel', (e) => {
  if (state !== 'playing') return;
  touching = false; trail = []; touchSpeed = 0;
  loseLife();
  e.preventDefault();
}, { passive: false });

let skillTreeFrom = 'menu';

function openSkillTree(from) {
  skillTreeFrom = from;
  state = 'skilltree';
  hide('menu'); hide('gameover');
  show('skilltree'); show('st-close');
  renderSkillTree();
}

function closeSkillTree() {
  hide('skilltree'); hide('st-close');
  if (skillTreeFrom === 'gameover') { show('gameover'); }
  else { state = 'menu'; show('menu'); }
}

document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('btn-skills').addEventListener('click', () => openSkillTree('menu'));
document.getElementById('btn-skills2').addEventListener('click', () => openSkillTree('gameover'));
document.getElementById('btn-menu').addEventListener('click', () => { state = 'menu'; hide('gameover'); show('menu'); });
document.getElementById('st-close').addEventListener('click', closeSkillTree);

show('menu');
