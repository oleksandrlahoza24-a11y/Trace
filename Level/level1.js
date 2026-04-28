/**
 * LEVEL 1 — The Dungeon
 * ─────────────────────
 * Mechanic: Torch Throwing
 *   • Player starts with 3 torches (USE button throws one)
 *   • Torches arc through the air, land, and emit persistent light + fire particle
 *   • Torches can ignite enemy "shadow blobs" (they take damage over time when lit)
 *   • ATK button punches nearby shadow blobs
 *   • Goal: defeat all 4 shadow blobs to unlock the exit portal
 */

(() => {

  // ── Level constants ────────────────────────────────────────
  const TORCH_SPEED   = 12;
  const TORCH_GRAVITY = -14;
  const TORCH_MAX     = 3;
  const BLOB_COUNT    = 4;
  const BLOB_FIRE_DPS = 15;   // damage per second from torch light
  const BLOB_HP       = 60;
  const PUNCH_RANGE   = 2.2;
  const PUNCH_DAMAGE  = 25;
  const FIRE_RADIUS   = 3.5;  // how close a torch must be to damage a blob

  // ── Runtime state ─────────────────────────────────────────
  let torchCount, activeTorches, blobs, portalMesh, portalLight;
  let levelDone, animFrame;
  let portalSpawned = false;

  // ── Build ──────────────────────────────────────────────────
  function build(scene, objects) {
    const add = (m) => { scene.add(m); objects.push(m); return m; };

    // Floor
    add(PixelEngine.makeBox(40, 0.5, 40, 0x2a1a0e, 0, -0.25, 0, false, true));

    // Walls
    const walls = [
      [40, 6, 0.5, 0x1a1108, 0, 3, -20],
      [40, 6, 0.5, 0x1a1108, 0, 3,  20],
      [0.5, 6, 40, 0x1a1108,-20, 3,  0],
      [0.5, 6, 40, 0x1a1108, 20, 3,  0],
    ];
    walls.forEach(([w,h,d,c,x,y,z]) => add(PixelEngine.makeBox(w,h,d,c,x,y,z,false,true)));

    // Pillars (chunky pixel style)
    const pillarPositions = [[-8,0,-8],[8,0,-8],[-8,0,8],[8,0,8]];
    pillarPositions.forEach(([x,,z]) => {
      add(PixelEngine.makeBox(1.5, 6, 1.5, 0x3a2510, x, 3, z, true, true));
      // Pixel "stone top"
      add(PixelEngine.makeBox(2, 0.4, 2, 0x4a3520, x, 6, z, false, false));
    });

    // Ceiling gaps + ceiling chunks
    add(PixelEngine.makeBox(40, 0.5, 40, 0x110d07, 0, 6.25, 0, false, false));

    // Wall torches (decorative lights)
    const wallTorchPositions = [[-19, 3, -5],[19, 3, 5],[-5, 3, 19],[5, 3, -19]];
    wallTorchPositions.forEach(([x,y,z]) => {
      add(PixelEngine.makeBox(0.2, 0.6, 0.2, 0x8B4513, x, y, z));
      const flame = PixelEngine.makeBox(0.25, 0.25, 0.25, 0xFF6600, x, y+0.45, z);
      add(flame);
      add(PixelEngine.makePointLight(0xFF7700, 1.2, 8, x, y+0.5, z));
    });

    // Crates
    [[-5, 0.5, -15],[7, 0.5, -12],[12, 0.5, 6],[-13, 0.5, 10]].forEach(([x,y,z]) => {
      add(PixelEngine.makeBox(1.2, 1.2, 1.2, 0x6B4226, x, y, z, true, true));
    });

    // ── Blobs ──────────────────────────────────────────────
    blobs = [];
    const blobPositions = [
      [-6, 0.6, -10],
      [ 6, 0.6, -10],
      [-6, 0.6,  10],
      [ 9, 0.6,   5],
    ];
    blobPositions.forEach(([x, y, z], i) => {
      const geo  = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const mat  = new THREE.MeshLambertMaterial({ color: 0x220033 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.position.set(x, y, z);
      scene.add(mesh); objects.push(mesh);

      // Eye glow
      const eyeL = PixelEngine.makeBox(0.2, 0.2, 0.1, 0xff2222, x-0.2, y+0.25, z+0.55);
      const eyeR = PixelEngine.makeBox(0.2, 0.2, 0.1, 0xff2222, x+0.2, y+0.25, z+0.55);
      scene.add(eyeL); objects.push(eyeL);
      scene.add(eyeR); objects.push(eyeR);

      blobs.push({ mesh, eyeL, eyeR, hp: BLOB_HP, dead: false,
                   vx: (Math.random()-0.5)*1.5, vz: (Math.random()-0.5)*1.5,
                   burnTimer: 0 });
    });

    // ── Torch pickup pedestal ────────────────────────────
    add(PixelEngine.makeBox(1, 0.3, 1, 0x4a3520, 0, 0.15, -16));
    add(PixelEngine.makeBox(0.15, 0.7, 0.15, 0x8B4513, 0, 0.65, -16));
    add(PixelEngine.makeBox(0.25, 0.25, 0.25, 0xFF6600, 0, 1.1, -16));
    add(PixelEngine.makePointLight(0xFF7700, 1.5, 5, 0, 1.5, -16));

    // ── Exit door (locked) ────────────────────────────────
    portalMesh  = PixelEngine.makeBox(2, 3, 0.4, 0x111133, 0, 1.5, 19.5);
    portalLight = PixelEngine.makePointLight(0x3344ff, 0, 8, 0, 3, 18);
    scene.add(portalMesh); objects.push(portalMesh);
    scene.add(portalLight); objects.push(portalLight);
  }

  // ── onLoad ─────────────────────────────────────────────────
  function onLoad() {
    torchCount   = TORCH_MAX;
    activeTorches = [];
    levelDone    = false;
    portalSpawned = false;

    PixelEngine.setTorchCount(torchCount);
    PixelEngine.showMessage('🔥 Throw torches to burn the shadow blobs! (USE button)', 4000);

    // Ambient dungeon flicker
    animFrame = setInterval(_flickerLights, 120);
  }

  function onUnload() {
    clearInterval(animFrame);
    activeTorches = [];
    blobs = [];
  }

  // ── onButton ───────────────────────────────────────────────
  function onButton(name, player, scene) {
    if (name === 'use') {
      _throwTorch(player, scene);
    }
    if (name === 'attack') {
      _punch(player);
    }
  }

  // ── Throw torch ────────────────────────────────────────────
  function _throwTorch(player, scene) {
    if (torchCount <= 0) {
      PixelEngine.showMessage('No torches left!', 1500);
      return;
    }
    if (!player.mesh) return;

    torchCount--;
    PixelEngine.setTorchCount(torchCount);

    const cam = PixelEngine.getCamera();
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    dir.y = 0.35; dir.normalize();

    // Torch mesh
    const geo  = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const mat  = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const mesh = new THREE.Mesh(geo, mat);

    // Flame on top
    const fgeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const fmat = new THREE.MeshLambertMaterial({ color: 0xFF6600, emissive: 0xFF3300, emissiveIntensity: 1 });
    const flame = new THREE.Mesh(fgeo, fmat);
    flame.position.y = 0.4;
    mesh.add(flame);

    const startPos = player.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    mesh.position.copy(startPos);
    scene.add(mesh);

    // Point light (carried by torch)
    const light = new THREE.PointLight(0xFF7700, 1.5, 5);
    mesh.add(light);

    const vel = {
      x: dir.x * TORCH_SPEED,
      y: dir.y * TORCH_SPEED + 2,
      z: dir.z * TORCH_SPEED,
    };

    activeTorches.push({ mesh, vel, landed: false, landTimer: 0, burnParticles: [] });
  }

  // ── Punch ──────────────────────────────────────────────────
  function _punch(player) {
    if (!player.mesh) return;
    const pp = player.mesh.position;
    let hit = false;
    blobs.forEach(b => {
      if (b.dead) return;
      const d = pp.distanceTo(b.mesh.position);
      if (d < PUNCH_RANGE) {
        _damageBlobDirect(b, PUNCH_DAMAGE);
        hit = true;
      }
    });
    if (!hit) PixelEngine.showMessage('👊 Miss!', 700);
  }

  // ── Update ─────────────────────────────────────────────────
  function onUpdate(dt, player, scene) {
    if (levelDone) return;

    _updateTorches(dt, scene);
    _updateBlobs(dt, player, scene);
    _checkPortal(player);
    _checkBlobsDefeated();
  }

  function _updateTorches(dt, scene) {
    const floorY = 0;
    activeTorches.forEach((t, idx) => {
      if (t.landed) {
        // Flicker flame
        t.landTimer += dt;
        const s = 0.85 + 0.15 * Math.sin(t.landTimer * 18 + idx);
        if (t.mesh.children[0]) t.mesh.children[0].scale.setScalar(s);
        return;
      }

      // Physics
      t.vel.y += TORCH_GRAVITY * dt;
      t.mesh.position.x += t.vel.x * dt;
      t.mesh.position.y += t.vel.y * dt;
      t.mesh.position.z += t.vel.z * dt;
      t.mesh.rotation.x += 5 * dt;

      // Bounce/land on floor
      if (t.mesh.position.y <= floorY + 0.3) {
        t.mesh.position.y = floorY + 0.3;
        t.landed = true;
        t.vel = { x:0, y:0, z:0 };
        // Tilt on landing
        t.mesh.rotation.z = Math.PI * 0.45;
        // Expand light range
        const light = t.mesh.children[1];
        if (light) { light.intensity = 2; light.distance = 7; }
      }
    });
  }

  function _updateBlobs(dt, player, scene) {
    const floorY = 0;
    blobs.forEach(b => {
      if (b.dead) return;

      // Wander AI
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.z += b.vz * dt;

      // Bounce off walls
      if (Math.abs(b.mesh.position.x) > 18) b.vx *= -1;
      if (Math.abs(b.mesh.position.z) > 18) b.vz *= -1;

      // Bob up/down
      b.mesh.position.y = floorY + 0.6 + 0.15 * Math.sin(Date.now() * 0.003 + b.mesh.position.x);
      b.eyeL.position.copy(b.mesh.position).add(new THREE.Vector3(-0.2, 0.25, 0.55));
      b.eyeR.position.copy(b.mesh.position).add(new THREE.Vector3( 0.2, 0.25, 0.55));

      // Face player
      if (player.mesh) {
        const angle = Math.atan2(
          player.mesh.position.x - b.mesh.position.x,
          player.mesh.position.z - b.mesh.position.z
        );
        b.mesh.rotation.y = angle;
      }

      // Chase player if close
      if (player.mesh) {
        const dp  = b.mesh.position.distanceTo(player.mesh.position);
        if (dp < 12) {
          const toP = player.mesh.position.clone().sub(b.mesh.position).normalize();
          b.vx += toP.x * 0.8 * dt;
          b.vz += toP.z * 0.8 * dt;
          const spd = Math.sqrt(b.vx*b.vx + b.vz*b.vz);
          if (spd > 2.5) { b.vx = b.vx/spd*2.5; b.vz = b.vz/spd*2.5; }
          // Damage player on contact
          if (dp < 1.2) {
            PixelEngine.takeDamage(8 * dt);
          }
        }
      }

      // Burn from nearby torches
      let burning = false;
      activeTorches.forEach(t => {
        if (!t.landed) return;
        const dist = t.mesh.position.distanceTo(b.mesh.position);
        if (dist < FIRE_RADIUS) burning = true;
      });

      if (burning) {
        b.burnTimer += dt;
        b.mesh.material.emissive = new THREE.Color(0xFF3300);
        b.mesh.material.emissiveIntensity = 0.3 + 0.3 * Math.sin(b.burnTimer * 20);
        _damageBlobDirect(b, BLOB_FIRE_DPS * dt);
      } else {
        b.burnTimer = 0;
        if (b.mesh.material.emissiveIntensity > 0) {
          b.mesh.material.emissiveIntensity = Math.max(0, b.mesh.material.emissiveIntensity - dt * 3);
        }
      }
    });
  }

  function _damageBlobDirect(blob, dmg) {
    if (blob.dead) return;
    blob.hp -= dmg;
    if (blob.hp <= 0) {
      blob.dead = true;
      // Death burst: flash white, scale down
      blob.mesh.material.color.set(0xffffff);
      blob.mesh.material.emissive = new THREE.Color(0xffffff);
      blob.mesh.material.emissiveIntensity = 1;
      const scene = PixelEngine.getScene();
      scene.remove(blob.eyeL);
      scene.remove(blob.eyeR);
      setTimeout(() => { scene.remove(blob.mesh); }, 400);
    }
  }

  function _checkBlobsDefeated() {
    const allDead = blobs.every(b => b.dead);
    if (allDead && !portalSpawned) {
      portalSpawned = true;
      PixelEngine.showMessage('✨ All blobs defeated! Exit portal opened!', 4000);
      // Activate portal
      portalMesh.material.color.set(0x3355ff);
      portalMesh.material.emissive = new THREE.Color(0x2233ff);
      portalMesh.material.emissiveIntensity = 0.8;
      portalLight.intensity = 2.5;
    }
  }

  function _checkPortal(player) {
    if (!portalSpawned || levelDone || !player.mesh) return;
    const d = player.mesh.position.distanceTo(new THREE.Vector3(0, 1.5, 19.5));
    if (d < 2.5) {
      levelDone = true;
      PixelEngine.showMessage('🚪 Entering Level 2…', 2000);
      setTimeout(() => PixelEngine.loadLevel(2), 2000);
    }
  }

  function _flickerLights() {
    // Handled per-update for torches; this is just for ambient atmosphere
  }

  // ── Register level ─────────────────────────────────────────
  PixelLevels[1] = {
    _id:         1,
    name:        '⚔️  LEVEL 1 — THE DUNGEON',
    floorY:      0,
    spawnPoint:  { x: 0, y: 1, z: -16 },
    showTorchUI: true,
    build,
    onLoad,
    onUnload,
    onButton,
    onUpdate,
  };

})();
