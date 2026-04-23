import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, waterMesh;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2(-1, -1);

// Physics Resolution (Higher = more detailed ripples, but heavier)
const RES = 256; 
let rtCurrent, rtPrev, rtTemp;
let simScene, simCamera, simMaterial;

init();
animate();

function init() {
    // 1. Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020508);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 80, 120);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    // 2. Physics Buffers (Ping-Pong)
    const options = {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
    };
    rtCurrent = new THREE.WebGLRenderTarget(RES, RES, options);
    rtPrev = new THREE.WebGLRenderTarget(RES, RES, options);
    rtTemp = new THREE.WebGLRenderTarget(RES, RES, options);

    // 3. Simulation Shader (The Physics)
    simScene = new THREE.Scene();
    simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    simMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tCurr: { value: null },
            tPrev: { value: null },
            uMouse: { value: new THREE.Vector2(-1, -1) },
            uStrength: { value: 0.15 },
            uInvRes: { value: new THREE.Vector2(1/RES, 1/RES) }
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
            uniform sampler2D tCurr;
            uniform sampler2D tPrev;
            uniform vec2 uMouse;
            uniform vec2 uInvRes;
            varying vec2 vUv;
            void main() {
                float c = texture2D(tCurr, vUv).r;
                float p = texture2D(tPrev, vUv).r;
                
                // Neighbors for wave propagation
                float n = texture2D(tCurr, vUv + vec2(0.0, uInvRes.y)).r;
                float s = texture2D(tCurr, vUv - vec2(0.0, uInvRes.y)).r;
                float e = texture2D(tCurr, vUv + vec2(uInvRes.x, 0.0)).r;
                float w = texture2D(tCurr, vUv - vec2(uInvRes.x, 0.0)).r;

                // Wave equation
                float next = (n + s + e + w) * 0.5 - p;
                next *= 0.99; // Damping factor (water thickness)

                // Mouse/Touch Interaction
                float d = distance(vUv, uMouse);
                if (d < 0.02) next += 0.4;

                gl_FragColor = vec4(next, next, next, 1.0);
            }
        `
    });
    simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial));

    // 4. The Visual Water Surface
    const waterGeo = new THREE.PlaneGeometry(150, 150, 256, 256);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x003344,
        metalness: 0.9,
        roughness: 0.05,
        envMapIntensity: 1.0
    });

    // Custom Shader Injection for Displacement AND Normals
    waterMat.onBeforeCompile = (shader) => {
        shader.uniforms.uSimMap = { value: rtCurrent.texture };
        shader.uniforms.uInvRes = { value: new THREE.Vector2(1/RES, 1/RES) };
        
        shader.vertexShader = `
            uniform sampler2D uSimMap;
            uniform vec2 uInvRes;
            varying float vHeight;
            varying vec3 vNormalUpdate;
            ${shader.vertexShader}
        `.replace(
            `#include <begin_vertex>`,
            `
            float h = texture2D(uSimMap, uv).r;
            vHeight = h;
            
            // Calculate normals from the heightmap for realistic lighting
            float hN = texture2D(uSimMap, uv + vec2(0.0, uInvRes.y)).r;
            float hS = texture2D(uSimMap, uv - vec2(0.0, uInvRes.y)).r;
            float hE = texture2D(uSimMap, uv + vec2(uInvRes.x, 0.0)).r;
            float hW = texture2D(uSimMap, uv - vec2(uInvRes.x, 0.0)).r;
            
            vec3 normalCalc = normalize(vec3(hW - hE, hS - hN, 0.2));
            vNormalUpdate = normalCalc;

            vec3 transformed = vec3(position.x, position.y, position.z + h * 12.0);
            `
        ).replace(
            `#include <beginnormal_vertex>`,
            `#include <beginnormal_vertex>\n objectNormal = vNormalUpdate;`
        );
    };

    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    scene.add(waterMesh);

    // 5. Environment & Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(50, 100, 50);
    scene.add(sun);

    // Create a simple environment map for reflections
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#001122'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 10);
    const envTex = new THREE.CanvasTexture(canvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = envTex;

    // 6. Interaction
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    window.addEventListener('pointermove', updateMouse);
    window.addEventListener('resize', onResize);
}

function updateMouse(e) {
    const coords = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(coords, camera);
    const hit = raycaster.intersectObject(waterMesh);
    if (hit.length > 0) {
        mouse.copy(hit[0].uv);
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Step 1: Physics (Ping-Pong)
    simMaterial.uniforms.tCurr.value = rtCurrent.texture;
    simMaterial.uniforms.tPrev.value = rtPrev.texture;
    simMaterial.uniforms.uMouse.value.copy(mouse);

    renderer.setRenderTarget(rtTemp);
    renderer.render(simScene, simCamera);

    // Swap buffers
    rtPrev = rtCurrent;
    rtCurrent = rtTemp;
    rtTemp = rtPrev;

    // Reset mouse to stop "drawing" when not moving
    mouse.set(-1, -1);

    // Step 2: Render Visuals
    controls.update();
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}
