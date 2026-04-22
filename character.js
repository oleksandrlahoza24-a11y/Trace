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
        const speed = 5.0;
        
        // Move character
        if (Math.abs(this.moveForward) > 0.1 || Math.abs(this.moveRight) > 0.1) {
            this.player.translateZ(-this.moveForward * speed);
            this.player.translateX(this.moveRight * speed);
            
            // Walking Bob Effect
            this.bobTimer += delta * 10;
        }

        const x = this.player.position.x;
        const z = this.player.position.z;

        if (!isNaN(x) && !isNaN(z)) {
            const terrainY = heightMapFn(x, z);
            const bob = Math.sin(this.bobTimer) * 0.5; // Subtle camera bounce
            const targetY = terrainY + 12 + bob;
            
            // Smoother vertical movement (lerping)
            this.player.position.y += (targetY - this.player.position.y) * 0.1;
        }
    }
}
