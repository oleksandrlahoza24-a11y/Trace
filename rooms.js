/**
 * PixelQuest 3D — Engine
 * Handles: Three.js scene, pixel render pipeline,
 *          joystick input, button input, level loading,
 *          player movement, camera, health system.
 */

const PixelEngine = (() => {

  // ── Config ────────────────────────────────────────────────
  const PIXEL_SCALE   = 4;      // upscale factor (lower = chunkier pixels)
  const PLAYER_SPEED  = 5.5;
  const GRAVITY       = -18;
  const JUMP_FORCE    = 7;
  const MAX_HP        = 100;

  // ── State ─────────────────────────────────────────────────
  let renderer, scene, camera, clock;
  let player = { mesh: null, vel: { x:0, y:0, z:0 }, hp: MAX_HP, onGround: false };
  let joystick = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };
  let buttons   = { attack: false, use: false };
  let currentLevel = null;
  let levelObjects  = [];   // objects to dispose on level change
  let pixelTarget;          // WebGLRenderTarget for low-res pass

  // DOM refs
  const canvas      = document.getElementById('gameCanvas');
  const knob        = document.getElementById('joystickKnob');
  const healthFill  = document.getElementById('healthFill');
  const msgBox      = document.getElementById('msgBox');
  const flashEl     = document.getElementById('flash');
  const torchCountEl = document.getElementById('torchCount');
  const torchNumEl   = document.getElementById('torchNum');
  const levelBannerEl = document.getElementById('levelBanner');

  // ── Init ──────────────────────────────────────────────────
  function init() {
    clock = new THREE.Clock();

    // Renderer — low-res pixel target
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(1);
    _resizeRenderer();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    scene.fog = new THREE.Fog(0x0d0d1a, 18, 48);

    // Camera — third-person behind player
    camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 100);
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 1, 0);

    // Ambient + directional lights (pixel style — harsh, low count)
    const amb = new THREE.AmbientLight(0x223344, 1.0);
    scene.add(amb);
    const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
    sun.position.set(8, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    scene.add(sun);

    // Pixel post-process: off-screen low-res target + fullscreen quad
    _buildPixelPipeline();

    // Input
    _setupJoystick();
    _setupButtons();
    window.addEventListener('resize', _resizeRenderer);

    // Loop
    _loop();
  }

  // ── Pixel pipeline ────────────────────────────────────────
  function _buildPixelPipeline() {
    const W = Math.floor(window.innerWidth  / PIXEL_SCALE);
    const H = Math.floor(window.innerHeight / PIXEL_SCALE);
    pixelTarget = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    // We render scene -> pixelTarget, then blit via css transform
    // Actually: render scene to low-res canvas directly by changing renderer size
    // Simpler approach: set renderer to low-res, css scales it up
    renderer.setSize(W, H, false);   // false = don't set canvas style
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    canvas.style.imageRendering = 'pixelated';
  }

  function _resizeRenderer() {
    const W = Math.floor(window.innerWidth  / PIXEL_SCALE);
    const H = Math.floor(window.innerHeight / PIXEL_SCALE);
    renderer.setSize(W, H, false);
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    if (camera) camera.aspect = W / H;
    if (camera) camera.updateProjectionMatrix();
  }

  // ── Player spawn ──────────────────────────────────────────
  function _spawnPlayer(x, y, z) {
    if (player.mesh) scene.remove(player.mesh);
    const geo  = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const mat  = new THREE.MeshLambertMaterial({ color: 0x44aaff });
    player.mesh = new THREE.Mesh(geo, mat);
    player.mesh.castShadow = true;
    player.mesh.position.set(x, y, z);
    scene.add(player.mesh);
    player.hp = MAX_HP;
    player.vel = { x:0, y:0, z:0 };
    player.onGround = false;
    _updateHealthBar();
  }

  // ── Level loading ─────────────────────────────────────────
  function loadLevel(num) {
    // Clean up old level
    levelObjects.forEach(o => scene.remove(o));
    levelObjects = [];
    if (currentLevel && currentLevel.onUnload) currentLevel.onUnload();

    // Get level definition
    const levelDef = PixelLevels[num];
    if (!levelDef) { console.error('Level ' + num + ' not found!'); return; }
    currentLevel = levelDef;

    // Flash + banner
    _flashScreen();
    showBanner(levelDef.name || ('LEVEL ' + num));

    // Build level geometry
    levelDef.build(scene, levelObjects);

    // Spawn player at level's start point
    const sp = levelDef.spawnPoint || { x:0, y:1, z:0 };
    _spawnPlayer(sp.x, sp.y, sp.z);

    // Level-specific HUD
    torchCountEl.style.display = (levelDef.showTorchUI) ? 'block' : 'none';

    // Level init hook
    if (levelDef.onLoad) levelDef.onLoad();
  }

  // ── Main loop ─────────────────────────────────────────────
  function _loop() {
    requestAnimationFrame(_loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    _movePlayer(dt);
    _cameraFollow(dt);

    if (currentLevel && currentLevel.onUpdate) {
      currentLevel.onUpdate(dt, player, scene);
    }

    renderer.render(scene, camera);
  }

  // ── Player movement ───────────────────────────────────────
  function _movePlayer(dt) {
    if (!player.mesh) return;

    // Get camera forward (flattened)
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    const camRight = new THREE.Vector3();
    camRight.crossVectors(camDir, new THREE.Vector3(0,1,0)).normalize();

    // Joystick → world direction
    const jx = joystick.dx, jz = joystick.dy;
    const move = new THREE.Vector3();
    move.addScaledVector(camRight, jx);
    move.addScaledVector(camDir, -jz);
    if (move.lengthSq() > 1) move.normalize();

    player.vel.x = move.x * PLAYER_SPEED;
    player.vel.z = move.z * PLAYER_SPEED;

    // Gravity
    player.vel.y += GRAVITY * dt;

    // Floor check (simple flat ground + level colliders)
    const floorY = currentLevel ? (currentLevel.floorY || 0) : 0;
    player.mesh.position.x += player.vel.x * dt;
    player.mesh.position.y += player.vel.y * dt;
    player.mesh.position.z += player.vel.z * dt;

    if (player.mesh.position.y <= floorY + 0.8) {
      player.mesh.position.y = floorY + 0.8;
      player.vel.y = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    // Face movement direction
    if (move.lengthSq() > 0.01) {
      const angle = Math.atan2(move.x, move.z);
      player.mesh.rotation.y = angle;
    }

    // Level boundary (kill plane)
    if (player.mesh.position.y < -20) {
      takeDamage(player.hp); // instant kill
    }
  }

  // ── Camera follow ─────────────────────────────────────────
  function _cameraFollow(dt) {
    if (!player.mesh) return;
    const target = player.mesh.position.clone();
    const desired = target.clone().add(new THREE.Vector3(0, 6, 9));
    camera.position.lerp(desired, 6 * dt);
    const lookTarget = target.clone().add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(lookTarget);
  }

  // ── Joystick ──────────────────────────────────────────────
  function _setupJoystick() {
    const zone = document.getElementById('joystickZone');
    const R = 32; // max knob travel px
    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joystick.active = true;
      joystick.id     = t.identifier;
      joystick.startX = t.clientX;
      joystick.startY = t.clientY;
    }, { passive: false });
    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== joystick.id) continue;
        let dx = t.clientX - joystick.startX;
        let dy = t.clientY - joystick.startY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > R) { dx = dx/dist*R; dy = dy/dist*R; }
        joystick.dx = dx / R;
        joystick.dy = dy / R;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
    }, { passive: false });
    const endJoy = () => {
      joystick.active = false; joystick.dx = 0; joystick.dy = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    };
    zone.addEventListener('touchend',    endJoy);
    zone.addEventListener('touchcancel', endJoy);

    // Keyboard fallback (desktop testing)
    const keys = {};
    window.addEventListener('keydown', e => { keys[e.code] = true; _keysToJoy(keys); });
    window.addEventListener('keyup',   e => { keys[e.code] = false; _keysToJoy(keys); });
  }

  function _keysToJoy(keys) {
    joystick.dx = (keys['ArrowRight']||keys['KeyD'] ? 1 : 0) - (keys['ArrowLeft']||keys['KeyA'] ? 1 : 0);
    joystick.dy = (keys['ArrowDown'] ||keys['KeyS'] ? 1 : 0) - (keys['ArrowUp']  ||keys['KeyW'] ? 1 : 0);
  }

  // ── Buttons ───────────────────────────────────────────────
  function _setupButtons() {
    _bindBtn('btnAttack', 'attack');
    _bindBtn('btnUse',    'use');

    // Keyboard
    window.addEventListener('keydown', e => {
      if (e.code === 'Space') _fireBtn('attack');
      if (e.code === 'KeyE')  _fireBtn('use');
    });
  }
  function _bindBtn(id, name) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); _fireBtn(name); el.classList.add('pressed'); }, { passive: false });
    el.addEventListener('touchend',   () => el.classList.remove('pressed'));
    el.addEventListener('mousedown',  () => { _fireBtn(name); el.classList.add('pressed'); });
    el.addEventListener('mouseup',    () => el.classList.remove('pressed'));
  }
  function _fireBtn(name) {
    if (currentLevel && currentLevel.onButton) {
      currentLevel.onButton(name, player, scene);
    }
  }

  // ── Public helpers ────────────────────────────────────────
  function showMessage(text, duration) {
    msgBox.textContent = text;
    msgBox.style.display = 'block';
    clearTimeout(msgBox._t);
    if (duration) msgBox._t = setTimeout(() => msgBox.style.display = 'none', duration);
  }
  function hideMessage() { msgBox.style.display = 'none'; }

  function showBanner(text) {
    levelBannerEl.textContent = text;
    levelBannerEl.style.opacity = 1;
    setTimeout(() => levelBannerEl.style.opacity = 0, 2500);
  }

  function takeDamage(amount) {
    player.hp = Math.max(0, player.hp - amount);
    _updateHealthBar();
    _flashScreen(0.35, '#ff0000');
    if (player.hp <= 0) {
      showMessage('💀 YOU DIED — Restarting…');
      setTimeout(() => loadLevel(currentLevel._id || 1), 2000);
    }
  }

  function _updateHealthBar() {
    healthFill.style.width = (player.hp / MAX_HP * 100) + '%';
    const r = Math.round(220 - player.hp * 1.2);
    const g = Math.round(player.hp * 0.6);
    healthFill.style.background = `rgb(${r},${g},40)`;
  }

  function _flashScreen(opacity, color) {
    flashEl.style.background = color || '#fff';
    flashEl.style.opacity = opacity || 0.45;
    setTimeout(() => flashEl.style.opacity = 0, 80);
  }

  function setTorchCount(n) {
    torchNumEl.textContent = n;
  }

  function addToScene(obj) { scene.add(obj); levelObjects.push(obj); }

  // ── Pixel geometry helpers (for levels) ──────────────────
  function makeBox(w, h, d, color, x, y, z, castShadow, receiveShadow) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow    = !!castShadow;
    mesh.receiveShadow = !!receiveShadow;
    return mesh;
  }

  function makePointLight(color, intensity, distance, x, y, z) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    return light;
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    loadLevel,
    showMessage,
    hideMessage,
    showBanner,
    takeDamage,
    setTorchCount,
    addToScene,
    makeBox,
    makePointLight,
    getPlayer: () => player,
    getScene:  () => scene,
    getCamera: () => camera,
    floorY: () => currentLevel ? (currentLevel.floorY || 0) : 0,
    // Expose registry for level files
    PixelLevels: {},
  };

})();

// Level registry shorthand
const PixelLevels = PixelEngine.PixelLevels;
