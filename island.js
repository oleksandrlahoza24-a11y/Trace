/**
 * SCRIPT 2 — island.js
 * ──────────────────────────────────────────────────────────────
 *  Three.js 3-D world.
 *  Builds terrain (noise heightmap), water plane, sky dome,
 *  trees, rocks, and lights.  Exposes IslandWorld + sampleHeight.
 * ──────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════════════════
   *  Procedural noise utilities
   * ════════════════════════════════════════════════════════════════════════ */

  /** Deterministic integer hash */
  function ihash (ix, iy) {
    let n = ((ix * 127 + iy * 311 + 99991) | 0);
    n = ((n >> 13) ^ n) | 0;
    n = (((n * ((n * n * 15731 + 789221) | 0)) | 0) + 1376312589) & 0x7fffffff;
    return n / 2147483647.0;
  }

  /** Smooth value noise */
  function vnoise (x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix,        fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return (
      ihash(ix,   iy)   * (1 - ux) * (1 - uy) +
      ihash(ix+1, iy)   *      ux  * (1 - uy) +
      ihash(ix,   iy+1) * (1 - ux) *      uy  +
      ihash(ix+1, iy+1) *      ux  *      uy
    );
  }

  /** Fractional Brownian motion */
  function fbm (x, y, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < (oct || 7); i++) {
      v += vnoise(x * f, y * f) * a;
      a *= 0.5; f *= 2.1;
    }
    return v;
  }

  /** Deterministic seeded float 0-1 */
  function rand (s) {
    const v = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  Terrain height function
   * ════════════════════════════════════════════════════════════════════════ */
  const WORLD = 500;   // terrain mesh side length
  const WATER = 700;   // water plane side length (extends past terrain)

  /**
   * Returns the terrain Y height at world-space (x, z).
   * Exposed as window.rawHeight for terrain mesh building.
   */
  function rawHeight (x, z) {
    const nx = x / 210;
    const nz = z / 210;
    const d  = Math.sqrt(nx * nx + nz * nz);

    // Circular island mask
    const mask = Math.max(0, 1 - d * 1.12);
    const sm   = mask * mask * (3 - 2 * mask);

    // Layered terrain noise
    const base = fbm(nx * 2.6 + 5.3, nz * 2.6 + 7.1, 7);

    // Central mountain
    const hill = Math.exp(-d * d * 3.5) * 58;

    // Secondary peaks for interest
    const p2 = Math.exp(-((nx-0.28)*(nx-0.28)+(nz-0.38)*(nz-0.38))*14) * 22;
    const p3 = Math.exp(-((nx+0.35)*(nx+0.35)+(nz-0.20)*(nz-0.20))*18) * 13;
    const p4 = Math.exp(-((nx+0.10)*(nx+0.10)+(nz+0.40)*(nz+0.40))*20) *  9;

    return sm * (base * 38 + hill + p2 + p3 + p4) - 2.0;
  }

  /* ── Precomputed heightmap for fast O(1) player queries ─────────────── */
  const HM = 256;
  const _hm = new Float32Array(HM * HM);
  for (let iy = 0; iy < HM; iy++) {
    for (let ix = 0; ix < HM; ix++) {
      const x = ((ix / (HM - 1)) - 0.5) * WORLD;
      const z = ((iy / (HM - 1)) - 0.5) * WORLD;
      _hm[iy * HM + ix] = rawHeight(x, z);
    }
  }

  /** Bilinear-interpolated terrain height. Exposed globally. */
  function sampleHeight (x, z) {
    const u  = x / WORLD + 0.5;
    const v  = z / WORLD + 0.5;
    const fx = Math.max(0, Math.min(HM - 2, u * (HM - 1)));
    const fy = Math.max(0, Math.min(HM - 2, v * (HM - 1)));
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix,        ty = fy - iy;
    const h00 = _hm[iy * HM + ix];
    const h10 = _hm[iy * HM + ix + 1];
    const h01 = _hm[(iy + 1) * HM + ix];
    const h11 = _hm[(iy + 1) * HM + ix + 1];
    return h00*(1-tx)*(1-ty) + h10*tx*(1-ty) + h01*(1-tx)*ty + h11*tx*ty;
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  IslandWorld
   * ════════════════════════════════════════════════════════════════════════ */
  class IslandWorld {
    constructor () {
      this._buildRenderer();
      this._buildScene();
      this._buildTerrain();
      this._buildWater();
      this._buildSky();
      this._buildTrees();
      this._buildRocks();
      this._buildLights();
      this._resize();
      window.addEventListener('resize', () => this._resize());
    }

    /* ── WebGLRenderer ──────────────────────────────────────────────────── */
    _buildRenderer () {
      this.renderer = new THREE.WebGLRenderer({
        antialias:       true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled  = true;
      this.renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;

      const c = this.renderer.domElement;
      c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;';
      document.body.insertBefore(c, document.body.firstChild);
    }

    /* ── Scene + camera ─────────────────────────────────────────────────── */
    _buildScene () {
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x94c9ec, 0.0025);

      this.camera = new THREE.PerspectiveCamera(72, 1, 0.15, 2000);
      this.camera.position.set(0, 14, 55);
    }

    /* ── Procedural terrain mesh ────────────────────────────────────────── */
    _buildTerrain () {
      const SEG = 160;
      const geo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
      geo.rotateX(-Math.PI / 2);

      const pos    = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = rawHeight(x, z);
        pos.setY(i, y);

        // Biome colouring
        let r, g, b;
        const n = vnoise(x * 0.05 + 1.3, z * 0.05 + 2.7); // micro variation

        if (y < -0.3) {                   // sub-water
          r = 0.55 + n*0.06; g = 0.50 + n*0.05; b = 0.38 + n*0.04;
        } else if (y < 2.0) {             // sandy beach
          r = 0.84 + n*0.05; g = 0.77 + n*0.04; b = 0.56 + n*0.05;
        } else if (y < 14.0) {            // lush grass
          const t = (y - 2) / 12;
          r = 0.19 + t*0.08 + n*0.03;
          g = 0.50 + t*0.04 + n*0.06;
          b = 0.14 + t*0.04 + n*0.02;
        } else if (y < 32.0) {            // rocky slopes
          const t = (y - 14) / 18;
          r = 0.36 + t*0.14 + n*0.06;
          g = 0.33 + t*0.10 + n*0.04;
          b = 0.26 + t*0.08 + n*0.03;
        } else if (y < 50.0) {            // dark cliff
          r = 0.48 + n*0.08; g = 0.44 + n*0.06; b = 0.40 + n*0.06;
        } else {                           // snow cap
          r = 0.92 + n*0.04; g = 0.94 + n*0.03; b = 0.97 + n*0.02;
        }
        colors[i*3] = r; colors[i*3+1] = g; colors[i*3+2] = b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.terrain = new THREE.Mesh(geo, mat);
      this.terrain.receiveShadow = true;
      this.scene.add(this.terrain);
    }

    /* ── Water plane + simulation ───────────────────────────────────────── */
    _buildWater () {
      this.waterSim = new WaterSim(this.renderer, 512);
      this.waterMat = this.waterSim.buildWaterMaterial();

      const geo = new THREE.PlaneGeometry(WATER, WATER, 1, 1);
      geo.rotateX(-Math.PI / 2);

      this.waterMesh = new THREE.Mesh(geo, this.waterMat);
      this.waterMesh.position.y = -0.08;
      this.scene.add(this.waterMesh);
    }

    /* ── Procedural sky dome ────────────────────────────────────────────── */
    _buildSky () {
      const geo = new THREE.SphereGeometry(1600, 32, 16);
      const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          precision highp float;
          varying vec3 vPos;
          uniform float uTime;

          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float vn(vec2 p){
            vec2 i=floor(p),f=p-i; f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                       mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
          }
          float fbm(vec2 p){
            float v=0.,a=.5;
            for(int i=0;i<4;i++){v+=vn(p)*a;p*=2.1;a*=.5;}
            return v;
          }

          void main() {
            vec3 d = normalize(vPos);
            float t = clamp(d.y * 1.3, 0.0, 1.0);

            // Sky gradient
            vec3 sky = mix(vec3(0.58, 0.81, 1.00), vec3(0.04, 0.17, 0.58), t*t);

            // Sun disc
            vec3 sunDir = normalize(vec3(0.38, 0.52, -0.76));
            float sd = max(dot(d, sunDir), 0.0);
            sky += vec3(1.00, 0.97, 0.82) * pow(sd, 240.0) * 5.5;
            sky += vec3(1.00, 0.78, 0.42) * pow(sd,   5.5) * 0.55;
            sky += vec3(1.00, 0.55, 0.18) * pow(sd,   2.0) * 0.07;

            // Animated clouds
            if (d.y > 0.02) {
              vec2 cUV = d.xz / (d.y + 0.04) * 0.22 + uTime * 0.0025;
              float cl = fbm(cUV * 3.8) * fbm(cUV * 2.2 + 0.9);
              float mask = smoothstep(0.28, 0.60, cl);
              // Cloud colour: lit side vs shadow side
              vec3 cloudCol = mix(vec3(0.72, 0.78, 0.88), vec3(0.97, 0.98, 1.00),
                                  max(dot(d, sunDir)*0.5+0.5, 0.0));
              sky = mix(sky, cloudCol, mask * clamp(1.0 - t*2.0, 0.0, 1.0) * 0.78);
            }

            gl_FragColor = vec4(sky, 1.0);
          }
        `
      });
      this.skyDome = new THREE.Mesh(geo, mat);
      this.skyMat  = mat;
      this.scene.add(this.skyDome);
    }

    /* ── Procedural trees ───────────────────────────────────────────────── */
    _buildTrees () {
      const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x7a5c18 });
      const greenDark = new THREE.MeshLambertMaterial({ color: 0x1e6b22 });
      const greenMid  = new THREE.MeshLambertMaterial({ color: 0x2a8f30 });
      const greenPale = new THREE.MeshLambertMaterial({ color: 0x3aab40 });

      for (let i = 0; i < 150; i++) {
        const angle = rand(i * 3.17) * Math.PI * 2;
        const r     = 14 + rand(i * 7.31) * 175;
        const x     = Math.cos(angle) * r;
        const z     = Math.sin(angle) * r;
        const y     = rawHeight(x, z);

        if (y < 0.4 || y > 30) continue;

        const treeH = 4.5 + rand(i * 11.7) * 6;
        const type  = rand(i * 19.3);
        const tree  = new THREE.Group();

        if (type < 0.45) {
          /* ── Palm / tropical tree ──────────────────────────────────────── */
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.38, treeH, 7),
            trunkMat
          );
          trunk.position.y = treeH / 2;
          trunk.castShadow = true;

          const cr = 2.2 + rand(i * 23.1) * 2.0;
          const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(cr, 9, 7),
            rand(i * 0.5) < 0.5 ? greenDark : greenMid
          );
          canopy.position.y = treeH + cr * 0.5;
          canopy.scale.y    = 0.65 + rand(i * 31.3) * 0.3;
          canopy.castShadow = true;

          tree.add(trunk, canopy);
          tree.rotation.z = (rand(i * 37.9) - 0.5) * 0.32;
          tree.rotation.x = (rand(i * 41.3) - 0.5) * 0.18;

        } else if (type < 0.80) {
          /* ── Conifer / pine ────────────────────────────────────────────── */
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.22, treeH * 0.55, 6),
            trunkMat
          );
          trunk.position.y = treeH * 0.28;
          trunk.castShadow = true;
          tree.add(trunk);

          for (let lv = 0; lv < 4; lv++) {
            const ly  = treeH * 0.28 + lv * treeH * 0.22;
            const lr  = (2.4 - lv * 0.45) + rand(i * 43.7 + lv) * 0.6;
            const lh  = treeH * 0.42;
            const cone = new THREE.Mesh(
              new THREE.ConeGeometry(lr, lh, 8),
              lv % 2 === 0 ? greenDark : greenMid
            );
            cone.position.y = ly;
            cone.castShadow  = true;
            tree.add(cone);
          }
        } else {
          /* ── Round bushy tree ──────────────────────────────────────────── */
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.28, treeH * 0.6, 7),
            trunkMat
          );
          trunk.position.y = treeH * 0.3;
          trunk.castShadow = true;

          const cr = 2.8 + rand(i * 47.1) * 2.2;
          const cap = new THREE.Mesh(
            new THREE.DodecahedronGeometry(cr, 1),
            greenPale
          );
          cap.position.y = treeH * 0.75;
          cap.castShadow = true;
          tree.add(trunk, cap);
        }

        tree.position.set(x, y, z);
        this.scene.add(tree);
      }
    }

    /* ── Scattered rocks ────────────────────────────────────────────────── */
    _buildRocks () {
      const mats = [
        new THREE.MeshLambertMaterial({ color: 0x7a736a }),
        new THREE.MeshLambertMaterial({ color: 0x8a8278 }),
        new THREE.MeshLambertMaterial({ color: 0x635d57 }),
        new THREE.MeshLambertMaterial({ color: 0x9a908a })
      ];

      for (let i = 0; i < 80; i++) {
        const angle = rand(i * 5.73) * Math.PI * 2;
        const r     = 5 + rand(i * 9.11) * 190;
        const x     = Math.cos(angle) * r;
        const z     = Math.sin(angle) * r;
        const y     = rawHeight(x, z);

        if (y < 0.1) continue;

        const s  = 0.4 + rand(i * 13.9) * 2.8;
        const sy = s * (0.45 + rand(i * 19.7) * 0.65);

        const geo  = new THREE.DodecahedronGeometry(1, 0);
        const rock = new THREE.Mesh(geo, mats[i % 4]);
        rock.scale.set(
          s  * (0.8 + rand(i * 23.1) * 0.5),
          sy,
          s  * (0.8 + rand(i * 29.3) * 0.5)
        );
        rock.rotation.set(
          rand(i * 31.7) * Math.PI,
          rand(i * 37.1) * Math.PI * 2,
          rand(i * 41.9) * Math.PI
        );
        rock.position.set(x, y + sy * 0.28, z);
        rock.castShadow    = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
      }
    }

    /* ── Lighting ───────────────────────────────────────────────────────── */
    _buildLights () {
      // Ambient
      this.scene.add(new THREE.AmbientLight(0x9bbfe8, 0.52));

      // Sky/ground hemisphere
      this.scene.add(new THREE.HemisphereLight(0x89ccf0, 0x3c6b2c, 0.45));

      // Sun (directional + shadows)
      const sun = new THREE.DirectionalLight(0xfff2cc, 2.3);
      sun.position.set(190, 300, -220);
      sun.castShadow = true;
      Object.assign(sun.shadow.mapSize, { width: 2048, height: 2048 });
      Object.assign(sun.shadow.camera, {
        near: 1, far: 1000,
        left: -320, right: 320, top: 320, bottom: -320
      });
      sun.shadow.bias = -0.0004;
      this.scene.add(sun);
    }

    /* ── Resize handler ─────────────────────────────────────────────────── */
    _resize () {
      const w = window.innerWidth, h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      if (this.waterMat) this.waterMat.uniforms.uAspect.value = w / h;
    }

    /* ── tick() called every frame from PlayerController ───────────────── */
    tick (time, waterMouseActive, waterMouseUV) {
      if (waterMouseActive && waterMouseUV) {
        this.waterSim.setMouse(waterMouseUV.x, waterMouseUV.y);
      }
      this.waterSim.step(waterMouseActive);

      this.waterMat.uniforms.uWater.value = this.waterSim.texture;
      this.waterMat.uniforms.uTime.value  = time;

      if (this.skyMat) {
        this.skyMat.uniforms.uTime.value = time;
        this.skyDome.position.copy(this.camera.position);
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  /* ── Exports ──────────────────────────────────────────────────────────── */
  window.IslandWorld  = IslandWorld;
  window.rawHeight    = rawHeight;
  window.sampleHeight = sampleHeight;
  window.WATER_HALF   = WATER / 2;    // used by player for water UV mapping

})();
