/**
 * SCRIPT 1 — water-sim.js
 * ──────────────────────────────────────────────────────────────
 *  Ping-pong WebGL water simulation.
 *  Implements SIM_FRAG (wave equation) + RENDER_FRAG (full PBR water).
 *  Exposes WaterSim class to window scope for island.js to consume.
 * ──────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── Float-texture support detection ───────────────────────────────────── */
  const _c = document.createElement('canvas');
  const _gl = _c.getContext('webgl') || _c.getContext('experimental-webgl');
  const UINT8 = !(_gl && _gl.getExtension('OES_texture_float'));
  window.UINT8_MODE = UINT8;

  /* ── Shared vertex (pass-through UV) ────────────────────────────────────── */
  const SIM_VERT = /* glsl */`
    varying vec2 vUV;
    void main() {
      vUV = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  /* ── Wave-equation simulation fragment ─────────────────────────────────── */
  const SIM_FRAG = (UINT8 ? '#define UINT8_MODE\n' : '') + /* glsl */`
    precision highp float;
    varying vec2  vUV;
    uniform sampler2D uState;
    uniform vec2  uTexel;
    uniform vec2  uMouse;
    uniform float uRadius;
    uniform float uStrength;

    #ifdef UINT8_MODE
      vec2 enc16(float v) {
        float t   = clamp(v * 0.5 + 0.5, 0.0, 0.99999);
        float t255 = t * 255.0;
        return vec2(floor(t255) / 255.0, fract(t255));
      }
      float dec16(vec2 v) { return (v.x + v.y / 255.0) * 2.0 - 1.0; }
      float CURR(vec2 uv) { return dec16(texture2D(uState, uv).rg); }
      float PREV(vec2 uv) { return dec16(texture2D(uState, uv).ba); }
    #else
      float CURR(vec2 uv) { return texture2D(uState, uv).r * 2.0 - 1.0; }
      float PREV(vec2 uv) { return texture2D(uState, uv).g * 2.0 - 1.0; }
    #endif

    void main() {
      float curr = CURR(vUV);
      float prev = PREV(vUV);

      float n = CURR(vUV + vec2( 0.0,      uTexel.y));
      float s = CURR(vUV - vec2( 0.0,      uTexel.y));
      float e = CURR(vUV + vec2( uTexel.x, 0.0     ));
      float w = CURR(vUV - vec2( uTexel.x, 0.0     ));

      // 2-D wave equation (alpha=0.5 → stable)
      float next = (-prev + (n + s + e + w) * 0.5) * 0.994;

      // Sponge layer: absorb at borders
      float bx = min(vUV.x, 1.0 - vUV.x) * 14.0;
      float by = min(vUV.y, 1.0 - vUV.y) * 14.0;
      next *= mix(0.78, 1.0, clamp(min(bx, by), 0.0, 1.0));

      // Pointer / drop disturbance
      float d = length(vUV - uMouse);
      next -= smoothstep(uRadius, 0.0, d) * uStrength;
      next  = clamp(next, -1.0, 1.0);

      #ifdef UINT8_MODE
        gl_FragColor = vec4(enc16(next), enc16(curr));
      #else
        gl_FragColor = vec4(next * 0.5 + 0.5, curr * 0.5 + 0.5, 0.0, 1.0);
      #endif
    }
  `;

  /* ── Render vertex (Three.js matrices) ─────────────────────────────────── */
  const RENDER_VERT = /* glsl */`
    varying vec2 vUV;
    void main() {
      vUV = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  /* ── Full PBR water render fragment ────────────────────────────────────── */
  const RENDER_FRAG = (UINT8 ? '#define UINT8_MODE\n' : '') + /* glsl */`
    precision highp float;
    varying vec2  vUV;
    uniform sampler2D uWater;
    uniform vec2  uTexel;
    uniform float uTime;
    uniform float uAspect;

    // ── Noise ──────────────────────────────────────────────────────────────
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = p - i;
      f = f*f*(3.0 - 2.0*f);
      return mix(mix(hash(i),         hash(i+vec2(1,0)), f.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
    }
    float fbm(vec2 p) {
      float v=0.0, a=0.5;
      for(int i=0;i<5;i++){ v+=vnoise(p)*a; p*=2.1; a*=0.5; }
      return v;
    }

    // ── Sky dome ───────────────────────────────────────────────────────────
    vec3 getSky(vec2 dir) {
      float t   = clamp(dir.y * 1.6, 0.0, 1.0);
      vec3 sky  = mix(vec3(0.48, 0.72, 0.96), vec3(0.05, 0.22, 0.68), t*t);
      vec2 sunD = normalize(vec2(0.35, 0.72));
      float sd  = dot(normalize(dir), sunD);
      sky += vec3(1.00, 0.97, 0.80) * pow(max(sd, 0.0), 200.0) * 4.0;
      sky += vec3(1.00, 0.78, 0.42) * pow(max(sd, 0.0),   5.0) * 0.45;
      float cl = fbm(dir*5.0+3.7) * fbm(dir*3.0+1.2);
      sky = mix(sky, vec3(0.92, 0.95, 1.00), smoothstep(0.35,0.65,cl)*0.5*(1.0-t));
      return sky;
    }

    // ── Seabed ─────────────────────────────────────────────────────────────
    vec3 getSeabed(vec2 uv) {
      float dr = uTime * 0.025;
      float r1 = sin(uv.x*32.0 + fbm(uv*4.0+dr)*5.0)*0.5+0.5;
      float r2 = sin(uv.y*26.0 + fbm(uv*3.5+1.7+dr)*4.0)*0.5+0.5;
      float det = fbm(uv*16.0+dr*0.5);
      vec3 base = mix(vec3(0.73,0.61,0.38), vec3(0.82,0.71,0.48), r1*r2*pow(det,0.5));
      float rf  = smoothstep(0.55,0.75, fbm(uv*3.8+2.3));
      base = mix(base, vec3(0.47,0.43,0.37)*(0.7+0.3*fbm(uv*9.0+4.1)), rf*0.7);
      float wd  = smoothstep(0.60,0.82,fbm(uv*8.5+5.8))*smoothstep(0.50,0.68,fbm(uv*5.0+8.3));
      base = mix(base, vec3(0.15,0.38,0.18), wd*0.60);
      float pb  = step(0.78, hash(floor(uv*80.0)));
      base = mix(base, vec3(vnoise(uv*80.0)*0.2+0.5)*0.6, pb*0.3);
      return base;
    }

    // ── Height fetch ──────────────────────────────────────────────────────
    #ifdef UINT8_MODE
      float H(vec2 uv) {
        vec4 s = texture2D(uWater, uv);
        return (s.r + s.g / 255.0) * 2.0 - 1.0;
      }
    #else
      float H(vec2 uv) { return texture2D(uWater, uv).r * 2.0 - 1.0; }
    #endif

    // ── GGX microfacet specular ───────────────────────────────────────────
    float GGX(float NdotH, float rough) {
      float a2 = rough*rough*rough*rough;
      float d  = NdotH*NdotH*(a2-1.0)+1.0;
      return a2 / (3.14159*d*d + 1e-5);
    }

    void main() {
      vec2 uv = vUV;
      vec2 tx = uTexel * 2.0;

      // Sobel normal from height field (8-tap)
      float hL  = H(uv - vec2(tx.x, 0.0));
      float hR  = H(uv + vec2(tx.x, 0.0));
      float hU  = H(uv + vec2(0.0,  tx.y));
      float hD  = H(uv - vec2(0.0,  tx.y));
      float hLU = H(uv + vec2(-tx.x,  tx.y));
      float hRU = H(uv + vec2( tx.x,  tx.y));
      float hLD = H(uv + vec2(-tx.x, -tx.y));
      float hRD = H(uv + vec2( tx.x, -tx.y));

      float ns = 4.8;
      float dX = (hRD + 2.0*hR + hRU - hLD - 2.0*hL - hLU) * ns / uAspect;
      float dY = (hLU + 2.0*hU + hRU - hLD - 2.0*hD - hRD) * ns;
      vec3 normal = normalize(vec3(-dX, -dY, 1.0));

      float h   = H(uv);
      vec3  V   = vec3(0.0, 0.0, 1.0);
      vec3  L   = normalize(vec3(0.40, 0.68, 1.0));
      vec3  Hv  = normalize(V + L);

      // Fresnel (Schlick, water IOR 1.333)
      float cosI    = max(dot(normal, V), 0.0);
      float fresnel = clamp(0.020 + 0.980 * pow(1.0 - cosI, 5.0), 0.0, 1.0);

      // Refraction
      vec2 refOff = vec2(normal.x / uAspect, normal.y) * 0.065;
      vec2 refUV  = clamp(uv + refOff, 0.001, 0.999);
      vec3 seabed = getSeabed(refUV + vec2(uTime * 0.003, 0.0));

      // Beer-Lambert water extinction
      seabed *= exp(-vec3(0.70, 0.12, 0.04) * 2.5);

      // Caustics
      float lap = hU + hD + hL + hR - 4.0*h;
      float curvCaus = pow(max(0.0, -lap * 9.0), 1.6) * 2.0;
      vec2 cUV = refUV * vec2(uAspect*12.0, 12.0);
      float ca = sin(cUV.x*1.9 + uTime*2.5)*sin(cUV.y*1.8 + uTime*2.1)
               + sin(cUV.x*1.3 - uTime*1.7 + 1.1)*sin(cUV.y*1.4 - uTime*2.0 + 0.8)
               + sin((cUV.x+cUV.y)*1.1 + uTime*1.4)*0.5;
      float animCaus = pow(max(0.0, ca*0.2+0.5), 3.8) * 0.6;
      seabed *= 1.0 + curvCaus + animCaus;

      // Sky reflection
      vec3 R   = reflect(-L, normal);
      vec3 sky = getSky(R.xy * 0.5 + 0.5);

      // Water body tint
      vec3 deepCol    = vec3(0.008, 0.07, 0.20);
      vec3 shallowCol = vec3(0.05,  0.36, 0.62);
      vec3 waterCol   = mix(deepCol, shallowCol, clamp(0.5 + h*2.0, 0.0, 1.0));

      // Compose via Fresnel
      vec3 col = mix(seabed, sky, clamp(fresnel*0.90 + 0.05, 0.0, 1.0));
      col = mix(col, waterCol, 0.18);

      // Sub-surface scattering
      float sss = smoothstep(-0.05, 0.30, h) * max(0.0, dot(normal, L));
      col += vec3(0.00, 0.50, 0.72) * sss * 0.30;

      // GGX specular
      float rough = max(0.012, 0.012 + abs(h)*0.08);
      float NdotH = max(dot(normal, Hv), 0.0);
      float NdotL = max(dot(normal, L),  0.0);
      float spec  = GGX(NdotH, rough);
      col += vec3(1.00, 0.97, 0.88) * spec * NdotL * 0.20 * fresnel;
      float RdotV = max(dot(R, V), 0.0);
      col += vec3(0.82, 0.91, 1.00) * pow(RdotV, 40.0) * 0.22;

      // Foam at wave crests
      float crest = smoothstep(0.18, 0.40, h);
      float foamN = pow(fbm(uv*22.0 + uTime*0.8), 1.4);
      col = mix(col, vec3(0.96, 0.98, 1.00), crest*foamN*0.85);
      float wake = smoothstep(0.07, 0.20, abs(h)) * fbm(uv*16.0+uTime*0.4) * 0.15;
      col += vec3(0.72, 0.86, 1.00) * wake;

      // Horizon haze
      float fog = pow(clamp(1.0 - vUV.y*1.6, 0.0, 1.0), 4.0) * 0.22;
      col = mix(col, vec3(0.26, 0.52, 0.80), fog);

      // Vignette
      vec2 vd = (vUV*2.0-1.0) * vec2(uAspect, 1.0);
      col *= clamp(1.0 - dot(vd,vd)*0.055, 0.0, 1.0);

      // Filmic tone-map + gamma
      col = col*(1.0+col*0.14)/(col+0.9)*1.08;
      col = pow(max(col, vec3(0.0)), vec3(1.0/2.2));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ════════════════════════════════════════════════════════════════════════
   *  WaterSim class
   * ════════════════════════════════════════════════════════════════════════ */
  class WaterSim {
    constructor (renderer, resolution) {
      this.renderer = renderer;
      this.res      = resolution || 512;
      this.mouse    = new THREE.Vector2(-9, -9);

      this._buildSimMaterial();
      this._buildTargets();
      this._buildQuad();
      this._initBuffers();   // zero-fill both RTs
      this._seedWaves();     // kick off initial ripples
    }

    /* ── Simulation ShaderMaterial ──────────────────────────────────────── */
    _buildSimMaterial () {
      this.simMat = new THREE.ShaderMaterial({
        vertexShader:   SIM_VERT,
        fragmentShader: SIM_FRAG,
        uniforms: {
          uState:    { value: null },
          uTexel:    { value: new THREE.Vector2(1 / this.res, 1 / this.res) },
          uMouse:    { value: this.mouse },
          uRadius:   { value: 0.045 },
          uStrength: { value: 0 }
        },
        depthTest:  false,
        depthWrite: false
      });
    }

    /* ── Ping-pong render targets ───────────────────────────────────────── */
    _buildTargets () {
      const opts = {
        format:        THREE.RGBAFormat,
        type:          UINT8 ? THREE.UnsignedByteType : THREE.FloatType,
        minFilter:     THREE.LinearFilter,
        magFilter:     THREE.LinearFilter,
        wrapS:         THREE.ClampToEdgeWrapping,
        wrapT:         THREE.ClampToEdgeWrapping,
        depthBuffer:   false,
        stencilBuffer: false
      };
      this.rtA   = new THREE.WebGLRenderTarget(this.res, this.res, opts);
      this.rtB   = new THREE.WebGLRenderTarget(this.res, this.res, opts);
      this.read  = this.rtA;
      this.write = this.rtB;
    }

    /* ── Full-screen quad for sim passes ───────────────────────────────── */
    _buildQuad () {
      this.simScene  = new THREE.Scene();
      this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMat);
      this.simScene.add(this.quad);
    }

    /* ── Zero-fill both buffers so wave eq starts at rest ─────────────── */
    _initBuffers () {
      // 0.498 ≈ enc16(0) ≈ float mode 0.5 — both modes get ~zero displacement
      const initFrag = `
        precision highp float;
        void main() { gl_FragColor = vec4(0.498, 0.498, 0.498, 0.498); }
      `;
      const initMat = new THREE.ShaderMaterial({
        vertexShader: SIM_VERT, fragmentShader: initFrag,
        depthTest: false, depthWrite: false
      });
      this.quad.material = initMat;
      [this.rtA, this.rtB].forEach(rt => {
        this.renderer.setRenderTarget(rt);
        this.renderer.render(this.simScene, this.simCamera);
      });
      this.renderer.setRenderTarget(null);
      this.quad.material = this.simMat;
      initMat.dispose();
    }

    /* ── Seed some opening ripples so the water isn't dead-flat ─────────── */
    _seedWaves () {
      const pts = [
        [0.28, 0.35], [0.72, 0.65], [0.50, 0.25],
        [0.18, 0.72], [0.82, 0.18], [0.60, 0.80]
      ];
      pts.forEach(([x, y]) => {
        this.mouse.set(x, y);
        this.simMat.uniforms.uMouse.value.set(x, y);
        this.simMat.uniforms.uStrength.value = 1.0;
        for (let i = 0; i < 4; i++) this._rawStep();
      });
      this.simMat.uniforms.uStrength.value = 0;
    }

    /* ── Internal raw step (no strength override) ───────────────────────── */
    _rawStep () {
      this.simMat.uniforms.uState.value = this.read.texture;
      this.renderer.setRenderTarget(this.write);
      this.renderer.render(this.simScene, this.simCamera);
      this.renderer.setRenderTarget(null);
      const tmp = this.read; this.read = this.write; this.write = tmp;
    }

    /* ── Public: advance simulation one tick ────────────────────────────── */
    step (mouseActive) {
      this.simMat.uniforms.uState.value    = this.read.texture;
      this.simMat.uniforms.uStrength.value = mouseActive ? 0.55 : 0;
      this.renderer.setRenderTarget(this.write);
      this.renderer.render(this.simScene, this.simCamera);
      this.renderer.setRenderTarget(null);
      const tmp = this.read; this.read = this.write; this.write = tmp;
    }

    /* ── Public: current water texture ─────────────────────────────────── */
    get texture () { return this.read.texture; }

    /* ── Public: set disturbance origin (normalised 0-1) ───────────────── */
    setMouse (nx, ny) {
      this.mouse.set(
        Math.max(0.001, Math.min(0.999, nx)),
        Math.max(0.001, Math.min(0.999, ny))
      );
      this.simMat.uniforms.uMouse.value.copy(this.mouse);
    }

    /* ── Build the Three.js ShaderMaterial for the 3-D water plane ──────── */
    buildWaterMaterial () {
      return new THREE.ShaderMaterial({
        vertexShader:   RENDER_VERT,
        fragmentShader: RENDER_FRAG,
        uniforms: {
          uWater:  { value: null },
          uTexel:  { value: new THREE.Vector2(1 / this.res, 1 / this.res) },
          uTime:   { value: 0 },
          uAspect: { value: 1 }
        },
        side:        THREE.FrontSide,
        transparent: false
      });
    }
  }

  /* ── Exports ──────────────────────────────────────────────────────────── */
  window.WaterSim = WaterSim;

})();
