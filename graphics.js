// graphics.js — Ultra Realistic Renderer
// PBR materials · Motion Blur · SSAO · Bloom · God Rays · HDR Tonemapping
// Requires Three.js r128+ and postprocessing (via CDN or npm)

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';


// ─────────────────────────────────────────────
// 1. RENDERER — HDR, PBR, Physical Lighting
// ─────────────────────────────────────────────
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: false }); // SMAA handles AA
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // Cinematic tonemapping
renderer.toneMappingExposure = 1.2;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;              // Energy-conserving lighting
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);


// ─────────────────────────────────────────────
// 2. SKY & FOG — Atmospheric Scattering
// ─────────────────────────────────────────────
const SkyShader = {
    uniforms: {
        uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.2).normalize() },
        uRayleigh: { value: 2.0 },
        uMie: { value: 0.005 },
        uMieDirectional: { value: 0.8 },
        uSunIntensity: { value: 20.0 },
    },
    vertexShader: `
        varying vec3 vWorldPos;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        uniform vec3 uSunDir;
        uniform float uRayleigh;
        uniform float uMie;
        uniform float uMieDirectional;
        uniform float uSunIntensity;
        varying vec3 vWorldPos;

        const float PI = 3.14159265358979;
        const vec3 lambda = vec3(680e-9, 550e-9, 450e-9);
        const vec3 totalRayleigh = vec3(5.804542996e-6, 1.3562911419e-5, 3.0265902468e-5);

        float rayleighPhase(float cosTheta) {
            return (3.0 / (16.0 * PI)) * (1.0 + pow(cosTheta, 2.0));
        }

        float hgPhase(float cosTheta, float g) {
            float g2 = pow(g, 2.0);
            float inv = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
            return (1.0 / (4.0 * PI)) * ((1.0 - g2) * inv);
        }

        void main() {
            vec3 dir = normalize(vWorldPos);
            float cosTheta = dot(dir, uSunDir);

            float rPhase = rayleighPhase(cosTheta);
            float mPhase = hgPhase(cosTheta, uMieDirectional);

            vec3 rayleigh = uRayleigh * totalRayleigh * rPhase;
            vec3 mie = uMie * vec3(2.1e-3) * mPhase;

            float scatter = exp(-max(dir.y, 0.0) * 8.0);
            vec3 color = uSunIntensity * (rayleigh + mie) * scatter;
            color += pow(max(0.0, cosTheta), 128.0) * vec3(10.0, 9.0, 7.0); // Sun disc

            gl_FragColor = vec4(color, 1.0);
        }
    `,
};

const skyGeo = new THREE.SphereGeometry(900, 32, 32);
const skyMat = new THREE.ShaderMaterial({ ...SkyShader, side: THREE.BackSide, depthWrite: false });
scene.add(new THREE.Mesh(skyGeo, skyMat));

scene.fog = new THREE.FogExp2(0x8ec7e8, 0.0012);


// ─────────────────────────────────────────────
// 3. LIGHTING — PBR Sun + Sky + Fill
// ─────────────────────────────────────────────
const SUN_DIR = new THREE.Vector3(80, 200, 50).normalize();

const sunLight = new THREE.DirectionalLight(0xfff4d6, 80000); // Physically-correct lux
sunLight.position.copy(SUN_DIR.clone().multiplyScalar(200));
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(4096, 4096);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 800;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.05;
scene.add(sunLight);

const skyHemi = new THREE.HemisphereLight(0x87ceeb, 0x4a6741, 8000); // Sky/ground hemi
scene.add(skyHemi);

const fillLight = new THREE.DirectionalLight(0xb0d8ff, 3000); // Soft blue fill
fillLight.position.set(-100, 80, -60);
scene.add(fillLight);


// ─────────────────────────────────────────────
// 4. WORLD GEOMETRY (PBR Materials)
// ─────────────────────────────────────────────
scene.add(IslandModels.createGround());   // assumes models.js returns MeshStandardMaterial meshes
scene.add(IslandModels.createOcean());

const forest = IslandModels.createTrees(600);
scene.add(forest.trunks);
scene.add(forest.leaves);

// Upgrade all loaded mesh materials to full PBR
scene.traverse((obj) => {
    if (obj.isMesh) {
        const m = obj.material;
        if (m && m.isMeshStandardMaterial) {
            m.envMapIntensity = 1.2;
            m.roughness = m.roughness ?? 0.85;
            m.metalness = m.metalness ?? 0.0;
        }
        obj.castShadow = true;
        obj.receiveShadow = true;
    }
});


