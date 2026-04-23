// graphics.js
// Handles the renderer, camera, lighting, input controls, and game loop

// --- 1. Core Engine Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.003);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- 2. Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -150;
dirLight.shadow.camera.right = 150;
dirLight.shadow.camera.top = 150;
dirLight.shadow.camera.bottom = -150;
scene.add(dirLight);

// --- 3. Build the World (using models.js) ---
scene.add(IslandModels.createGround());
scene.add(IslandModels.createOcean());

const forest = IslandModels.createTrees(600);
scene.add(forest.trunks);
scene.add(forest.leaves);

// --- 4. iPad Dual-Zone Touch Controller ---
let moveTouch = { id: null, startX: 0, startY: 0, deltaX: 0, deltaY: 0 };
let lookTouch = { id: null, lastX: 0, lastY: 0 };

let pitch = 0; 
let yaw = 0;   
const moveSpeed = 0.2;
const lookSpeed = 0.005;

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Touch Start
window.addEventListener('touchstart', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX < window.innerWidth / 2) { // Left Half
            if (moveTouch.id === null) {
                moveTouch.id = touch.identifier;
                moveTouch.startX = touch.clientX;
                moveTouch.startY = touch.clientY;
            }
        } else { // Right Half
            if (lookTouch.id === null) {
                lookTouch.id = touch.identifier;
                lookTouch.lastX = touch.clientX;
                lookTouch.lastY = touch.clientY;
            }
        }
    }
});

// Touch Move
window.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        if (touch.identifier === moveTouch.id) {
            moveTouch.deltaX = touch.clientX - moveTouch.startX;
            moveTouch.deltaY = touch.clientY - moveTouch.startY;
        } else if (touch.identifier === lookTouch.id) {
            const dx = touch.clientX - lookTouch.lastX;
            const dy = touch.clientY - lookTouch.lastY;
            
            yaw -= dx * lookSpeed;
            pitch -= dy * lookSpeed;
            pitch = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, pitch)); // Prevent looking upside down
            
            lookTouch.lastX = touch.clientX;
            lookTouch.lastY = touch.clientY;
        }
    }
});

// Touch End
const handleTouchEnd = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === moveTouch.id) {
            moveTouch.id = null;
            moveTouch.deltaX = 0;
            moveTouch.deltaY = 0;
        } else if (touch.identifier === lookTouch.id) {
            lookTouch.id = null;
        }
    }
};
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);

// --- 5. Game Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Update Camera Rotation
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = pitch;
    euler.y = yaw;
    camera.quaternion.setFromEuler(euler);

    // Update Camera Position (Movement)
    if (moveTouch.id !== null) {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.y = 0; 
        direction.normalize();

        const moveZ = -moveTouch.deltaY / 50; 
        camera.position.addScaledVector(direction, moveZ * moveSpeed);

        const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
        const moveX = moveTouch.deltaX / 50;
        camera.position.addScaledVector(right, moveX * moveSpeed);
    }

    // Zero-Bug Collision: Bind player height exactly to terrain height using models.js math
    const groundHeight = IslandModels.getGroundHeight(camera.position.x, camera.position.z);
    camera.position.y = groundHeight + 4; // 4 units high

    renderer.render(scene, camera);
}

// Start Engine
animate();
