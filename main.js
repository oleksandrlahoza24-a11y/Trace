import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, waterMesh, controls;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();

// Physics Variables
const SIM_RES = 512; // Quality of ripples
let buffer1, buffer2, simMaterial, renderTarget1, renderTarget2;
let planeRes = 256; // Geometry detail

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 70, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    // --- RIPPLE SIMULATION SETUP ---
    // We use two buffers to store wave heights (Previous frame vs Current frame)
    renderTarget1 = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, { type: THREE.FloatType });
    renderTarget2 = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, { type: THREE.FloatType });

    simMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: null },
            uPrevTexture: { value: null },
            uMouse: { value: new THREE.Vector2(-1, -1) },
            uSize: { value: SIM_RES }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            uniform sampler2D uPrevTexture;
            uniform vec2 uMouse;
            uniform float uSize;
            varying vec2 vUv;

            void main() {
                float pixel = 1.0 / uSize;
                float current = texture2D(uTexture, vUv).r;
                
                // Neighborhood average (Wave Propagation Math)
                float neighbors = (
                    texture2D(uTexture, vUv + vec2(pixel, 0.0)).r +
                    texture2D(uTexture, vUv + vec2(-pixel, 0.0)).r +
                    texture2D(uTexture, vUv + vec2(0.0, pixel).r +
                    texture2D(uTexture, vUv + vec2(0.0, -pixel)).r
                ) * 0.5;

                float next = neighbors - texture2D(uPrevTexture, vUv).r;
                next *= 0.98; // Damping (Water friction)

                // Add mouse interaction
                float dist = distance(vUv, uMouse);
                if(dist < 0.01) {
                    next = 0.8;
                }

                gl_FragColor = vec4(next, next, next, 1.0);
            }
        `
    });

    const simPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    const simScene = new THREE.Scene();
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    simScene.add(simPlane);

    // --- WATER VISUALS ---
    const geometry = new THREE.PlaneGeometry(100, 100, planeRes, planeRes);
    const material = new THREE.MeshStandardMaterial({
        color: 0x0066ff,
        roughness: 0.05,
        metalness: 0.9,
        envMapIntensity: 1.5,
        flatShading: false
    });

    // Customizing the material to use our physics map for height
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uRippleMap = { value: renderTarget1.texture };
        shader.vertexShader = `
            uniform sampler2D uRippleMap;
            ${shader.vertexShader}
        `.replace(
            `#include <begin_vertex>`,
            `
            float ripple = texture2D(uRippleMap, uv).r;
            vec3 transformed = vec3(position.x, position.y, position.z + ripple * 8.0);
            `
        );
    };

    waterMesh = new THREE.Mesh(geometry, material);
    waterMesh.rotation.x = -Math.PI / 2;
    scene.add(waterMesh);

    // Environment & Lights
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(50, 100, 50);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404040, 1));

    // Interaction Listeners
    window.addEventListener('pointermove', onPointerMove);
    controls = new OrbitControls(camera, renderer.domElement);
    animate();

    function animate() {
        requestAnimationFrame(animate);

        // 1. Run Physics (Ping-Pong Buffers)
        simMaterial.uniforms.uTexture.value = renderTarget1.texture;
        simMaterial.uniforms.uPrevTexture.value = renderTarget2.texture;
        
        renderer.setRenderTarget(renderTarget2);
        renderer.render(simScene, simCamera);

        // Swap buffers
        let temp = renderTarget1;
        renderTarget1 = renderTarget2;
        renderTarget2 = temp;

        // 2. Render Main Scene
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        
        // Reset interaction point
        simMaterial.uniforms.uMouse.value.set(-1, -1);
    }
}

function onPointerMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(waterMesh);
    if (intersects.length > 0) {
        simMaterial.uniforms.uMouse.value.copy(intersects[0].uv);
    }
}