// ─────────────────────────────────────────────
// 5. POST-PROCESSING STACK
// ─────────────────────────────────────────────
const composer = new EffectComposer(renderer);

// Base render
composer.addPass(new RenderPass(scene, camera));

// SSAO — ambient occlusion for contact shadows
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 12;
ssaoPass.minDistance = 0.001;
ssaoPass.maxDistance = 0.08;
ssaoPass.output = SSAOPass.OUTPUT.Default;
composer.addPass(ssaoPass);

// HDR Bloom — physically-based glow on bright areas
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,   // strength
    0.55,   // radius
    0.88    // threshold (only very bright areas bloom)
);
composer.addPass(bloomPass);

// Velocity-based Motion Blur (custom shader)
const MotionBlurShader = {
    uniforms: {
        tDiffuse:        { value: null },
        tVelocity:       { value: null },
        uBlurScale:      { value: 0.5 },
        uSamples:        { value: 16 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tVelocity;
        uniform float uBlurScale;
        uniform int uSamples;
        varying vec2 vUv;

        void main() {
            vec2 vel = texture2D(tVelocity, vUv).rg * 2.0 - 1.0;
            vel *= uBlurScale;

            vec4 color = texture2D(tDiffuse, vUv);
            if (length(vel) < 0.0002) { gl_FragColor = color; return; }

            float w = 1.0;
            for (int i = 1; i < 16; i++) {
                if (i >= uSamples) break;
                float t = float(i) / float(uSamples - 1);
                color += texture2D(tDiffuse, vUv + vel * (t - 0.5));
                w += 1.0;
            }
            gl_FragColor = color / w;
        }
    `,
};

// Velocity render target
const velocityRT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
});

// Velocity material — encodes screen-space motion
const VelocityMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uPrevMVP: { value: new THREE.Matrix4() },
        uCurrMVP: { value: new THREE.Matrix4() },
    },
    vertexShader: `
        uniform mat4 uPrevMVP;
        uniform mat4 uCurrMVP;
        varying vec4 vCurrPos;
        varying vec4 vPrevPos;
        void main() {
            vCurrPos = uCurrMVP * vec4(position, 1.0);
            vPrevPos = uPrevMVP * vec4(position, 1.0);
            gl_Position = vCurrPos;
        }
    `,
    fragmentShader: `
        varying vec4 vCurrPos;
        varying vec4 vPrevPos;
        void main() {
            vec2 curr = (vCurrPos.xy / vCurrPos.w) * 0.5 + 0.5;
            vec2 prev = (vPrevPos.xy / vPrevPos.w) * 0.5 + 0.5;
            vec2 vel = (curr - prev) * 0.5 + 0.5; // Pack into [0,1]
            gl_FragColor = vec4(vel, 0.0, 1.0);
        }
    `,
});

const motionBlurPass = new ShaderPass(MotionBlurShader);
motionBlurPass.uniforms.tVelocity.value = velocityRT.texture;
motionBlurPass.uniforms.uBlurScale.value = 0.6;
motionBlurPass.uniforms.uSamples.value = 16;
composer.addPass(motionBlurPass);

// God Rays / Light Shafts (screen-space radial blur toward sun)
const GodRaysShader = {
    uniforms: {
        tDiffuse:    { value: null },
        uSunPos:     { value: new THREE.Vector2(0.5, 0.8) },
        uDecay:      { value: 0.96 },
        uDensity:    { value: 0.96 },
        uWeight:     { value: 0.4 },
        uExposure:   { value: 0.35 },
        uSamples:    { value: 100 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uSunPos;
        uniform float uDecay, uDensity, uWeight, uExposure;
        uniform int uSamples;
        varying vec2 vUv;

        void main(){
            vec2 texCoord = vUv;
            vec2 deltaTexCoord = texCoord - uSunPos;
            deltaTexCoord *= 1.0 / float(uSamples) * uDensity;
            float illuminationDecay = 1.0;
            vec4 color = vec4(0.0);

            for(int i=0; i<100; i++){
                if(i >= uSamples) break;
                texCoord -= deltaTexCoord;
                vec4 s = texture2D(tDiffuse, texCoord);
                s.rgb = max(s.rgb - 0.3, 0.0); // Only bright areas contribute
                s *= illuminationDecay * uWeight;
                color += s;
                illuminationDecay *= uDecay;
            }
            vec4 orig = texture2D(tDiffuse, vUv);
            gl_FragColor = orig + color * uExposure;
        }
    `,
};

const godRaysPass = new ShaderPass(GodRaysShader);
composer.addPass(godRaysPass);

// Depth of Field — Bokeh blur (thin lens model)
const DoFShader = {
    uniforms: {
        tDiffuse:   { value: null },
        tDepth:     { value: null },
        uFocus:     { value: 0.15 },    // Focus depth (0-1, NDC)
        uAperture:  { value: 0.00015 },
        uMaxBlur:   { value: 0.004 },
        uNear:      { value: 0.1 },
        uFar:       { value: 2000.0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
        #include <packing>
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uFocus, uAperture, uMaxBlur, uNear, uFar;
        varying vec2 vUv;

        float readDepth(vec2 uv){
            float frag = texture2D(tDepth, uv).x;
            return perspectiveDepthToViewZ(frag, uNear, uFar);
        }

        void main(){
            vec2 aspect = vec2(1.0, float(textureSize(tDiffuse, 0).y) / float(textureSize(tDiffuse, 0).x));
            float depth = -readDepth(vUv);
            float focusDist = uFocus * uFar;
            float coc = clamp(uAperture * abs(depth - focusDist) / depth, -uMaxBlur, uMaxBlur);

            vec4 color = vec4(0.0);
            float total = 0.0;
            for(float t = -4.0; t <= 4.0; t += 1.0){
                for(float s = -4.0; s <= 4.0; s += 1.0){
                    vec2 offset = vec2(t, s) * aspect * coc;
                    color += texture2D(tDiffuse, vUv + offset);
                    total += 1.0;
                }
            }
            gl_FragColor = color / total;
        }
    `,
};

const depthRT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    depthBuffer: true,
    depthTexture: new THREE.DepthTexture(),
});

const dofPass = new ShaderPass(DoFShader);
dofPass.uniforms.tDepth.value = depthRT.depthTexture;
dofPass.uniforms.uNear.value = camera.near;
dofPass.uniforms.uFar.value = camera.far;
composer.addPass(dofPass);

// Chromatic Aberration + Film Grain + Vignette (combined cinematic LUT pass)
const CinematicPass = new ShaderPass({
    uniforms: {
        tDiffuse:    { value: null },
        uTime:       { value: 0.0 },
        uGrain:      { value: 0.04 },
        uVignette:   { value: 0.45 },
        uAberration: { value: 0.0012 },
        uSaturation: { value: 1.12 },
        uContrast:   { value: 1.05 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime, uGrain, uVignette, uAberration, uSaturation, uContrast;
        varying vec2 vUv;

        float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }

        vec3 saturation(vec3 c, float s){
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            return mix(vec3(l), c, s);
        }

        void main(){
            // Chromatic aberration
            vec2 d = (vUv - 0.5) * uAberration;
            float r = texture2D(tDiffuse, vUv + d * 1.0).r;
            float g = texture2D(tDiffuse, vUv        ).g;
            float b = texture2D(tDiffuse, vUv - d * 1.0).b;
            vec3 color = vec3(r, g, b);

            // Contrast
            color = (color - 0.5) * uContrast + 0.5;

            // Saturation
            color = saturation(color, uSaturation);

            // Film grain
            float grain = (rand(vUv + fract(uTime * 0.1)) - 0.5) * uGrain;
            color += grain;

            // Vignette
            float dist = length(vUv - 0.5) * 1.5;
            color *= 1.0 - smoothstep(0.5, 1.2, dist) * uVignette;

            gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    `,
});
composer.addPass(CinematicPass);

// SMAA anti-aliasing (last pass)
const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
composer.addPass(smaaPass);

// Gamma correction (final output)
composer.addPass(new ShaderPass(GammaCorrectionShader));


// ─────────────────────────────────────────────
// 6. INPUT — Dual-Zone Touch Controls
// ─────────────────────────────────────────────
let moveTouch = { id: null, startX: 0, startY: 0, deltaX: 0, deltaY: 0 };
let lookTouch = { id: null, lastX: 0, lastY: 0 };
let pitch = 0, yaw = 0;
const MOVE_SPEED = 0.2;
const LOOK_SPEED = 0.004;

window.addEventListener('touchstart', (e) => {
    for (const touch of e.changedTouches) {
        if (touch.clientX < window.innerWidth / 2) {
            if (moveTouch.id === null) {
                moveTouch = { id: touch.identifier, startX: touch.clientX, startY: touch.clientY, deltaX: 0, deltaY: 0 };
            }
        } else {
            if (lookTouch.id === null) {
                lookTouch = { id: touch.identifier, lastX: touch.clientX, lastY: touch.clientY };
            }
        }
    }
});

window.addEventListener('touchmove', (e) => {
    for (const touch of e.changedTouches) {
        if (touch.identifier === moveTouch.id) {
            moveTouch.deltaX = touch.clientX - moveTouch.startX;
            moveTouch.deltaY = touch.clientY - moveTouch.startY;
        } else if (touch.identifier === lookTouch.id) {
            yaw   -= (touch.clientX - lookTouch.lastX) * LOOK_SPEED;
            pitch -= (touch.clientY - lookTouch.lastY) * LOOK_SPEED;
            pitch  = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch));
            lookTouch.lastX = touch.clientX;
            lookTouch.lastY = touch.clientY;
        }
    }
});

const endTouch = (e) => {
    for (const touch of e.changedTouches) {
        if (touch.identifier === moveTouch.id) moveTouch = { id: null, startX: 0, startY: 0, deltaX: 0, deltaY: 0 };
        else if (touch.identifier === lookTouch.id) lookTouch.id = null;
    }
};
window.addEventListener('touchend', endTouch);
window.addEventListener('touchcancel', endTouch);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    velocityRT.setSize(window.innerWidth, window.innerHeight);
    depthRT.setSize(window.innerWidth, window.innerHeight);
    ssaoPass.setSize(window.innerWidth, window.innerHeight);
});


