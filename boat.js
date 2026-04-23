'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   BOAT.JS  —  3-D boat rendered on Canvas 2D overlay
   Physics:  buoyancy from wave height, pitch/roll, wake injection
   Controls: WASD / arrow keys (desktop)  +  virtual joystick (touch)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

/* ── wait until water sim is ready ── */
function waitAndInit() {
  if (!window.waterSim) { setTimeout(waitAndInit, 50); return; }
  init();
}
waitAndInit();

function init() {

/* ─────────────────── Canvas 2D overlay ─────────────────── */
const bc  = document.getElementById('boatCanvas');
const ctx = bc.getContext('2d');

/* ─────────────────── Boat state ─────────────────── */
const boat = {
  /* world position in UV space (0-1, 0-1) so it stays centred always */
  x: 0.5,
  y: 0.5,
  angle: 0,          /* heading in radians, 0 = right */
  speed: 0,
  pitch: 0,
  roll: 0,
  bobHeight: 0,      /* visual bob from waves */
  lastWake: 0,

  /* physics velocities */
  vx: 0,
  vy: 0,
  pitchVel: 0,
  rollVel: 0,
};

const MAX_SPEED   = 0.0022;
const ACCEL       = 0.00008;
const DECEL       = 0.97;
const TURN_SPEED  = 0.032;
const WAKE_RATE   = 80;    /* ms between wake drops */
const WAKE_STR    = 0.10;
const WAKE_RAD    = 0.028;
const BOUNCE_STR  = 8.0;   /* pitch/roll sensitivity to wave slope */

/* ─────────────────── Input state ─────────────────── */
const keys = { up:false, down:false, left:false, right:false };

document.addEventListener('keydown', e => {
  if (e.key==='ArrowUp'    || e.key==='w' || e.key==='W') keys.up    = true;
  if (e.key==='ArrowDown'  || e.key==='s' || e.key==='S') keys.down  = true;
  if (e.key==='ArrowLeft'  || e.key==='a' || e.key==='A') keys.left  = true;
  if (e.key==='ArrowRight' || e.key==='d' || e.key==='D') keys.right = true;
});
document.addEventListener('keyup', e => {
  if (e.key==='ArrowUp'    || e.key==='w' || e.key==='W') keys.up    = false;
  if (e.key==='ArrowDown'  || e.key==='s' || e.key==='S') keys.down  = false;
  if (e.key==='ArrowLeft'  || e.key==='a' || e.key==='A') keys.left  = false;
  if (e.key==='ArrowRight' || e.key==='d' || e.key==='D') keys.right = false;
});

/* ─────────────────── Virtual Joystick ─────────────────── */
const joystick = {
  active: false,
  baseX: 0,  baseY: 0,
  tipX:  0,  tipY:  0,
  dx: 0,     dy: 0,
  touchId: -1,
};
const JOY_RADIUS = 55;
const JOY_DEAD   = 0.12;

/* joystick lives on the boat canvas (pointer-events restored below) */
bc.style.pointerEvents = 'auto';
bc.style.cursor = 'default';

bc.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (joystick.active) continue;
    joystick.active  = true;
    joystick.touchId = t.identifier;
    joystick.baseX   = t.clientX;
    joystick.baseY   = t.clientY;
    joystick.tipX    = t.clientX;
    joystick.tipY    = t.clientY;
    joystick.dx = 0; joystick.dy = 0;
  }
}, { passive: false });

bc.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== joystick.touchId) continue;
    const rawDx = t.clientX - joystick.baseX;
    const rawDy = t.clientY - joystick.baseY;
    const dist  = Math.hypot(rawDx, rawDy);
    const clamp = Math.min(dist, JOY_RADIUS);
    const nx    = clamp / (dist || 1);
    joystick.tipX = joystick.baseX + rawDx * nx;
    joystick.tipY = joystick.baseY + rawDy * nx;
    joystick.dx = (rawDx / JOY_RADIUS) * nx;
    joystick.dy = (rawDy / JOY_RADIUS) * nx;
  }
}, { passive: false });

