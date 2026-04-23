// models.js — Island scene builder: terrain, trees, roads, props, sky
// Called by index.html after Three.js is loaded

window.IslandModels = (function () {

  /* ───────── MATERIALS ───────── */
  function createMaterials() {
    return {
      grass:    new THREE.MeshLambertMaterial({ color: 0x3a7d44 }),
      grassDark:new THREE.MeshLambertMaterial({ color: 0x2d6636 }),
      sand:     new THREE.MeshLambertMaterial({ color: 0xe2c97e }),
      road:     new THREE.MeshLambertMaterial({ color: 0x2c2c2c }),
      roadLine: new THREE.MeshLambertMaterial({ color: 0xf5f0c0 }),
      treeTrunk:new THREE.MeshLambertMaterial({ color: 0x5c3d1e }),
      palmLeaf: new THREE.MeshLambertMaterial({ color: 0x4caf50, side: THREE.DoubleSide }),
      leaf2:    new THREE.MeshLambertMaterial({ color: 0x2e7d32, side: THREE.DoubleSide }),
      rock:     new THREE.MeshLambertMaterial({ color: 0x7a7a7a }),
      rockDark: new THREE.MeshLambertMaterial({ color: 0x555555 }),
      water:    new THREE.MeshLambertMaterial({ color: 0x1a6b9a, transparent: true, opacity: 0.82 }),
      mountain: new THREE.MeshLambertMaterial({ color: 0x6d7d6e }),
      snow:     new THREE.MeshLambertMaterial({ color: 0xeeeeff }),
      bush:     new THREE.MeshLambertMaterial({ color: 0x388e3c }),
      flower:   new THREE.MeshLambertMaterial({ color: 0xff6b6b }),
      flower2:  new THREE.MeshLambertMaterial({ color: 0xffd700 }),
      bark:     new THREE.MeshLambertMaterial({ color: 0x3e2a0f }),
    };
  }

  /* ───────── TERRAIN ───────── */
  function buildTerrain(scene, mats) {
    const SIZE = 2000;
    // Main island ground
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, 80, 80);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      const island = Math.max(0, 1 - (r / 800) ** 2.5) * 55;
      const noise = simplex(x * 0.008, z * 0.008) * 18
                  + simplex(x * 0.02,  z * 0.02)  * 7
                  + simplex(x * 0.05,  z * 0.05)  * 3;
      pos.setY(i, i === 0 ? 0 : island + noise);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mats.grass);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Sandy beach ring
    const beachGeo = new THREE.RingGeometry(720, 860, 64);
    beachGeo.rotateX(-Math.PI / 2);
    const beach = new THREE.Mesh(beachGeo, mats.sand);
    beach.position.y = 0.3;
    scene.add(beach);

    // Ocean floor
    const oceanGeo = new THREE.PlaneGeometry(6000, 6000);
    oceanGeo.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(oceanGeo, mats.water);
    ocean.position.y = -1.5;
    scene.add(ocean);

    return mesh;
  }

  /* ───────── MOUNTAIN ───────── */
  function buildMountain(scene, mats) {
    const group = new THREE.Group();
    // Main peak
    const g1 = new THREE.ConeGeometry(180, 260, 12);
    const m1 = new THREE.Mesh(g1, mats.mountain);
    m1.castShadow = true;
    group.add(m1);
    // Snow cap
    const g2 = new THREE.ConeGeometry(55, 80, 10);
    const m2 = new THREE.Mesh(g2, mats.snow);
    m2.position.y = 155;
    group.add(m2);
    // Side bump
    const g3 = new THREE.ConeGeometry(100, 160, 10);
    const m3 = new THREE.Mesh(g3, mats.mountain);
    m3.position.set(120, -30, 60);
    m3.rotation.z = 0.2;
    group.add(m3);
    group.position.set(-80, 85, -180);
    scene.add(group);
  }

  /* ───────── PALM TREE ───────── */
  function makePalm(mats, scale = 1) {
    const group = new THREE.Group();
    // Trunk (tapered)
    const trunkGeo = new THREE.CylinderGeometry(0.5 * scale, 1.1 * scale, 14 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, mats.treeTrunk);
    trunk.castShadow = true;
    trunk.position.y = 7 * scale;
    trunk.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(trunk);
    // Leaves (fan of planes)
    const leafCount = 7;
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2;
      const leafGeo = new THREE.PlaneGeometry(6 * scale, 1.4 * scale);
      const leaf = new THREE.Mesh(leafGeo, mats.palmLeaf);
      leaf.position.set(
        Math.cos(angle) * 3.5 * scale,
        13.5 * scale,
        Math.sin(angle) * 3.5 * scale
      );
      leaf.rotation.y = angle;
      leaf.rotation.z = -0.5 - Math.random() * 0.3;
      group.add(leaf);
    }
    // Coconuts
    for (let i = 0; i < 3; i++) {
      const cg = new THREE.SphereGeometry(0.5 * scale, 6, 6);
      const c = new THREE.Mesh(cg, mats.treeTrunk);
      const a = Math.random() * Math.PI * 2;
      c.position.set(Math.cos(a) * scale, 12.5 * scale, Math.sin(a) * scale);
      group.add(c);
    }
    return group;
  }

  /* ───────── BROAD TREE ───────── */
  function makeBroadTree(mats, scale = 1) {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.6 * scale, 1.2 * scale, 10 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeo, mats.bark);
    trunk.castShadow = true;
    trunk.position.y = 5 * scale;
    group.add(trunk);
    // Layered foliage
    const layers = [
      { r: 5.5, h: 6, y: 9 },
      { r: 4.5, h: 5, y: 13 },
      { r: 3,   h: 4, y: 16 },
    ];
    layers.forEach(l => {
      const fg = new THREE.ConeGeometry(l.r * scale, l.h * scale, 9);
      const f = new THREE.Mesh(fg, mats.leaf2);
      f.castShadow = true;
      f.position.y = l.y * scale;
      group.add(f);
    });
    return group;
  }

  /* ───────── BUSH ───────── */
  function makeBush(mats, scale = 1) {
    const group = new THREE.Group();
    const g = new THREE.SphereGeometry(2.5 * scale, 7, 6);
    const b = new THREE.Mesh(g, mats.bush);
    b.scale.y = 0.7;
    b.position.y = 1.5 * scale;
    group.add(b);
    // Small flower
    if (Math.random() > 0.5) {
      const fg = new THREE.SphereGeometry(0.4 * scale, 5, 5);
      const fm = Math.random() > 0.5 ? mats.flower : mats.flower2;
      const f = new THREE.Mesh(fg, fm);
      f.position.set((Math.random()-0.5)*2, 3*scale, (Math.random()-0.5)*2);
      group.add(f);
    }
    return group;
  }

  /* ───────── ROCK ───────── */
  function makeRock(mats, scale = 1) {
    const group = new THREE.Group();
    const g = new THREE.DodecahedronGeometry(2.5 * scale, 0);
    const r = new THREE.Mesh(g, Math.random()>0.5 ? mats.rock : mats.rockDark);
    r.scale.set(1 + Math.random()*0.4, 0.6 + Math.random()*0.5, 1 + Math.random()*0.4);
    r.castShadow = true;
    r.position.y = 1 * scale;
    group.add(r);
    return group;
  }

  /* ───────── ROAD SYSTEM ───────── */
  function buildRoads(scene, mats) {
    const W = 9;  // road width
    const roads = [
      // Main ring road
      { type: 'ring', radius: 300, segments: 80 },
      // Cross roads
      { type: 'straight', x1: -300, z1: 0, x2: 300, z2: 0 },
      { type: 'straight', x1: 0, z1: -300, x2: 0, z2: 300 },
      // Scenic loop
      { type: 'ring', radius: 160, segments: 60 },
    ];

    roads.forEach(r => {
      if (r.type === 'ring') {
        const curve = new THREE.EllipseCurve(0, 0, r.radius, r.radius, 0, Math.PI * 2, false);
        const pts = curve.getPoints(r.segments);
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dz = b.y - a.y;
          const len = Math.sqrt(dx*dx + dz*dz);
          const seg = new THREE.PlaneGeometry(len + 0.5, W);
          seg.rotateX(-Math.PI / 2);
          const mesh = new THREE.Mesh(seg, mats.road);
          mesh.position.set((a.x+b.x)/2, 0.25, (a.y+b.y)/2);
          mesh.rotation.y = -Math.atan2(dz, dx);
          mesh.receiveShadow = true;
          scene.add(mesh);
        }
        // Center line dashes
        for (let i = 0; i < pts.length - 1; i += 2) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dz = b.y - a.y;
          const len = Math.sqrt(dx*dx + dz*dz);
          const lg = new THREE.PlaneGeometry(len * 0.6, 0.4);
          lg.rotateX(-Math.PI / 2);
          const lm = new THREE.Mesh(lg, mats.roadLine);
          lm.position.set((a.x+b.x)/2, 0.3, (a.y+b.y)/2);
          lm.rotation.y = -Math.atan2(dz, dx);
          scene.add(lm);
        }
      } else {
        const dx = r.x2 - r.x1, dz = r.z2 - r.z1;
        const len = Math.sqrt(dx*dx + dz*dz);
        const sg = new THREE.PlaneGeometry(len, W);
        sg.rotateX(-Math.PI / 2);
        const sm = new THREE.Mesh(sg, mats.road);
        sm.position.set((r.x1+r.x2)/2, 0.25, (r.z1+r.z2)/2);
        sm.rotation.y = -Math.atan2(dz, dx);
        sm.receiveShadow = true;
        scene.add(sm);
        // Dashes
        const steps = Math.floor(len / 14);
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps;
          const lg = new THREE.PlaneGeometry(6, 0.4);
          lg.rotateX(-Math.PI / 2);
          const lm = new THREE.Mesh(lg, mats.roadLine);
          lm.position.set(r.x1 + dx*t, 0.3, r.z1 + dz*t);
          lm.rotation.y = -Math.atan2(dz, dx);
          scene.add(lm);
        }
      }
    });
  }

  /* ───────── SCATTER VEGETATION ───────── */
  function scatterVegetation(scene, mats) {
    const rng = seededRand(42);

    // Palms near beach
    for (let i = 0; i < 120; i++) {
      const angle = rng() * Math.PI * 2;
      const rad = 620 + rng() * 160;
      const x = Math.cos(angle) * rad;
      const z = Math.sin(angle) * rad;
      const palm = makePalm(mats, 0.7 + rng() * 0.6);
      palm.position.set(x, 0, z);
      palm.rotation.y = rng() * Math.PI * 2;
      scene.add(palm);
    }

    // Broad trees inland
    for (let i = 0; i < 180; i++) {
      const angle = rng() * Math.PI * 2;
      const rad = 80 + rng() * 480;
      const x = Math.cos(angle) * rad;
      const z = Math.sin(angle) * rad;
      if (Math.abs(x) < 15 || Math.abs(z) < 15) continue; // avoid road center
      const tree = makeBroadTree(mats, 0.6 + rng() * 0.9);
      tree.position.set(x, 0, z);
      tree.rotation.y = rng() * Math.PI * 2;
      scene.add(tree);
    }

    // Bushes
    for (let i = 0; i < 250; i++) {
      const angle = rng() * Math.PI * 2;
      const rad = 30 + rng() * 650;
      const x = Math.cos(angle) * rad;
      const z = Math.sin(angle) * rad;
      const bush = makeBush(mats, 0.5 + rng() * 0.8);
      bush.position.set(x, 0, z);
      scene.add(bush);
    }

    // Rocks
    for (let i = 0; i < 90; i++) {
      const angle = rng() * Math.PI * 2;
      const rad = 50 + rng() * 600;
      const x = Math.cos(angle) * rad;
      const z = Math.sin(angle) * rad;
      const rock = makeRock(mats, 0.4 + rng() * 1.2);
      rock.position.set(x, 0, z);
      rock.rotation.y = rng() * Math.PI * 2;
      scene.add(rock);
    }
  }

  /* ───────── SKY / FOG ───────── */
  function buildSky(scene) {
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0xb0d8f0, 400, 1400);

    // Sun sphere
    const sunGeo = new THREE.SphereGeometry(28, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffde4 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(400, 480, -600);
    scene.add(sun);

    // Clouds
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    function makeCloud(x, y, z) {
      const g = new THREE.Group();
      [[0,0,0,18],[14,4,0,13],[-12,3,0,11],[6,-3,8,10]].forEach(([cx,cy,cz,r])=>{
        const s = new THREE.Mesh(new THREE.SphereGeometry(r,8,7), cloudMat);
        s.position.set(cx,cy,cz);
        g.add(s);
      });
      g.position.set(x,y,z);
      return g;
    }
    const cloudPositions = [
      [120,200,-300],[−180,220,−200],[300,180,100],[−250,240,50],
      [50,210,280],[−100,195,−380],[380,230,−120]
    ];
    cloudPositions.forEach(([x,y,z]) => scene.add(makeCloud(x,y,z)));
  }

  /* ───────── LIGHTING ───────── */
  function buildLighting(scene) {
    const ambient = new THREE.AmbientLight(0xfff5e0, 0.7);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff0c0, 1.3);
    sun.position.set(300, 500, -400);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 1500;
    sun.shadow.camera.left = -600;
    sun.shadow.camera.right = 600;
    sun.shadow.camera.top = 600;
    sun.shadow.camera.bottom = -600;
    scene.add(sun);
    const fill = new THREE.HemisphereLight(0x87ceeb, 0x4caf50, 0.4);
    scene.add(fill);
  }

  /* ───────── SIMPLE NOISE (no deps) ───────── */
  function simplex(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = x - X0, y0 = y - Y0;
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 8;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
    let n0=0,n1=0,n2=0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0*t0*(grad2[gi0][0]*x0 + grad2[gi0][1]*y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1*t1*(grad2[gi1][0]*x1 + grad2[gi1][1]*y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2*t2*(grad2[gi2][0]*x2 + grad2[gi2][1]*y2); }
    return 70 * (n0 + n1 + n2);
  }
  const grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const perm = new Array(512);
  (function(){const p=[];for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}for(let i=0;i<512;i++)perm[i]=p[i&255];})();

  function seededRand(seed) {
    let s = seed;
    return function() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  }

  /* ───────── PUBLIC API ───────── */
  return {
    build(scene) {
      const mats = createMaterials();
      buildSky(scene);
      buildLighting(scene);
      buildTerrain(scene, mats);
      buildMountain(scene, mats);
      buildRoads(scene, mats);
      scatterVegetation(scene, mats);
    }
  };
})();
