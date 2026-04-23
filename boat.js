'use strict';
/* ═══════════════════════════════════════════════════════════════
   BOAT.JS  —  Canvas 2D boat always centred on screen
   The boat is always drawn at the centre; the water simulation
   is the "world" and we poke wakes into it at the boat's UV pos.
   Controls: WASD / arrows  +  virtual joystick (touch)
   ═══════════════════════════════════════════════════════════════ */
(function(){

function waitAndInit(){
  if(!window.waterSim){setTimeout(waitAndInit,50);return;}
  init();
}
waitAndInit();

function init(){

const bc  = document.getElementById('boatCanvas');
const ctx = bc.getContext('2d');

/* ── boat world state ── */
const boat = {
  /* UV position in the wave field (0-1, 0-1); wraps around */
  wx: 0.5, wy: 0.5,
  angle: -Math.PI/2,   /* heading; -PI/2 = pointing up */
  speed: 0,
  /* visual */
  bobY:    0,          /* vertical bob in CSS px */
  pitch:   0,          /* nose-up/down degrees */
  roll:    0,          /* side tilt degrees */
  pitchV:  0,
  rollV:   0,
  lastWake: 0,
};

const MAX_SPEED  = 0.0018;  /* UV units per ms */
const ACCEL      = 0.000055;
const DECEL      = 0.968;
const TURN_SPD   = 0.028;
const WAKE_MS    = 90;
const WAKE_STR   = 0.12;

/* ── keyboard ── */
const K = {up:false,down:false,left:false,right:false};
window.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'   ||e.key==='w'||e.key==='W')K.up   =true;
  if(e.key==='ArrowDown' ||e.key==='s'||e.key==='S')K.down =true;
  if(e.key==='ArrowLeft' ||e.key==='a'||e.key==='A')K.left =true;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')K.right=true;
});
window.addEventListener('keyup',e=>{
  if(e.key==='ArrowUp'   ||e.key==='w'||e.key==='W')K.up   =false;
  if(e.key==='ArrowDown' ||e.key==='s'||e.key==='S')K.down =false;
  if(e.key==='ArrowLeft' ||e.key==='a'||e.key==='A')K.left =false;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')K.right=false;
});

/* ── joystick ── */
const JR   = 60;  /* joystick radius px */
const joy  = {active:false,id:-1,bx:0,by:0,tx:0,ty:0,dx:0,dy:0};

bc.addEventListener('touchstart',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(joy.active)continue;
    joy.active=true; joy.id=t.identifier;
    joy.bx=t.clientX; joy.by=t.clientY;
    joy.tx=t.clientX; joy.ty=t.clientY;
    joy.dx=0; joy.dy=0;
  }
},{passive:false});

bc.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(t.identifier!==joy.id)continue;
    const dx=t.clientX-joy.bx, dy=t.clientY-joy.by;
    const dist=Math.hypot(dx,dy);
    const clamp=Math.min(dist,JR);
    const frac=clamp/(dist||1);
    joy.tx=joy.bx+dx*frac; joy.ty=joy.by+dy*frac;
    joy.dx=dx/JR*frac; joy.dy=dy/JR*frac;
  }
},{passive:false});

function releaseJoy(e){
  e.preventDefault();
  for(const t of e.changedTouches){
    if(t.identifier===joy.id){joy.active=false;joy.dx=0;joy.dy=0;}
  }
}
bc.addEventListener('touchend',   releaseJoy,{passive:false});
bc.addEventListener('touchcancel',releaseJoy,{passive:false});

