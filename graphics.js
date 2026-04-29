// graphics.js — Garden Grove Rendering Engine
// Pixel-art style with: smooth shading, dynamic lighting, sun rays, wind leaf physics

export const PX = 4; // pixel size — each "pixel" is 4x4 real pixels

// ─── Palette ─────────────────────────────────────────────────────────────────
export const P = {
  // Sky
  skyTop:       '#1a6ea8',
  skyMid:       '#4da6d4',
  skyHorizon:   '#a8d8f0',
  sunCore:      '#fff7c0',
  sunGlow:      '#ffe066',
  sunRay:       'rgba(255,240,120,0.07)',
  cloudWhite:   '#f0f8ff',
  cloudShadow:  '#c8ddf0',

  // Terrain
  grassTop:     '#5cb85c',
  grassMid:     '#4a9e4a',
  grassDark:    '#356e35',
  grassShadow:  '#2a5528',
  dirtTop:      '#9e6b3a',
  dirtMid:      '#7a5028',
  dirtDark:     '#5a3818',
  pathTop:      '#c8a86a',
  pathMid:      '#a88848',
  waterShallow: '#5baad4',
  waterDeep:    '#2a6ea8',
  waterFoam:    '#a0d8f0',
  waterShine:   'rgba(255,255,255,0.35)',

  // Bark
  barkLight:    '#b07840',
  barkMid:      '#8a5828',
  barkDark:     '#5a3410',
  barkShadow:   '#3a2008',

  // Leaves — Oak
  oakLight:     '#78d448',
  oakMid:       '#4ea830',
  oakDark:      '#306820',
  oakShadow:    '#1e4812',
  oakHighlight: '#a0f060',

  // Leaves — Pine
  pineLight:    '#50c840',
  pineMid:      '#309820',
  pineDark:     '#1e6810',
  pineHighlight:'#78e860',

  // Flowers
  pink1:        '#f060a0',
  pink2:        '#d04080',
  yellow1:      '#f8d840',
  yellow2:      '#d0a800',
  red1:         '#e83030',
  red2:         '#a01818',
  purple1:      '#a050e0',
  purple2:      '#6820b0',
  blue1:        '#40a0f0',
  blue2:        '#1060c0',
  petal:        '#fff0f8',
  center:       '#f8c020',

  // Bush
  bushLight:    '#68c840',
  bushMid:      '#489828',
  bushDark:     '#2e6018',
  berryRed:     '#d02020',
  berryBlue:    '#2030d0',

  // Sunflower
  sunPetal:     '#f8c820',
  sunPetal2:    '#d09800',
  sunCenter:    '#5a3010',
  stemGreen:    '#48a028',

  // Mushroom
  capRed:       '#e03028',
  capSpot:      '#f8f0e0',
  stemWhite:    '#e8e0d0',
  stemShadow:   '#b8a890',

  // Misc
  stone1:       '#909090',
  stone2:       '#686868',
  stone3:       '#b0b0b0',
  gnomeRed:     '#e03030',
  gnomeSkin:    '#f0c080',
  gnomeBlue:    '#3050c0',
  fenceWood:    '#c08840',
  fenceWood2:   '#906020',
  wellStone:    '#909090',
  wellRope:     '#c09040',
  transparent:  'transparent',

  // Lighting
  sunLight:     'rgba(255,240,160,0.18)',
  shadowOverlay:'rgba(20,40,10,0.22)',
  ambientLight: 'rgba(200,240,160,0.08)',
};

// ─── Pixel Drawing Helpers ────────────────────────────────────────────────────
/** Draw a single "pixel" (PX×PX rectangle) */
export function px(ctx, x, y, color) {
  if (!color || color === 'transparent') return;
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, PX, PX);
}

/** Draw a row of pixels */
function row(ctx, startX, y, colors) {
  for (let i = 0; i < colors.length; i++) px(ctx, startX + i, y, colors[i]);
}