// ─────────────────────────────────────────────
// 7. VELOCITY PASS HELPERS
// ─────────────────────────────────────────────
const prevMVP = new THREE.Matrix4();
const currMVP = new THREE.Matrix4();
let prevViewProj = new THREE.Matrix4();

function renderVelocityBuffer() {
    const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    scene.traverse((obj) => {
        if (!obj.isMesh) return;
        const curr = new THREE.Matrix4().multiplyMatrices(vp, obj.matrixWorld);
        const prev = new THREE.Matrix4().multiplyMatrices(prevViewProj, obj.matrixWorld);
        const origMat = obj.material;
        obj.material = VelocityMaterial;
        VelocityMaterial.uniforms.uCurrMVP.value.copy(curr);
        VelocityMaterial.uniforms.uPrevMVP.value.copy(prev);
        obj.material = origMat;
    });

    renderer.setRenderTarget(velocityRT);
    scene.overrideMaterial = VelocityMaterial;
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    renderer.setRenderTarget(null);

    prevViewProj.copy(vp);
}

function renderDepthBuffer() {
    renderer.setRenderTarget(depthRT);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
}

function updateSunScreenPos() {
    const sunWorld = sunLight.position.clone();
    const sunNDC = sunWorld.project(camera);
    godRaysPass.uniforms.uSunPos.value.set(
        (sunNDC.x * 0.5 + 0.5),
        (sunNDC.y * 0.5 + 0.5)
    );
    const visible = sunNDC.z < 1.0;
    godRaysPass.enabled = visible;
}