function releaseJoy(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joystick.touchId) {
      joystick.active = false;
      joystick.dx = 0; joystick.dy = 0;
    }
  }
}
bc.addEventListener('touchend',    releaseJoy, { passive: false });
bc.addEventListener('touchcancel', releaseJoy, { passive: false });

/* ─────────────────── Coordinate helpers ─────────────────── */
/* boat.x/y are 0-1 UV. Convert to screen pixels for drawing. */
function uvToScreen(u, v) {
  const sw = window.waterSim.screenW;
  const sh = window.waterSim.screenH;
  return { sx: u * sw, sy: v * sh };
}

/* ─────────────────── 3-D projection (simple perspective) ─────────────────── */
/*
  We draw a top-down world tilted in 3-D with a slight perspective.
  The boat is always centred on screen; the world scrolls by keeping
  boat.x/y as the UV "camera" position.  A rotation/tilt matrix maps
  local boat coordinates to screen pixels.

  Camera pitch ~35 deg so it looks slightly overhead-ish but 3-D.
*/

const CAM_PITCH  = 0.58;   /* radians, how much we tilt the camera down */
const CAM_SCALE  = 220;    /* pixels per "unit" at eye level */
const HORIZON_Y  = 0.38;   /* screen-fraction where horizon sits */

function project(lx, ly, lz) {
  /* rotate by boat heading so boat always faces up on screen */
  const cosA = Math.cos(-boat.angle - Math.PI / 2);
  const sinA = Math.sin(-boat.angle - Math.PI / 2);
  const rx = lx * cosA - ly * sinA;
  const ry = lx * sinA + ly * cosA;

  /* apply camera pitch (rotate around x) */
  const pry = ry * Math.cos(CAM_PITCH) - lz * Math.sin(CAM_PITCH);
  const prz = ry * Math.sin(CAM_PITCH) + lz * Math.cos(CAM_PITCH);

  /* perspective divide */
  const fov  = 1.8;
  const depth = fov + prz * 0.22;
  const sx    = (rx / depth) * CAM_SCALE;
  const sy    = (pry / depth) * CAM_SCALE;

  const sw = bc.width  / (window.devicePixelRatio || 1);
  const sh = bc.height / (window.devicePixelRatio || 1);
  return {
    x: sw * 0.5 + sx,
    y: sh * HORIZON_Y + sy,
    depth,
  };
}