/** Draw a filled rectangle in pixel units */
export function pxRect(ctx, x, y, w, h, color) {
  if (!color || color === 'transparent') return;
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

/** Draw a shaded pixel rect — top-left lighter, bottom-right darker */
export function pxShaded(ctx, x, y, w, h, colorMid, colorLight, colorDark) {
  pxRect(ctx, x, y, w, h, colorMid);
  // top edge highlight
  pxRect(ctx, x, y, w, 1, colorLight);
  // left edge highlight
  pxRect(ctx, x, y, 1, h, colorLight);
  // bottom edge shadow
  pxRect(ctx, x, y + h - 1, w, 1, colorDark);
  // right edge shadow
  pxRect(ctx, x + w - 1, y, 1, h, colorDark);
}

/** Draw an ellipse in pixel units */
function pxEllipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx * PX + PX/2, cy * PX + PX/2, rx * PX, ry * PX, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a circle in pixel units */
function pxCircle(ctx, cx, cy, r, color) {
  pxEllipse(ctx, cx, cy, r, r, color);
}

// ─── Wind System ──────────────────────────────────────────────────────────────
export class WindSystem {
  constructor() {
    this.time     = 0;
    this.strength = 0.6;   // 0–1
    this.gusts    = [];
    this.gustTimer = 0;
  }
  update(dt, speed) {
    this.time += dt * 0.001 * speed;
    this.gustTimer -= dt * speed;
    if (this.gustTimer <= 0) {
      this.gusts.push({ t: 0, strength: 0.5 + Math.random() * 1.5, dur: 1500 + Math.random() * 2000 });
      this.gustTimer = 2000 + Math.random() * 4000;
    }
    this.gusts = this.gusts.filter(g => {
      g.t += dt * speed;
      return g.t < g.dur;
    });
  }
  /** Returns wind offset in pixels at a given vertical position (higher = more sway) */
  getSway(px_x, px_y, heightFactor = 1) {
    let base = Math.sin(this.time * 1.2 + px_x * 0.05) * 2.5
             + Math.sin(this.time * 2.7 + px_x * 0.08) * 1.0;
    for (const g of this.gusts) {
      const pct = g.t / g.dur;
      const env = Math.sin(pct * Math.PI); // fade in/out
      base += Math.sin(this.time * 4 + px_x * 0.1) * g.strength * env * 3;
    }
    return base * heightFactor;
  }
}

export const wind = new WindSystem();

// ─── Lighting System ──────────────────────────────────────────────────────────
export class LightingSystem {
  constructor() {
    this.sunX   = 0.75; // 0–1 normalized
    this.sunY   = 0.12;
    this.time   = 0;
  }
  update(dt, speed) {
    this.time += dt * 0.0001 * speed;
    // Gentle sun bob
    this.sunY = 0.10 + Math.sin(this.time * 0.5) * 0.02;
  }
  /** Get sun-facing brightness for a position (0–1) */
  getBrightness(nx, ny) {
    const dx = nx - this.sunX;
    const dy = ny - this.sunY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, 1 - dist * 0.8);
  }
}
export const lighting = new LightingSystem();