/* ── physics update ── */
function update(now){
  /* gather input */
  let thr=0, trn=0;
  if(K.up)   thr+=1;
  if(K.down) thr-=0.5;
  if(K.left) trn-=1;
  if(K.right)trn+=1;
  if(joy.active){
    const mag=Math.hypot(joy.dx,joy.dy);
    if(mag>0.1){thr+=-joy.dy*Math.min(mag,1.0); trn+=joy.dx*Math.min(mag,1.0);}
  }

  boat.speed+=thr*ACCEL;
  boat.speed=Math.max(-MAX_SPEED*0.4,Math.min(MAX_SPEED,boat.speed));
  boat.speed*=DECEL;

  if(Math.abs(boat.speed)>0.0001)
    boat.angle+=trn*TURN_SPD*(boat.speed/MAX_SPEED);

  /* move world position */
  boat.wx+=Math.cos(boat.angle)*boat.speed;
  boat.wy+=Math.sin(boat.angle)*boat.speed;
  boat.wx=((boat.wx%1)+1)%1;
  boat.wy=((boat.wy%1)+1)%1;

  /* buoyancy — sample wave heights at 4 offsets */
  const OFF=0.018;
  const ca=Math.cos(boat.angle), sa=Math.sin(boat.angle);
  const hF =waterSim.getHeight(boat.wx+ca*OFF,    boat.wy+sa*OFF);
  const hB =waterSim.getHeight(boat.wx-ca*OFF,    boat.wy-sa*OFF);
  const hL =waterSim.getHeight(boat.wx-sa*OFF*0.6,boat.wy+ca*OFF*0.6);
  const hR =waterSim.getHeight(boat.wx+sa*OFF*0.6,boat.wy-ca*OFF*0.6);
  const hC =waterSim.getHeight(boat.wx,boat.wy);

  const tPitch=(hB-hF)*9.0;
  boat.pitchV+=(tPitch-boat.pitch)*0.18; boat.pitchV*=0.72; boat.pitch+=boat.pitchV;

  const tRoll=(hR-hL)*8.0;
  boat.rollV +=(tRoll -boat.roll)*0.15;  boat.rollV *=0.72; boat.roll +=boat.rollV;

  boat.bobY+=(hC*22-boat.bobY)*0.14;

  /* wakes */
  if(Math.abs(boat.speed)>0.0002 && now-boat.lastWake>WAKE_MS){
    boat.lastWake=now;
    const str=WAKE_STR*(Math.abs(boat.speed)/MAX_SPEED);
    const bkx=boat.wx-ca*0.020, bky=boat.wy-sa*0.020;
    waterSim.addDrop(bkx+sa*0.014,bky-ca*0.014,str*0.8,0.030);
    waterSim.addDrop(bkx-sa*0.014,bky+ca*0.014,str*0.8,0.030);
    waterSim.addDrop(bkx,bky,str*0.5,0.040);
  }
}

/* ── draw boat (2D, boat always screen-centre) ──
   We draw in CSS-pixel space; DPR scaling via ctx.scale. */
