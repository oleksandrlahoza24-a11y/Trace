/**
 * LEVEL 2 — The Abyss
 * ─────────────────────────────────────────────────────────────
 * Mechanic: Moving Platforms + Wind Gusts
 *   • Floating pixel platforms drift side-to-side over a dark void
 *   • USE button activates a "Wind Blast" — pushes the player horizontally
 *     in the camera's forward direction (short-range burst jump)
 *   • ATK button stomps: if player is above an enemy, it deals AOE damage
 *   • Goal: reach the golden star at the top platform
 *   • Fall into the void → respawn at start (health penalty)
 */

(() => {

  const WIND_FORCE     = 14;
  const WIND_COOLDOWN  = 1.8;   // seconds
  const PLATFORM_SPEED = 1.8;
  const STOMP_RANGE    = 2.5;
  const STOMP_DAMAGE   = 50;

  let platforms, windReady, windTimer, skyEnemies, starMesh, levelDone;
  let windCooldownBar;

  // ── Build ──────────────────────────────────────────────────
  function build(scene, objects) {
    const add = m => { scene.add(m); objects.push(m); return m; };

    // Sky background
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 20, 55);

    // Void floor (kill plane handled in engine by y < -20)
    // Dark abyss particles: just a few decorative boxes floating
    for (let i = 0; i < 18; i++) {
      const rock = PixelEngine.makeBox(
        0.4+Math.random()*0.6, 0.3, 0.4+Math.random()*0.6,
        0x111122,
        (Math.random()-0.5)*40, -5 - Math.random()*12,
        (Math.random()-0.5)*40
      );
      add(rock);
    }

    // Start platform
    add(PixelEngine.makeBox(6, 0.6, 6, 0x223355, 0, 0.3, 0, true, true));

    // Moving platforms — stored for update
    platforms = [];
    const defs = [
      // { x, y, z, w, d, color, axis, range, speed }
      { x:-4, y:3,  z:-6,  w:4, d:4, color:0x334466, axis:'x', range:4,  speed:1.2 },
      { x: 6, y:6,  z:-10, w:3, d:3, color:0x224455, axis:'z', range:5,  speed:1.5 },
      { x:-6, y:9,  z:-14, w:4, d:3, color:0x334466, axis:'x', range:3,  speed:1.8 },
      { x: 3, y:12, z:-18, w:3, d:3, color:0x1a2244, axis:'z', range:6,  speed:2.0 },
      { x:-2, y:15, z:-22, w:5, d:4, color:0x334477, axis:'x', range:4,  speed:1.0 },
      // Final platform — static
      { x:0,  y:18, z:-26, w:6, d:6, color:0x223366, axis:null,range:0,  speed:0   },
    ];
    defs.forEach(d => {
      const mesh = PixelEngine.makeBox(d.w, 0.5, d.d, d.color, d.x, d.y, d.z, true, true);
      scene.add(mesh); objects.push(mesh);
      platforms.push({ mesh, origin: { x:d.x, y:d.y, z:d.z },
                       axis: d.axis, range: d.range, speed: d.speed, phase: Math.random()*Math.PI*2 });
      // Edge glow strips
      const glow = PixelEngine.makeBox(d.w+0.1, 0.12, d.d+0.1, 0x4466bb, d.x, d.y+0.3, d.z);
      scene.add(glow); objects.push(glow);
    });

    // Flying enemy "glitches" (screen-tear style boxes)
    skyEnemies = [];
    const enemyDefs = [
      { x:-4, y:5,  z:-7 },
      { x: 5, y:9,  z:-13 },
      { x:-3, y:13, z:-19 },
    ];
    enemyDefs.forEach(ep => {
      const geo = new THREE.BoxGeometry(1, 0.4, 1);
      const mat = new THREE.MeshLambertMaterial({ color: 0xff2266, emissive: 0x880022, emissiveIntensity: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(ep.x, ep.y, ep.z);
      scene.add(mesh); objects.push(mesh);
      skyEnemies.push({ mesh, hp: 60, dead: false,
                        vx: (Math.random()-0.5)*2, vy: Math.sin(Math.random()*Math.PI)*0.5,
                        baseY: ep.y });
    });

    // Star (goal)
    const starGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const starMat = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xFFAA00, emissiveIntensity: 1 });
    starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.position.set(0, 19.5, -26);
    scene.add(starMesh); objects.push(starMesh);
    add(PixelEngine.makePointLight(0xFFD700, 2.5, 8, 0, 20, -26));

    // Stars in background (decorative tiny boxes)
    for (let i = 0; i < 30; i++) {
      const star = PixelEngine.makeBox(0.12, 0.12, 0.12, 0xffffff,
        (Math.random()-0.5)*50, 5 + Math.random()*20, (Math.random()-0.5)*50 - 15);
      add(star);
    }

    // Ambient blue light
    add(PixelEngine.makePointLight(0x2244aa, 0.8, 60, 0, 10, -15));
  }

  // ── onLoad ─────────────────────────────────────────────────
  function onLoad() {
    windReady  = true;
    windTimer  = 0;
    levelDone  = false;

    // Create cooldown indicator in HUD (appended dynamically)
    windCooldownBar = document.createElement('div');
    windCooldownBar.id = 'windBar';
    windCooldownBar.style.cssText = `
      position:absolute; bottom:175px; right:28px;
      width:68px; height:8px; background:#111;
      border:2px solid rgba(255,255,255,0.4);
    `;
    const fill = document.createElement('div');
    fill.id = 'windFill';
    fill.style.cssText = 'height:100%; width:100%; background:#44aaff; transition:width 0.1s;';
    windCooldownBar.appendChild(fill);
    document.getElementById('hud').appendChild(windCooldownBar);

    PixelEngine.showMessage('💨 USE = Wind Blast · ATK = Stomp enemies from above!', 4000);
  }

  function onUnload() {
    const wb = document.getElementById('windBar');
    if (wb) wb.remove();
    platforms = []; skyEnemies = [];
  }

  // ── onButton ───────────────────────────────────────────────
  function onButton(name, player) {
    if (name === 'use' && windReady) {
      _windBlast(player);
    } else if (name === 'use' && !windReady) {
      PixelEngine.showMessage('Wind recharging…', 600);
    }
    if (name === 'attack') {
      _stomp(player);
    }
  }

  function _windBlast(player) {
    if (!player.mesh) return;
    windReady = false;
    windTimer = 0;
    const cam = PixelEngine.getCamera();
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    dir.y = 0.4; dir.normalize();
    player.vel.x = dir.x * WIND_FORCE;
    player.vel.y = dir.y * WIND_FORCE;
    player.vel.z = dir.z * WIND_FORCE;
    PixelEngine.showMessage('💨 WHOOSH!', 600);
  }

  function _stomp(player) {
    if (!player.mesh) return;
    const pp = player.mesh.position;
    let hit = false;
    skyEnemies.forEach(e => {
      if (e.dead) return;
      const ep = e.mesh.position;
      const horiz = Math.sqrt((pp.x-ep.x)**2 + (pp.z-ep.z)**2);
      const vert  = pp.y - ep.y;
      if (horiz < STOMP_RANGE && vert > 0.5 && vert < 3) {
        e.hp -= STOMP_DAMAGE;
        hit = true;
        if (e.hp <= 0) {
          e.dead = true;
          PixelEngine.getScene().remove(e.mesh);
          PixelEngine.showMessage('💥 Enemy stomped!', 800);
        }
        // Bounce player up
        player.vel.y = 8;
      }
    });
    if (!hit) PixelEngine.showMessage('✊ Stomp missed — jump on top!', 1000);
  }

  // ── Update ─────────────────────────────────────────────────
  function onUpdate(dt, player, scene) {
    if (levelDone) return;

    const t = Date.now() * 0.001;

    // Move platforms
    platforms.forEach(p => {
      if (!p.axis) return;
      const offset = Math.sin(t * p.speed + p.phase) * p.range;
      if (p.axis === 'x') p.mesh.position.x = p.origin.x + offset;
      if (p.axis === 'z') p.mesh.position.z = p.origin.z + offset;

      // Carry player if standing on platform
      if (player.mesh && player.onGround) {
        const pp = player.mesh.position;
        const pm = p.mesh.position;
        const dx = Math.abs(pp.x - pm.x);
        const dz = Math.abs(pp.z - pm.z);
        const dy = pp.y - pm.y;
        if (dx < p.mesh.geometry.parameters.width/2 + 0.4 &&
            dz < p.mesh.geometry.parameters.depth/2  + 0.4 &&
            dy >= 0.5 && dy < 1.4) {
          // Nudge player with platform
          const prevOffset = Math.sin((t - dt) * p.speed + p.phase) * p.range;
          const delta = offset - prevOffset;
          if (p.axis === 'x') player.mesh.position.x += delta;
          if (p.axis === 'z') player.mesh.position.z += delta;
        }
      }
    });

    // Enemy drift
    skyEnemies.forEach(e => {
      if (e.dead) return;
      e.mesh.position.x += e.vx * dt;
      if (Math.abs(e.mesh.position.x) > 12) e.vx *= -1;
      e.mesh.position.y = e.baseY + Math.sin(t * 1.5 + e.baseY) * 0.6;
      e.mesh.rotation.y += dt * 2;

      // Damage player on contact
      if (player.mesh) {
        const d = player.mesh.position.distanceTo(e.mesh.position);
        if (d < 1.4) PixelEngine.takeDamage(12 * dt);
      }
    });

    // Wind cooldown
    if (!windReady) {
      windTimer += dt;
      const pct = Math.min(windTimer / WIND_COOLDOWN, 1) * 100;
      const fill = document.getElementById('windFill');
      if (fill) fill.style.width = pct + '%';
      if (windTimer >= WIND_COOLDOWN) { windReady = true; }
    }

    // Star spin
    if (starMesh) {
      starMesh.rotation.x += dt * 2;
      starMesh.rotation.y += dt * 3;
    }

    // Check star collect
    if (player.mesh && starMesh) {
      const d = player.mesh.position.distanceTo(starMesh.position);
      if (d < 1.5) {
        levelDone = true;
        PixelEngine.showMessage('⭐ You got the star! YOU WIN! 🎉', 99999);
        starMesh.visible = false;
      }
    }

    // Respawn on fall
    if (player.mesh && player.mesh.position.y < -8 && !levelDone) {
      PixelEngine.takeDamage(20);
      player.mesh.position.set(0, 2, 0);
      player.vel = { x:0, y:0, z:0 };
      PixelEngine.showMessage('💀 Fell into the void! -20 HP', 1500);
    }
  }

  // ── Register ───────────────────────────────────────────────
  PixelLevels[2] = {
    _id:         2,
    name:        '🌌 LEVEL 2 — THE ABYSS',
    floorY:      0,
    spawnPoint:  { x: 0, y: 1.2, z: 0 },
    showTorchUI: false,
    build,
    onLoad,
    onUnload,
    onButton,
    onUpdate,
  };

})();