// ─── Sky Renderer ─────────────────────────────────────────────────────────────
export function drawSky(ctx, W, H, lightSys, t) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  skyGrad.addColorStop(0,   '#0e4a7a');
  skyGrad.addColorStop(0.4, '#2e7fbb');
  skyGrad.addColorStop(1,   '#8ed4f0');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.55);

  // Sun glow
  const sunPX = lightSys.sunX * W;
  const sunPY = lightSys.sunY * H;
  const glowR = W * 0.12;

  const sunGlow = ctx.createRadialGradient(sunPX, sunPY, 0, sunPX, sunPY, glowR * 2.5);
  sunGlow.addColorStop(0,    'rgba(255,255,200,0.5)');
  sunGlow.addColorStop(0.3,  'rgba(255,230,100,0.2)');
  sunGlow.addColorStop(1,    'rgba(255,200,50,0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, H * 0.55);

  // Sun disc (pixel art circles)
  const grd = ctx.createRadialGradient(sunPX, sunPY, 0, sunPX, sunPY, glowR * 0.18);
  grd.addColorStop(0, '#fffce0');
  grd.addColorStop(1, '#ffe060');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(sunPX, sunPY, glowR * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Sun rays
  ctx.save();
  ctx.translate(sunPX, sunPY);
  const numRays = 16;
  for (let i = 0; i < numRays; i++) {
    const angle  = (i / numRays) * Math.PI * 2 + t * 0.0002;
    const rayLen = W * (0.25 + (i % 3) * 0.1);
    const rayW   = Math.PI * 0.018;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, rayLen, angle - rayW, angle + rayW);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,248,160,${0.04 + (i % 2) * 0.02})`;
    ctx.fill();
  }
  ctx.restore();

  // Atmospheric haze near horizon
  const hazeGrad = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.55);
  hazeGrad.addColorStop(0, 'rgba(200,235,255,0)');
  hazeGrad.addColorStop(1, 'rgba(210,240,255,0.45)');
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, H * 0.35, W, H * 0.2);
}

// ─── Cloud Renderer ───────────────────────────────────────────────────────────
export function drawCloud(ctx, cx, cy, scale) {
  const blobs = [
    [0, 0, 28, 18], [-20, 8, 22, 14], [22, 6, 24, 15],
    [-10, 14, 30, 12], [10, 12, 32, 13],
  ];
  for (const [bx, by, bw, bh] of blobs) {
    // Shadow
    const shadowGrad = ctx.createRadialGradient(
      (cx + bx) * scale, (cy + by + bh * 0.6) * scale, 0,
      (cx + bx) * scale, (cy + by) * scale, bw * scale
    );
    shadowGrad.addColorStop(0, 'rgba(180,210,240,0.5)');
    shadowGrad.addColorStop(1, 'rgba(240,250,255,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse((cx + bx) * scale, (cy + by) * scale, bw * scale, bh * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    // Main
    ctx.fillStyle = 'rgba(245,252,255,0.92)';
    ctx.beginPath();
    ctx.ellipse((cx + bx) * scale, (cy + by - 4) * scale, bw * scale * 0.9, bh * scale * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Terrain Renderers ────────────────────────────────────────────────────────
export function drawGrassTile(ctx, tx, ty, TS, sway) {
  const x = tx * TS, y = ty * TS;
  // Base gradient
  const g = ctx.createLinearGradient(x, y, x, y + TS);
  g.addColorStop(0,   '#6dc84a');
  g.addColorStop(0.3, '#58a838');
  g.addColorStop(1,   '#386828');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TS, TS);

  // Pixel grass blades on top row
  const blades = [2, 5, 8, 11, 14, 17, 20];
  for (const bx of blades) {
    const sw = sway * (0.5 + Math.sin(bx * 1.3) * 0.5);
    ctx.fillStyle = '#88e050';
    ctx.fillRect(x + bx + sw, y, 2, 6);
    ctx.fillStyle = '#a0f068';
    ctx.fillRect(x + bx + sw, y, 1, 4);
  }

  // Subtle dither noise
  ctx.fillStyle = 'rgba(0,60,0,0.08)';
  for (let i = 0; i < 8; i++) {
    const nx = (tx * 7 + i * 3) % TS;
    const ny = (ty * 5 + i * 7) % TS + 4;
    ctx.fillRect(x + nx, y + ny, 2, 2);
  }

  // Lighting tint
  const bright = lighting.getBrightness(tx / 25, ty / 18);
  ctx.fillStyle = `rgba(255,248,180,${bright * 0.12})`;
  ctx.fillRect(x, y, TS, TS);
}

export function drawDirtTile(ctx, tx, ty, TS) {
  const x = tx * TS, y = ty * TS;
  const g = ctx.createLinearGradient(x, y, x, y + TS);
  g.addColorStop(0, '#b07840');
  g.addColorStop(1, '#6a4020');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TS, TS);
  // Pebble noise
  ctx.fillStyle = 'rgba(90,50,20,0.3)';
  for (let i = 0; i < 6; i++) {
    const nx = (tx * 11 + i * 5) % (TS - 4);
    const ny = (ty * 7  + i * 9) % (TS - 4);
    ctx.fillRect(x + nx, y + ny, 3, 2);
  }
  ctx.fillStyle = 'rgba(180,130,80,0.25)';
  for (let i = 0; i < 4; i++) {
    const nx = (tx * 13 + i * 7) % (TS - 3);
    const ny = (ty * 9  + i * 3) % (TS - 3);
    ctx.fillRect(x + nx, y + ny, 2, 2);
  }
  const bright = lighting.getBrightness(tx / 25, ty / 18);
  ctx.fillStyle = `rgba(255,220,140,${bright * 0.1})`;
  ctx.fillRect(x, y, TS, TS);
}

export function drawPathTile(ctx, tx, ty, TS) {
  const x = tx * TS, y = ty * TS;
  const g = ctx.createLinearGradient(x, y, x + TS, y + TS);
  g.addColorStop(0, '#d4b870');
  g.addColorStop(1, '#a88040');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TS, TS);
  ctx.fillStyle = 'rgba(120,80,30,0.2)';
  for (let i = 0; i < 5; i++) {
    const nx = (tx * 9 + i * 6) % (TS - 3);
    const ny = (ty * 11 + i * 4) % (TS - 3);
    ctx.fillRect(x + nx, y + ny, 3, 2);
  }
}

export function drawWaterTile(ctx, tx, ty, TS, t) {
  const x = tx * TS, y = ty * TS;
  const phase = t * 0.001 + tx * 0.4 + ty * 0.3;
  const shine = (Math.sin(phase) * 0.5 + 0.5);
  const g = ctx.createLinearGradient(x, y, x, y + TS);
  g.addColorStop(0, `rgba(60,140,210,${0.7 + shine * 0.15})`);
  g.addColorStop(1, '#1a5a9a');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TS, TS);
  // Ripple lines
  const rippleY = (Math.sin(phase * 2) * 3 + 6) | 0;
  ctx.fillStyle = `rgba(160,220,255,${0.3 + shine * 0.3})`;
  ctx.fillRect(x + 2, y + rippleY,     TS - 4, 2);
  ctx.fillRect(x + 6, y + rippleY + 6, TS - 10, 1);
  // Reflection shine
  ctx.fillStyle = `rgba(255,255,255,${shine * 0.2})`;
  ctx.fillRect(x, y, TS, 3);
}

// ─── Plant Renderers ──────────────────────────────────────────────────────────

/** Draw a tree trunk */
function drawTrunk(ctx, cx, baseY, w, h) {
  const x = cx - w / 2;
  const g = ctx.createLinearGradient(x, baseY - h, x + w, baseY);
  g.addColorStop(0,   P.barkLight);
  g.addColorStop(0.4, P.barkMid);
  g.addColorStop(1,   P.barkDark);
  ctx.fillStyle = g;
  ctx.fillRect(x, baseY - h, w, h);
  // Left highlight
  ctx.fillStyle = 'rgba(200,150,80,0.4)';
  ctx.fillRect(x, baseY - h, 4, h);
  // Right shadow
  ctx.fillStyle = 'rgba(30,10,0,0.35)';
  ctx.fillRect(x + w - 4, baseY - h, 4, h);
  // Root flare
  ctx.fillStyle = P.barkDark;
  ctx.fillRect(x - 4, baseY - 10, w + 8, 10);
}

/** Draw a foliage cluster with wind + lighting */
function drawFoliage(ctx, cx, cy, rx, ry, colorMid, colorLight, colorDark, colorHighlight, swayX, swayY, brightFactor) {
  const sx = cx + swayX;
  const sy = cy + swayY;

  // Shadow beneath canopy
  ctx.fillStyle = 'rgba(20,50,10,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + ry * 0.6, rx * 0.85, ry * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base foliage — dark (back)
  const backG = ctx.createRadialGradient(sx - rx * 0.2, sy + ry * 0.2, 0, sx, sy, rx * 1.1);
  backG.addColorStop(0,   colorDark);
  backG.addColorStop(0.7, colorDark);
  backG.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = backG;
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mid layer
  const midG = ctx.createRadialGradient(sx - rx * 0.1, sy - ry * 0.1, rx * 0.1, sx, sy, rx * 0.9);
  midG.addColorStop(0,   colorMid);
  midG.addColorStop(0.6, colorMid);
  midG.addColorStop(1,   colorDark);
  ctx.fillStyle = midG;
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Light layer (sun-facing)
  const lightG = ctx.createRadialGradient(sx - rx * 0.3, sy - ry * 0.3, 0, sx, sy, rx * 0.75);
  lightG.addColorStop(0,   colorLight);
  lightG.addColorStop(0.5, colorMid);
  lightG.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = lightG;
  ctx.beginPath();
  ctx.ellipse(sx - rx * 0.15, sy - ry * 0.2, rx * 0.7, ry * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight (sun glint)
  ctx.fillStyle = `rgba(200,255,160,${0.15 + brightFactor * 0.25})`;
  ctx.beginPath();
  ctx.ellipse(sx - rx * 0.3, sy - ry * 0.35, rx * 0.2, ry * 0.15, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Pixel dither leaves on edges
  ctx.fillStyle = colorHighlight;
  const numLeaves = 18;
  for (let i = 0; i < numLeaves; i++) {
    const a = (i / numLeaves) * Math.PI * 2;
    const lx = sx + Math.cos(a) * rx * (0.75 + Math.sin(i * 2.1) * 0.2);
    const ly = sy + Math.sin(a) * ry * (0.75 + Math.cos(i * 1.7) * 0.2);
    const ls = 3 + (i % 3);
    ctx.fillRect(lx - ls/2, ly - ls/2, ls, ls);
  }

  // Sun-ray tint
  ctx.fillStyle = `rgba(255,248,160,${brightFactor * 0.12})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a pine layer (triangle) with wind */
function drawPineLayer(ctx, cx, tipY, halfW, h, colorMid, colorLight, colorDark, swayX) {
  const sx = cx + swayX;
  ctx.beginPath();
  ctx.moveTo(sx,            tipY);
  ctx.lineTo(sx - halfW,    tipY + h);
  ctx.lineTo(sx + halfW,    tipY + h);
  ctx.closePath();
  const g = ctx.createLinearGradient(sx - halfW, tipY, sx + halfW, tipY + h);
  g.addColorStop(0,   colorLight);
  g.addColorStop(0.4, colorMid);
  g.addColorStop(1,   colorDark);
  ctx.fillStyle = g;
  ctx.fill();
  // Left highlight edge
  ctx.strokeStyle = 'rgba(140,240,100,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, tipY);
  ctx.lineTo(sx - halfW, tipY + h);
  ctx.stroke();
}

// ─── PLANT DRAW FUNCTIONS ─────────────────────────────────────────────────────

export function drawSapling(ctx, cx, baseY, swayX) {
  const sw = swayX * 0.3;
  // Stem
  ctx.strokeStyle = P.stemGreen;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.quadraticCurveTo(cx + sw * 0.5, baseY - 12, cx + sw, baseY - 20);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = '#78d448';
  ctx.beginPath();
  ctx.ellipse(cx + sw - 6, baseY - 22, 7, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + sw + 5, baseY - 20, 7, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a0f060';
  ctx.fillRect(cx + sw - 2, baseY - 26, 3, 6);
}

export function drawFlower(ctx, cx, baseY, petalColor1, petalColor2, swayX) {
  const sw = swayX * 0.4;
  // Stem with curve
  ctx.strokeStyle = P.stemGreen;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.quadraticCurveTo(cx + sw * 0.5, baseY - 16, cx + sw, baseY - 28);
  ctx.stroke();
  // Leaves on stem
  ctx.fillStyle = '#58b030';
  ctx.beginPath();
  ctx.ellipse(cx + sw * 0.4 - 6, baseY - 14, 8, 4, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Petals
  const fx = cx + sw, fy = baseY - 34;
  const petals = 5;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const px2 = fx + Math.cos(a) * 9;
    const py2 = fy + Math.sin(a) * 9;
    const g = ctx.createRadialGradient(px2, py2, 0, px2, py2, 10);
    g.addColorStop(0, petalColor1);
    g.addColorStop(1, petalColor2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px2, py2, 8, 5, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center
  const cg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7);
  cg.addColorStop(0, '#fff8a0');
  cg.addColorStop(1, P.center);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(fx, fy, 7, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBush(ctx, cx, baseY, withFlowers, swayX) {
  const sw = swayX * 0.5;
  drawTrunk(ctx, cx, baseY, 8, 10);
  // Main bush body — multiple overlapping foliage blobs
  const blobs = [
    [0,   -14, 20, 14],
    [-14, -8,  16, 11],
    [14,  -8,  16, 11],
    [0,   -22, 18, 12],
  ];
  for (const [bx, by, rx, ry] of blobs) {
    const bsw = sw * (1 + Math.abs(bx) * 0.02);
    drawFoliage(ctx, cx + bx + bsw, baseY + by, rx, ry,
      P.bushMid, P.bushLight, P.bushDark, '#88e058', bsw * 0.1, 0, 0.6);
  }
  if (withFlowers) {
    const flowerPositions = [[-10, -28], [8, -24], [-4, -32], [12, -18], [-16, -18]];
    const colors = [['#f060a0','#d04080'],['#f8d840','#c09800'],['#e83030','#a01010']];
    for (let i = 0; i < flowerPositions.length; i++) {
      const [fpx, fpy] = flowerPositions[i];
      const [c1, c2] = colors[i % colors.length];
      const fsx = cx + fpx + sw * 1.1;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.fillStyle = c1;
        ctx.beginPath();
        ctx.ellipse(fsx + Math.cos(a) * 6, baseY + fpy + Math.sin(a) * 6, 5, 3, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = P.center;
      ctx.beginPath();
      ctx.arc(fsx, baseY + fpy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawBerryBush(ctx, cx, baseY, swayX) {
  const sw = swayX * 0.5;
  drawTrunk(ctx, cx, baseY, 8, 10);
  const blobs = [[0,-14,18,13],[-12,-8,15,10],[12,-8,15,10],[0,-20,16,11]];
  for (const [bx, by, rx, ry] of blobs) {
    drawFoliage(ctx, cx + bx + sw, baseY + by, rx, ry,
      P.bushMid, P.bushLight, P.bushDark, '#80e050', sw * 0.1, 0, 0.6);
  }
  // Berries
  const berries = [[-8,-26,'#cc2020'],[6,-22,'#cc2020'],[-2,-30,'#cc2020'],
                    [10,-18,'#3040cc'],[-14,-16,'#3040cc'],[4,-28,'#3040cc']];
  for (const [bx, by, bc] of berries) {
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.arc(cx + bx + sw * 1.1, baseY + by, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(cx + bx + sw * 1.1 - 1.5, baseY + by - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawOakTree(ctx, cx, baseY, swayX, brightFactor) {
  drawTrunk(ctx, cx, baseY, 14, 40);
  // Main canopy — layered for depth
  const layers = [
    [0,   -48, 34, 26, 0.0],
    [-20, -38, 26, 20, 0.3],
    [20,  -38, 26, 20, 0.7],
    [0,   -60, 28, 22, 0.5],
    [-12, -54, 22, 18, 0.2],
    [12,  -54, 22, 18, 0.8],
  ];
  for (const [bx, by, rx, ry, phase] of layers) {
    const lsw = swayX * (1 + Math.abs(bx) * 0.02 + (-by / 60) * 0.5);
    drawFoliage(ctx, cx + bx, baseY + by, rx, ry,
      P.oakMid, P.oakLight, P.oakDark, P.oakHighlight,
      lsw, swayX * 0.15 * Math.sin(phase * Math.PI), brightFactor);
  }
}

export function drawPineTree(ctx, cx, baseY, swayX, brightFactor) {
  drawTrunk(ctx, cx, baseY, 10, 30);
  // Pine layers from bottom to top
  const layers = [
    [baseY - 28, 32, 18],
    [baseY - 44, 26, 16],
    [baseY - 58, 22, 14],
    [baseY - 70, 18, 12],
    [baseY - 80, 14, 10],
    [baseY - 88, 10,  8],
  ];
  for (let i = 0; i < layers.length; i++) {
    const [ty, halfW, h] = layers[i];
    const heightF = (i / layers.length);
    const lsw = swayX * (0.3 + heightF * 1.2);
    drawPineLayer(ctx, cx + lsw, ty, halfW, h,
      P.pineMid, P.pineLight, P.pineDark, lsw * 0.05);
  }
  // Tip
  ctx.fillStyle = P.pineHighlight;
  ctx.beginPath();
  ctx.moveTo(cx + swayX * 1.5, baseY - 96);
  ctx.lineTo(cx + swayX * 1.5 - 4, baseY - 88);
  ctx.lineTo(cx + swayX * 1.5 + 4, baseY - 88);
  ctx.closePath();
  ctx.fill();
}

export function drawBigTree(ctx, cx, baseY, swayX, brightFactor) {
  drawTrunk(ctx, cx, baseY, 22, 60);
  // Massive layered canopy
  const layers = [
    [0,   -72, 50, 38, 0.0],
    [-28, -58, 38, 28, 0.2],
    [28,  -58, 38, 28, 0.8],
    [0,   -88, 44, 34, 0.5],
    [-18, -78, 34, 26, 0.3],
    [18,  -78, 34, 26, 0.7],
    [-8,  -100,36, 28, 0.1],
    [8,   -100,36, 28, 0.9],
    [0,   -112,30, 24, 0.5],
  ];
  for (const [bx, by, rx, ry, phase] of layers) {
    const lsw = swayX * (1 + Math.abs(bx) * 0.015 + (-by / 90) * 0.8);
    drawFoliage(ctx, cx + bx, baseY + by, rx, ry,
      P.oakMid, P.oakLight, P.oakDark, P.oakHighlight,
      lsw, swayX * 0.2 * Math.sin(phase * Math.PI), brightFactor);
  }
}

export function drawSunflower(ctx, cx, baseY, swayX) {
  const sw = swayX * 0.5;
  ctx.strokeStyle = P.stemGreen;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.quadraticCurveTo(cx + sw * 0.6, baseY - 30, cx + sw, baseY - 55);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = '#58a830';
  ctx.beginPath();
  ctx.ellipse(cx + sw * 0.4 - 10, baseY - 22, 14, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + sw * 0.4 + 10, baseY - 32, 14, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Petals
  const fx = cx + sw, fy = baseY - 62;
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2;
    const g = ctx.createLinearGradient(fx, fy, fx + Math.cos(a) * 18, fy + Math.sin(a) * 18);
    g.addColorStop(0, P.sunPetal);
    g.addColorStop(1, P.sunPetal2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(fx + Math.cos(a) * 16, fy + Math.sin(a) * 16, 8, 4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center disc
  const cg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 12);
  cg.addColorStop(0, '#8a5020');
  cg.addColorStop(0.6, P.sunCenter);
  cg.addColorStop(1, '#2a1000');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(fx, fy, 12, 0, Math.PI * 2);
  ctx.fill();
}

export function drawMushroom(ctx, cx, baseY, swayX) {
  const sw = swayX * 0.2;
  // Stem
  const sg = ctx.createLinearGradient(cx - 7, baseY - 18, cx + 7, baseY);
  sg.addColorStop(0, '#e8e0d0');
  sg.addColorStop(1, '#b0a890');
  ctx.fillStyle = sg;
  ctx.fillRect(cx - 7 + sw, baseY - 18, 14, 18);
  // Cap shadow
  ctx.fillStyle = 'rgba(20,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx + sw, baseY - 16, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cap
  const capG = ctx.createRadialGradient(cx + sw - 6, baseY - 30, 0, cx + sw, baseY - 20, 24);
  capG.addColorStop(0, '#f05040');
  capG.addColorStop(0.5, P.capRed);
  capG.addColorStop(1, '#801010');
  ctx.fillStyle = capG;
  ctx.beginPath();
  ctx.ellipse(cx + sw, baseY - 22, 22, 16, 0, 0, Math.PI, true);
  ctx.fill();
  // Spots
  const spots = [[-4, -30, 5], [9, -26, 4], [-10, -25, 3.5], [2, -36, 3]];
  for (const [sx, sy, sr] of spots) {
    ctx.fillStyle = P.capSpot;
    ctx.beginPath();
    ctx.arc(cx + sw + sx, baseY + sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCactus(ctx, cx, baseY, swayX) {
  const sw = swayX * 0.15;
  // Main column
  const g = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
  g.addColorStop(0, '#78c040');
  g.addColorStop(0.3, '#58a028');
  g.addColorStop(1, '#386018');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 8 + sw, baseY - 60, 16, 60);
  // Rounded top
  ctx.beginPath();
  ctx.arc(cx + sw, baseY - 60, 8, Math.PI, 0);
  ctx.fill();
  // Arms
  ctx.fillRect(cx - 22 + sw, baseY - 44, 14, 10);
  ctx.beginPath();
  ctx.arc(cx - 22 + sw, baseY - 44, 5, Math.PI, Math.PI * 1.5);
  ctx.fill();
  ctx.fillRect(cx - 22 + sw, baseY - 44, 8, 22);
  ctx.fillRect(cx + 8  + sw, baseY - 38, 14, 10);
  ctx.beginPath();
  ctx.arc(cx + 22 + sw, baseY - 38, 5, Math.PI * 1.5, 0);
  ctx.fill();
  ctx.fillRect(cx + 14 + sw, baseY - 38, 8, 18);
  // Spines
  ctx.strokeStyle = '#f0e0a0';
  ctx.lineWidth = 1.5;
  const spines = [[0,-50],[0,-40],[0,-30],[-22,-36],[-22,-28],[22,-30],[22,-22]];
  for (const [spx, spy] of spines) {
    ctx.beginPath();
    ctx.moveTo(cx + spx + sw - 6, baseY + spy);
    ctx.lineTo(cx + spx + sw - 12, baseY + spy - 3);
    ctx.moveTo(cx + spx + sw + 6, baseY + spy);
    ctx.lineTo(cx + spx + sw + 12, baseY + spy - 3);
    ctx.stroke();
  }
  // Highlight
  ctx.fillStyle = 'rgba(160,255,100,0.18)';
  ctx.fillRect(cx - 6 + sw, baseY - 58, 5, 56);
}

export function drawStone(ctx, cx, baseY) {
  const g = ctx.createRadialGradient(cx - 8, baseY - 14, 0, cx, baseY - 8, 20);
  g.addColorStop(0, '#c0c0c0');
  g.addColorStop(0.5, '#909090');
  g.addColorStop(1, '#505050');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 8, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx - 5, baseY - 12, 7, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFence(ctx, cx, baseY) {
  ctx.fillStyle = P.fenceWood;
  ctx.fillRect(cx - 2, baseY - 30, 4, 30);
  ctx.fillStyle = P.fenceWood2;
  ctx.fillRect(cx - 14, baseY - 22, 28, 5);
  ctx.fillRect(cx - 14, baseY - 12, 28, 5);
  ctx.fillStyle = 'rgba(255,220,140,0.3)';
  ctx.fillRect(cx - 14, baseY - 22, 28, 2);
  // Post points
  ctx.fillStyle = P.fenceWood;
  ctx.beginPath();
  ctx.moveTo(cx - 2, baseY - 30);
  ctx.lineTo(cx, baseY - 36);
  ctx.lineTo(cx + 2, baseY - 30);
  ctx.fill();
}

export function drawWell(ctx, cx, baseY) {
  // Base
  pxShaded(ctx, 0, 0, 0, 0, '', '', ''); // dummy
  const g = ctx.createLinearGradient(cx - 18, baseY - 20, cx + 18, baseY);
  g.addColorStop(0, '#a0a0a0');
  g.addColorStop(1, '#606060');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 18, baseY - 20, 36, 20);
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(cx - 10, baseY - 18, 20, 16);
  ctx.fillStyle = '#2a5090';
  ctx.fillRect(cx - 10, baseY - 15, 20, 13);
  // Roof
  ctx.fillStyle = '#8a5828';
  ctx.beginPath();
  ctx.moveTo(cx - 24, baseY - 20);
  ctx.lineTo(cx, baseY - 40);
  ctx.lineTo(cx + 24, baseY - 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(200,140,70,0.3)';
  ctx.fillRect(cx - 2, baseY - 40, 4, 20);
  // Rope
  ctx.strokeStyle = P.wellRope;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 22);
  ctx.lineTo(cx, baseY - 16);
  ctx.stroke();
  ctx.fillStyle = '#503010';
  ctx.fillRect(cx - 5, baseY - 16, 10, 4);
}

export function drawGnome(ctx, cx, baseY) {
  // Shoes
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(cx - 10, baseY - 6, 9, 6);
  ctx.fillRect(cx + 1, baseY - 6, 9, 6);
  // Body
  const bg = ctx.createLinearGradient(cx - 8, baseY - 24, cx + 8, baseY - 6);
  bg.addColorStop(0, '#4060d0');
  bg.addColorStop(1, '#203090');
  ctx.fillStyle = bg;
  ctx.fillRect(cx - 9, baseY - 24, 18, 18);
  // Belt
  ctx.fillStyle = '#c09020';
  ctx.fillRect(cx - 9, baseY - 12, 18, 3);
  ctx.fillStyle = '#f0d020';
  ctx.fillRect(cx - 3, baseY - 13, 6, 5);
  // Head
  ctx.fillStyle = P.gnomeSkin;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 30, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beard
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 24, 8, 6, 0, 0, Math.PI);
  ctx.fill();
  // Hat
  const hg = ctx.createLinearGradient(cx - 10, baseY - 50, cx + 2, baseY - 38);
  hg.addColorStop(0, '#e04040');
  hg.addColorStop(1, '#901010');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(cx - 10, baseY - 38);
  ctx.lineTo(cx + 2, baseY - 56);
  ctx.lineTo(cx + 10, baseY - 38);
  ctx.closePath();
  ctx.fill();
  // Hat brim
  ctx.fillStyle = '#c02020';
  ctx.fillRect(cx - 12, baseY - 39, 24, 4);
  // Eyes
  ctx.fillStyle = '#2a1800';
  ctx.fillRect(cx - 5, baseY - 32, 3, 3);
  ctx.fillRect(cx + 2, baseY - 32, 3, 3);
  // Cheeks
  ctx.fillStyle = 'rgba(220,100,80,0.5)';
  ctx.beginPath();
  ctx.arc(cx - 7, baseY - 28, 3, 0, Math.PI * 2);
  ctx.arc(cx + 7, baseY - 28, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Post-processing: Sunray Overlay ─────────────────────────────────────────
export function drawSunRaysOverlay(ctx, W, H, lightSys, t) {
  const sunPX = lightSys.sunX * W;
  const sunPY = lightSys.sunY * H;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const numRays = 8;
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2 + t * 0.00015;
    const rayLen = Math.max(W, H) * 1.5;
    const rayW   = 0.04 + (i % 3) * 0.02;

    const g = ctx.createConicalGradient
      ? null // not standard; use radial instead
      : null;

    ctx.beginPath();
    ctx.moveTo(sunPX, sunPY);
    ctx.arc(sunPX, sunPY, rayLen, angle - rayW, angle + rayW);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,240,140,${0.018 + (i % 2) * 0.01})`;
    ctx.fill();
  }
  ctx.restore();
}

// ─── Ambient Shadow Overlay ───────────────────────────────────────────────────
export function drawAmbientShadow(ctx, W, H, lightSys) {
  // Darken tiles away from sun
  const sunPX = lightSys.sunX * W;
  const sunPY = lightSys.sunY * H;
  const g = ctx.createRadialGradient(sunPX, sunPY, 0, sunPX, sunPY, Math.max(W, H) * 1.2);
  g.addColorStop(0,   'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.04)');
  g.addColorStop(1,   'rgba(0,10,0,0.20)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ─── Ground Shadow for plants ─────────────────────────────────────────────────
export function drawGroundShadow(ctx, cx, baseY, radius) {
  const g = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, radius);
  g.addColorStop(0,   'rgba(0,20,0,0.35)');
  g.addColorStop(0.5, 'rgba(0,20,0,0.15)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, radius, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Bird drawing ─────────────────────────────────────────────────────────────
export function drawBird(ctx, x, y, flapPhase) {
  const wing = Math.sin(flapPhase) * 8;
  ctx.strokeStyle = '#2a3a5a';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 12, y + wing);
  ctx.quadraticCurveTo(x - 6, y, x, y);
  ctx.quadraticCurveTo(x + 6, y, x + 12, y + wing);
  ctx.stroke();
}

// ─── Particle System (falling leaves) ────────────────────────────────────────
export class LeafParticle {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.reset(true);
  }
  reset(init = false) {
    this.x = Math.random() * this.W;
    this.y = init ? Math.random() * this.H : -10;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = 0.5 + Math.random() * 1;
    this.rot = Math.random() * Math.PI * 2;
    this.rotV = (Math.random() - 0.5) * 0.08;
    this.size = 4 + Math.random() * 5;
    this.alpha = 0.6 + Math.random() * 0.4;
    this.color = ['#58a830','#78c848','#a0e060','#d0b840','#e07020'][Math.floor(Math.random() * 5)];
    this.swayPhase = Math.random() * Math.PI * 2;
  }
  update(dt, windSys, speed) {
    const sw = windSys.getSway(this.x, this.y, 0.6) * 0.04;
    this.x += (this.vx + sw) * speed;
    this.y += this.vy * speed;
    this.rot += this.rotV * speed;
    this.swayPhase += 0.04 * speed;
    this.x += Math.sin(this.swayPhase) * 0.4 * speed;
    if (this.y > this.H + 20) this.reset();
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,60,0,0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(this.size, 0);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