function drawBoat(){
  const dpr = window.devicePixelRatio||1;
  const sw  = bc.width /dpr;   /* CSS width  */
  const sh  = bc.height/dpr;   /* CSS height */
  const cx  = sw*0.5;
  const cy  = sh*0.5 + boat.bobY;

  ctx.save();
  ctx.scale(dpr,dpr);

  /* move to centre, rotate to heading */
  ctx.translate(cx,cy);
  ctx.rotate(boat.angle+Math.PI/2);

  /* apply pitch/roll as a skew transform */
  ctx.transform(1, boat.roll*0.07, boat.pitch*0.07, 1, 0, 0);

  const S=1.0; /* scale factor — tweak to resize boat */

  /* ── shadow on water ── */
  ctx.save();
  ctx.globalAlpha=0.18;
  ctx.fillStyle='#000';
  ctx.beginPath();
  ctx.ellipse(0,4*S, 22*S,9*S, 0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  /* ── hull ── */
  ctx.beginPath();
  ctx.moveTo(0,   -44*S);    /* bow tip */
  ctx.bezierCurveTo( 18*S,-28*S,  22*S, 10*S,  18*S, 32*S);
  ctx.lineTo( 18*S, 40*S);   /* stern starboard */
  ctx.lineTo(-18*S, 40*S);   /* stern port */
  ctx.bezierCurveTo(-22*S, 10*S, -18*S,-28*S,   0,  -44*S);
  ctx.closePath();
  ctx.fillStyle='#8B5E28';
  ctx.fill();
  ctx.strokeStyle='#5a3a0e';
  ctx.lineWidth=2*S;
  ctx.stroke();

  /* hull planks */
  ctx.strokeStyle='rgba(0,0,0,0.15)';
  ctx.lineWidth=1*S;
  for(let i=-3;i<=3;i++){
    ctx.beginPath();
    ctx.moveTo(i*5*S,-40*S);
    ctx.lineTo(i*6*S, 40*S);
    ctx.stroke();
  }

  /* ── deck ── */
  ctx.beginPath();
  ctx.moveTo(0,   -40*S);
  ctx.bezierCurveTo( 14*S,-26*S,  17*S, 8*S,  14*S, 30*S);
  ctx.lineTo(-14*S, 30*S);
  ctx.bezierCurveTo(-17*S,  8*S, -14*S,-26*S,   0, -40*S);
  ctx.closePath();
  ctx.fillStyle='#d4b87a';
  ctx.fill();

  /* ── cabin ── */
  ctx.beginPath();
  ctx.roundRect(-10*S,-8*S, 20*S,26*S, 3*S);
  ctx.fillStyle='#e8d4a0';
  ctx.fill();
  ctx.strokeStyle='#9a7840';
  ctx.lineWidth=1.5*S;
  ctx.stroke();

  /* cabin roof — darker */
  ctx.beginPath();
  ctx.roundRect(-9*S,-7*S, 18*S,10*S, 2*S);
  ctx.fillStyle='#b89050';
  ctx.fill();

  /* cabin windows */
  ctx.fillStyle='rgba(120,200,255,0.6)';
  ctx.strokeStyle='#7a6030'; ctx.lineWidth=1*S;
  for(const wx of[-5*S,5*S]){
    ctx.beginPath();ctx.roundRect(wx-3*S,-5*S,6*S,5*S,1*S);ctx.fill();ctx.stroke();
  }

  /* ── railing lines ── */
  ctx.strokeStyle='rgba(160,120,60,0.7)';
  ctx.lineWidth=1*S;
  ctx.beginPath();
  ctx.moveTo(-12*S,-34*S); ctx.lineTo(-14*S,28*S);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo( 12*S,-34*S); ctx.lineTo( 14*S,28*S);
  ctx.stroke();

  /* ── mast ── */
  ctx.strokeStyle='#4a3010';
  ctx.lineWidth=3*S;
  ctx.beginPath();ctx.moveTo(0,6*S);ctx.lineTo(0,-56*S);ctx.stroke();

  /* boom */
  ctx.lineWidth=2*S;
  ctx.beginPath();ctx.moveTo(0,10*S);ctx.lineTo(15*S,14*S);ctx.stroke();

  /* ── sail ── */
  ctx.beginPath();
  ctx.moveTo(0,-54*S);       /* mast top */
  ctx.lineTo(0,8*S);         /* mast base */
  ctx.lineTo(14*S,13*S);     /* boom tip */
  ctx.closePath();
  ctx.fillStyle='rgba(245,240,218,0.90)';
  ctx.fill();
  ctx.strokeStyle='#bbb090'; ctx.lineWidth=1*S;
  ctx.stroke();

  /* ── bow wave spray (when moving) ── */
  const spd=Math.abs(boat.speed)/MAX_SPEED;
  if(spd>0.1){
    ctx.globalAlpha=spd*0.55;
    ctx.fillStyle='rgba(200,235,255,0.9)';
    for(const side of[-1,1]){
      ctx.beginPath();
      ctx.ellipse(side*10*S,-38*S, 5*S*spd,2*S*spd, side*0.5,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  ctx.restore();
}

/* ── draw joystick ── */
function drawJoystick(){
  if(!joy.active)return;
  const dpr=window.devicePixelRatio||1;
  ctx.save();
  ctx.scale(dpr,dpr);

  /* outer ring */
  ctx.beginPath();
  ctx.arc(joy.bx,joy.by,JR,0,Math.PI*2);
  ctx.strokeStyle='rgba(180,220,255,0.35)';
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.fillStyle='rgba(80,160,255,0.07)';
  ctx.fill();

  /* inner knob */
  ctx.beginPath();
  ctx.arc(joy.tx,joy.ty,24,0,Math.PI*2);
  ctx.fillStyle='rgba(140,210,255,0.50)';
  ctx.fill();
  ctx.strokeStyle='rgba(200,240,255,0.75)';
  ctx.lineWidth=1.5;
  ctx.stroke();

  ctx.restore();
}

/* ── draw speed HUD ── */
function drawHUD(){
  const dpr=window.devicePixelRatio||1;
  const sw=bc.width/dpr, sh=bc.height/dpr;
  const spd=Math.abs(boat.speed)/MAX_SPEED;
  ctx.save();
  ctx.scale(dpr,dpr);
  ctx.globalAlpha=0.65;
  ctx.fillStyle='rgba(160,220,255,1)';
  ctx.font='bold 13px monospace';
  ctx.textAlign='left';
  ctx.fillText(`${(spd*12).toFixed(1)} kts`, 18, sh-18);
  /* controls hint (fades after 8s) */
  if(hintAge<8000){
    ctx.globalAlpha=(1-(hintAge/8000))*0.55;
    ctx.textAlign='center';
    ctx.font='12px monospace';
    const isTouch='ontouchstart' in window;
    ctx.fillText(isTouch?'drag anywhere to steer':'WASD / arrows to sail',sw*0.5,sh-18);
  }
  ctx.restore();
}

/* ── main loop ── */
let hintAge=0, lastNow=0;

function frame(now){
  requestAnimationFrame(frame);
  const dt=lastNow?now-lastNow:16; lastNow=now;
  hintAge=Math.min(hintAge+dt,9000);

  /* clear */
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,bc.width,bc.height);

  update(now);
  drawBoat();
  drawJoystick();
  drawHUD();
}

requestAnimationFrame(frame);

} /* end init */
})();