// ─────────────────────────────────────────────
// 8. GAME LOOP
// ─────────────────────────────────────────────
const clock = new THREE.Clock();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update cinematic uniforms
    CinematicPass.uniforms.uTime.value = elapsed;
    skyMat.uniforms.uSunDir.value.copy(SUN_DIR);

    // Camera rotation
    euler.x = pitch;
    euler.y = yaw;
    camera.quaternion.setFromEuler(euler);

    // Camera movement
    if (moveTouch.id !== null) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();

        const right = new THREE.Vector3().crossVectors(camera.up, dir).normalize();
        camera.position.addScaledVector(dir,   (-moveTouch.deltaY / 50) * MOVE_SPEED);
        camera.position.addScaledVector(right,  (moveTouch.deltaX / 50) * MOVE_SPEED);
    }

    // Terrain lock
    const groundHeight = IslandModels.getGroundHeight(camera.position.x, camera.position.z);
    camera.position.y = groundHeight + 4;

    // Animate ocean (gentle UV scroll if material supports it)
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material?.name === 'ocean') {
            if (obj.material.map) {
                obj.material.map.offset.x += delta * 0.01;
                obj.material.map.offset.y += delta * 0.007;
            }
            // Subtle wave normal animation
            if (obj.material.normalMap) {
                obj.material.normalMap.offset.x = Math.sin(elapsed * 0.3) * 0.05;
                obj.material.normalMap.offset.y = elapsed * 0.02;
            }
        }
    });

    // Update sun screen pos for god rays
    updateSunScreenPos();

    // DoF focus: auto-focus on terrain under camera
    const focusDist = Math.abs(groundHeight - camera.position.y) + 20;
    dofPass.uniforms.uFocus.value = THREE.MathUtils.lerp(
        dofPass.uniforms.uFocus.value,
        focusDist / camera.far,
        delta * 2
    );

    // Render velocity and depth buffers first
    renderVelocityBuffer();
    renderDepthBuffer();

    // Full post-processing chain
    composer.render(delta);
}

animate();
