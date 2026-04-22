import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create the massive Island Geometry
const geometry = new THREE.PlaneGeometry(100, 100, 128, 128);
geometry.rotateX(-Math.PI / 2); // Lay it flat

// Connect the GLSL Shaders
const material = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0.0 }
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
    wireframe: false
});

const island = new THREE.Mesh(geometry, material);
scene.add(island);

camera.position.set(0, 5, 10);

function animate(time) {
    material.uniforms.uTime.value = time * 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
