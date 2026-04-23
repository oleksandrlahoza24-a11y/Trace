import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

// --- CONFIGURATION ---
const SIM_RES = 512; // Resolution of physics grid
const GEOM_RES = 512; // Resolution of water surface detail

let scene, camera, renderer, waterMesh, controls, sun;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2(-1, -1);

// Physics Buffers
let renderTarget1, renderTarget2, simMaterial, simScene, simCamera;

init();
animate();

function init() {
    // 1. Core Engine
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(120, 100, 120);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    document.body.appendChild(renderer.domElement);

    // 2. Physics Simulation Setup (The "Brain")
    renderTarget1 = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, { type: THREE.HalfFloatType, format: THREE.RGBAFormat });
    renderTarget2 = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, { type: THREE.HalfFloatType, format: THREE.RGBAFormat });

    simScene = new THREE.Scene();
    simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    simMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tPrev: { value: null },
            tCurr: { value: null },
            uMouse: { value: new THREE.Vector2(-1, -1) },
            uDelta: { value: 1.0 / SIM_RES }
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
            uniform sampler2D tPrev;
            uniform sampler2D tCurr;
            uniform vec2 uMouse;
            uniform float uDelta;
            varying vec2 vUv;
            void main() {
                vec4 curr = texture2D(tCurr, vUv);
                vec4 prev = texture2D(tPrev, vUv);
                // Wave Equation logic
                float neighbors = (
                    texture2D(tCurr, vUv + vec2(uDelta, 0.0)).r +
                    texture2D(tCurr, vUv + vec2(-uDelta, 0.0)).r +
                    texture2D(tCurr, vUv + vec2(0.0, uDelta)).r +
                    texture2D(tCurr, vUv + vec2(0.0, -uDelta)).r
                ) * 0.5;
                float next = (neighbors - prev.r) * 0.985; // Damping
                // Interaction
                float dist = distance(vUv, uMouse);
                if(dist < 0.015) next += 0.5;
                gl_FragColor = vec4(next, next, next, 1.0);
            }
        `
    });

    const simPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    simScene.add(simPlane);

    // 3. Visual Water Surface (The "Beauty")
    const waterGeo = new THREE.PlaneGeometry(200, 200, GEOM_RES, GEOM_RES);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x00151a,
        roughness: 0.02,
        metalness: 0.9,
        flatShading: false,
        envMapIntensity: 1.2
    });

    // Inject physics into the visual shader
    waterMat.onBeforeCompile = (shader) => {
        shader.uniforms.uSimMap = { value: renderTarget1.texture };
        shader.vertexShader = `
            uniform sampler2D uSimMap;
            varying float vHeight;
            ${shader.vertexShader}
        `.replace(
            `#include <begin_vertex>`,
            `
            float h = texture2D(uSimMap, uv).r;
            vHeight = h;
            vec3 transformed = vec3(position.x, position.y, position.z + h * 15.0);
            `
        );
    };

    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    scene.add(waterMesh);

    // 4. Environment (Sky & Lights)
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    
    sun = new THREE.Vector3();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const phi = THREE.MathUtils.degToRad(88);
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    scene.environment = pmremGenerator.fromScene(sky).texture;

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.copy(sun).multiplyScalar(100);
    scene.add(mainLight);

    // 5. Interaction & Camera
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.45;

    window.addEventListener('pointermove', onPointer);
    window.addEventListener('resize', onResize);
}

function onPointer(e) {
    let x = (e.clientX / window.innerWidth) * 2 - 1;
    let y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera({x, y}, camera);
    const intersects = raycaster.intersectObject(waterMesh);
    if (intersects.length > 0) {
        mouse.copy(intersects[0].uv);
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Run Physics Step
    simMaterial.uniforms.tPrev.value = renderTarget1.texture;
    simMaterial.uniforms.tCurr.value = renderTarget2.texture;
    simMaterial.uniforms.uMouse.value.copy(mouse);
    
    renderer.setRenderTarget(renderTarget1);
    renderer.render(simScene, simCamera);

    // Swap Buffers
    let temp = renderTarget1;
    renderTarget1 = renderTarget2;
    renderTarget2 = temp;

    // Reset mouse so we don't draw a constant line if finger lifts
    mouse.set(-1, -1);

    controls.update();
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}
