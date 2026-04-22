import * as THREE from 'three';

export class CharacterController {
    constructor(scene, camera) {
        this.player = new THREE.Group();
        this.player.position.set(300, 20, 300);
        this.player.add(camera);
        scene.add(this.player);

        this.moveForward = 0;
        this.moveRight = 0;
        this.bobTimer = 0;
        this.initJoystick();
    }

    initJoystick() {
        const joy = nipplejs.create({
            zone: document.getElementById('joystick-zone'),
            mode: 'static',
            position: { left: '60px', bottom: '60px' },
            color: '#00ffcc'
        });

        joy.on('move', (e, data) => {
            if (!data.vector) return;
            this.moveForward = data.vector.y || 0;
            this.moveRight = data.vector.x || 0;
            if (data.angle && !isNaN(data.angle.rad)) {
                this.player.rotation.y = -data.angle.rad + Math.PI/2;
            }
        });

        joy.on('end', () => { this.moveForward = 0; this.moveRight = 0; });
    }

    update(heightMapFn, delta) {
    // 1. HARD GUARD: If delta is weird or movement isn't a number, kill the update
    if (isNaN(delta) || delta > 0.1) return;

    const speed = 5.0;
    const moveX = isNaN(this.moveRight) ? 0 : this.moveRight;
    const moveZ = isNaN(this.moveForward) ? 0 : this.moveForward;

    // 2. ONLY move if inputs are valid numbers
    if (Math.abs(moveZ) > 0.01 || Math.abs(moveX) > 0.01) {
        this.player.translateZ(-moveZ * speed);
        this.player.translateX(moveX * speed);
        this.bobTimer += delta * 10;
    }

    const x = this.player.position.x;
    const z = this.player.position.z;

    // 3. SHIELD: Ensure position hasn't become NaN before applying height
    if (!isNaN(x) && !isNaN(z) && isFinite(x) && isFinite(z)) {
        const terrainY = heightMapFn(x, z);
        const bob = Math.sin(this.bobTimer) * 0.5;
        const targetY = terrainY + 12 + bob;
        
        // Prevent Y from becoming NaN
        if (!isNaN(targetY)) {
            this.player.position.y += (targetY - this.player.position.y) * 0.1;
        }
    } else {
        // EMERGENCY RESET: If the player glitched to NaN, put them back at start
        this.player.position.set(300, 20, 300);
    }
}