/* ─────────────────── Draw boat (simple 3-D mesh) ─────────────────── */
function drawBoat() {
  const dpr   = window.devicePixelRatio || 1;
  const sw    = bc.width  / dpr;
  const sh    = bc.height / dpr;

  /* boat local geometry — upright, centred at origin
     z=0 is waterline, positive z is up */
  const HALF_L = 0.55;   /* half-length */
  const HALF_W = 0.24;   /* half-width */
  const HULL_D = 0.18;   /* hull depth below waterline */
  const DECK_H = 0.10;   /* deck height above waterline */
  const CABIN_L= 0.28;
  const CABIN_W= 0.17;
  const CABIN_H= 0.26;
  const MAST_H = 0.90;

  const bz = boat.bobHeight;  /* vertical bob from waves */

  /* apply pitch/roll as local z offsets to points */
  function bpt(lx, ly, lz) {
    /* roll rotates around boat's local forward axis (ly axis) */
    /* pitch rotates around boat's local left axis (lx axis) */
    const rollZ  =  lx * Math.sin(boat.roll  * 0.6);
    const pitchZ = -ly * Math.sin(boat.pitch * 0.5);
    return project(lx, ly, lz + rollZ + pitchZ + bz);
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  /* ── hull faces ── */
  const hullVerts = [
    /* bow tip */ bpt( 0,      -HALF_L, 0),
    /* port stern */ bpt(-HALF_W,  HALF_L, 0),
    /* starboard stern */ bpt( HALF_W,  HALF_L, 0),
    /* keel bow */ bpt( 0,      -HALF_L*0.7, -HULL_D),
    /* keel stern port */ bpt(-HALF_W*0.7, HALF_L, -HULL_D),
    /* keel stern stbd */ bpt( HALF_W*0.7, HALF_L, -HULL_D),
  ];

  function poly(pts, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill)   { ctx.fillStyle   = fill;   ctx.fill();   }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
  }

  /* hull sides */
  poly([hullVerts[0], hullVerts[1], hullVerts[4], hullVerts[3]], '#c8a870', '#7a5a20');
  poly([hullVerts[0], hullVerts[2], hullVerts[5], hullVerts[3]], '#b89050', '#7a5a20');
  /* stern */
  poly([hullVerts[1], hullVerts[2], hullVerts[5], hullVerts[4]], '#a07838', '#7a5a20');
  /* deck */
  poly([hullVerts[0], hullVerts[1], hullVerts[2]], '#d4b87a', '#8a6428');

  /* ── cabin ── */
  const cabinBase = [
    bpt(-CABIN_W,  -CABIN_L*0.2, DECK_H),
    bpt( CABIN_W,  -CABIN_L*0.2, DECK_H),
    bpt( CABIN_W,   CABIN_L*0.8, DECK_H),
    bpt(-CABIN_W,   CABIN_L*0.8, DECK_H),
  ];
  const cabinTop = [
    bpt(-CABIN_W*0.8, -CABIN_L*0.2, DECK_H+CABIN_H),
    bpt( CABIN_W*0.8, -CABIN_L*0.2, DECK_H+CABIN_H),
    bpt( CABIN_W*0.8,  CABIN_L*0.7, DECK_H+CABIN_H),
    bpt(-CABIN_W*0.8,  CABIN_L*0.7, DECK_H+CABIN_H),
  ];

  /* cabin faces — draw back-to-front roughly */
  poly([cabinBase[3], cabinBase[2], cabinTop[2], cabinTop[3]], '#e8d4a0', '#9a7840'); /* top */
  poly([cabinBase[0], cabinBase[1], cabinTop[1], cabinTop[0]], '#ccc090', '#9a7840'); /* front */
  poly([cabinBase[1], cabinBase[2], cabinTop[2], cabinTop[1]], '#d4bc88', '#9a7840'); /* stbd side */
  poly([cabinBase[0], cabinBase[3], cabinTop[3], cabinTop[0]], '#b8a070', '#9a7840'); /* port side */
  /* roof */
  poly([cabinTop[0], cabinTop[1], cabinTop[2], cabinTop[3]], '#f0e0b0', '#9a7840');

  /* ── mast ── */
  const mastBase = bpt(0, -CABIN_L*0.1, DECK_H + CABIN_H);
  const mastTop  = bpt(0, -CABIN_L*0.1, DECK_H + CABIN_H + MAST_H);
  ctx.beginPath();
  ctx.moveTo(mastBase.x, mastBase.y);
  ctx.lineTo(mastTop.x,  mastTop.y);
  ctx.strokeStyle = '#4a3010'; ctx.lineWidth = 2.2; ctx.stroke();

  /* boom */
  const boomR  = bpt( 0.35, 0.05, DECK_H + CABIN_H + MAST_H * 0.08);
  const boomL  = bpt(-0.05, 0.05, DECK_H + CABIN_H + MAST_H * 0.08);
  ctx.beginPath();
  ctx.moveTo(boomL.x, boomL.y);
  ctx.lineTo(boomR.x, boomR.y);
  ctx.strokeStyle = '#4a3010'; ctx.lineWidth = 1.5; ctx.stroke();

  /* sail (simple triangle, fills with wind color) */
  const sailT  = bpt(0,     -CABIN_L*0.1, DECK_H + CABIN_H + MAST_H * 0.95);
  const sailBL = bpt(-0.05, CABIN_L*0.45,   DECK_H + CABIN_H + MAST_H * 0.07);
  const sailBR = bpt(0.33,  CABIN_L*0.1,   DECK_H + CABIN_H + MAST_H * 0.07);
  ctx.beginPath();
  ctx.moveTo(sailT.x,  sailT.y);
  ctx.lineTo(sailBL.x, sailBL.y);
  ctx.lineTo(sailBR.x, sailBR.y);
  ctx.closePath();
  ctx.fillStyle   = 'rgba(245,240,220,0.88)';
  ctx.strokeStyle = '#bbb090';
  ctx.lineWidth   = 0.8;
  ctx.fill(); ctx.stroke();

  /* ── speed indicator (simple) ── */
  if (boat.speed > 0.0003) {
    const spd   = boat.speed / MAX_SPEED;
    ctx.fillStyle = 'rgba(160,220,255,0.7)';
    ctx.font      = `${Math.round(11 + spd * 6)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${(spd * 12).toFixed(1)} kts`, sw * 0.5, sh * 0.92);
  }

  ctx.restore();
}

