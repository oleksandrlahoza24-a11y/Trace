import * as THREE from 'three';

export class CharacterController {
    constructor(scene, camera) {
        this.player = new THREE.Group();
        this.player.position.set(150, 20, 150);
        this.player.add(camera);
        scene.add(this.player);

        this.moveForward = 0;
        this.moveRight = 0;
        this.initJoystick();
    }

    initJoystick() {
        const options = {
            zone: document.getElementById('joystick-zone'),
            mode: 'static',
            position: { left: '75px', bottom: '75px' },
            color: 'cyan'
        };

        const manager = nipplejs.create(options);

        manager.on('move', (evt, data) => {
            if (!data.vector) return;
            this.moveForward = data.vector.y;
            this.moveRight = data.vector.x;
            
            if (data.angle) {
                this.player.rotation.y = -data.angle.rad + Math.PI/2;
            }
        });

        manager.on('end', () => {
            this.moveForward = 0;
            this.moveRight = 0;
        });
    }

    update(heightMapFn) {
        // Move character based on inputs
        const speed = 4.0;
        this.player.translateZ(-this.moveForward * speed);
        this.player.translateX(this.moveRight * speed);

        // Snap to terrain height
        const terrainY = heightMapFn(this.player.position.x, this.player.position.z);
        
        // Simple smoothing for the camera height
        const targetY = terrainY + 15;
        this.player.position.y += (targetY - this.player.position.y) * 0.1;
    }
}