/* ─────────────────── Draw virtual joystick ─────────────────── */
function drawJoystick() {
  if (!joystick.active) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);

  /* base ring */
  ctx.beginPath();
  ctx.arc(joystick.baseX, joystick.baseY, JOY_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200,230,255,0.30)';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.fillStyle   = 'rgba(100,180,255,0.06)';
  ctx.fill();

  /* tip knob */
  ctx.beginPath();
  ctx.arc(joystick.tipX, joystick.tipY, 22, 0, Math.PI * 2);
  ctx.fillStyle   = 'rgba(160,220,255,0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,240,255,0.70)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  ctx.restore();
}

/* ─────────────────── HUD hint ─────────────────── */
let hintAlpha = 1.0;
let hintTimer = 0;
function drawHint(now) {
  if (hintTimer === 0) hintTimer = now;
  const age = (now - hintTimer) / 1000;
  if (age > 6) { hintAlpha = Math.max(0, hintAlpha - 0.02); }
  if (hintAlpha <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const sw  = bc.width  / dpr;
  const sh  = bc.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.globalAlpha = hintAlpha * 0.65;
  ctx.fillStyle   = 'rgba(160,220,255,1)';
  ctx.font        = '12px monospace';
  ctx.textAlign   = 'center';
  ctx.letterSpacing = '3px';

  /* different hint for touch vs desktop */
  const isTouch = 'ontouchstart' in window;
  ctx.fillText(
    isTouch ? 'touch & drag to steer' : 'WASD / arrows to drive',
    sw * 0.5,
    sh * 0.86
  );
  ctx.restore();
}

/* ─────────────────── Wake particle trail ─────────────────── */
const wakeParticles = [];

function spawnWake(now) {
  if (boat.speed < 0.0003) return;
  if (now - boat.lastWake < WAKE_RATE) return;
  boat.lastWake = now;

  /* inject into water sim — two flanking drops behind the boat */
  const OFFSET = 0.018;
  const cosA = Math.cos(boat.angle);
  const sinA = Math.sin(boat.angle);
  /* perpendicular vector */
  const px = -sinA * OFFSET;
  const py =  cosA * OFFSET;
  /* back vector */
  const bx =  cosA * 0.022;
  const by =  sinA * 0.022;

  const str = WAKE_STR * (boat.speed / MAX_SPEED);
  waterSim.addDrop(boat.x + bx + px, boat.y + by + py, str * 0.7, WAKE_RAD);
  waterSim.addDrop(boat.x + bx - px, boat.y + by - py, str * 0.7, WAKE_RAD);
  waterSim.addDrop(boat.x + bx,      boat.y + by,      str * 0.5, WAKE_RAD * 1.3);
}

/* ─────────────────── Physics update ─────────────────── */
function updatePhysics(now) {
  /* ── gather input ── */
  let throttle = 0, turn = 0;

  /* keyboard */
  if (keys.up)    throttle += 1;
  if (keys.down)  throttle -= 0.5;
  if (keys.left)  turn     -= 1;
  if (keys.right) turn     += 1;

  /* joystick (touch) */
  if (joystick.active) {
    const jy = joystick.dy;
    const jx = joystick.dx;
    const mag = Math.hypot(jx, jy);
    if (mag > JOY_DEAD) {
      /* forward = negative Y on screen */
      throttle += -jy * Math.min(mag / 0.6, 1.0);
      turn     +=  jx * Math.min(mag / 0.6, 1.0);
    }
  }

  /* ── apply thrust ── */
  boat.speed += throttle * ACCEL;
  boat.speed  = Math.max(-MAX_SPEED * 0.4, Math.min(MAX_SPEED, boat.speed));
  boat.speed *= DECEL;

  /* ── steering ── */
  if (Math.abs(boat.speed) > 0.0001) {
    boat.angle += turn * TURN_SPEED * (boat.speed / MAX_SPEED);
  }

  /* ── move boat (UV space) ── */
  boat.x += Math.cos(boat.angle) * boat.speed;
  boat.y += Math.sin(boat.angle) * boat.speed;

  /* wrap around the infinite ocean */
  boat.x = ((boat.x % 1) + 1) % 1;
  boat.y = ((boat.y % 1) + 1) % 1;

  /* ── buoyancy: sample wave heights around boat ── */
  const SAMPLE_OFF = 0.020;
  const hFront = waterSim.getHeight(
    boat.x + Math.cos(boat.angle) * SAMPLE_OFF,
    boat.y + Math.sin(boat.angle) * SAMPLE_OFF
  );
  const hBack  = waterSim.getHeight(
    boat.x - Math.cos(boat.angle) * SAMPLE_OFF,
    boat.y - Math.sin(boat.angle) * SAMPLE_OFF
  );
  const hLeft  = waterSim.getHeight(
    boat.x - Math.sin(boat.angle) * SAMPLE_OFF * 0.6,
    boat.y + Math.cos(boat.angle) * SAMPLE_OFF * 0.6
  );
  const hRight = waterSim.getHeight(
    boat.x + Math.sin(boat.angle) * SAMPLE_OFF * 0.6,
    boat.y - Math.cos(boat.angle) * SAMPLE_OFF * 0.6
  );

  const hCenter = waterSim.getHeight(boat.x, boat.y);

  /* pitch = front-back slope */
  const targetPitch = (hBack - hFront) * BOUNCE_STR;
  boat.pitchVel += (targetPitch - boat.pitch) * 0.18;
  boat.pitchVel *= 0.75;
  boat.pitch    += boat.pitchVel;

  /* roll = left-right slope */
  const targetRoll  = (hRight - hLeft)  * BOUNCE_STR;
  boat.rollVel  += (targetRoll  - boat.roll)  * 0.15;
  boat.rollVel  *= 0.75;
  boat.roll     += boat.rollVel;

  /* vertical bob */
  const targetBob = hCenter * 0.18;
  boat.bobHeight  += (targetBob - boat.bobHeight) * 0.12;

  /* ── spawn wakes ── */
  spawnWake(now);
}

/* ─────────────────── Main loop ─────────────────── */
let lastTime = 0;

function frame(now) {
  requestAnimationFrame(frame);

  /* clear boat canvas */
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, bc.width / dpr * dpr, bc.height / dpr * dpr);
  /* proper clear that handles DPR */
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, bc.width, bc.height);
  ctx.restore();

  updatePhysics(now);
  drawBoat();
  drawJoystick();
  drawHint(now);

  lastTime = now;
}

requestAnimationFrame(frame);

} /* end init() */

})();
