class Player {
    constructor() {
        this.pos = { x: 0, y: 0.5, z: 0 };
        this.rot = { yaw: 0, pitch: -0.2 };
        this.vel = { x: 0, z: 0 };
        this.joy = { active: false, x: 0, y: 0, startX: 0, startY: 0 };
        this.setupInputs();
    }

    setupInputs() {
        window.addEventListener('touchstart', e => {
            const t = e.touches[0];
            if (t.clientX < window.innerWidth/2) {
                this.joy.active = true;
                this.joy.startX = t.clientX; this.joy.startY = t.clientY;
            }
        });
        window.addEventListener('touchmove', e => {
            const t = Array.from(e.touches).find(v => v.clientX < window.innerWidth/2);
            if (this.joy.active && t) {
                this.joy.x = (t.clientX - this.joy.startX) * 0.01;
                this.joy.y = (t.clientY - this.joy.startY) * 0.01;
            }
            const look = Array.from(e.touches).find(v => v.clientX > window.innerWidth/2);
            if (look) this.rot.yaw -= look.force || 0.02; // Simple turn
        });
        window.addEventListener('touchend', () => { this.joy.active = false; this.joy.x = 0; this.joy.y = 0; });
    }

    step() {
        if (this.joy.active) {
            this.vel.x += (Math.sin(this.rot.yaw) * -this.joy.y + Math.cos(this.rot.yaw) * this.joy.x) * 0.01;
            this.vel.z += (Math.cos(this.rot.yaw) * -this.joy.y - Math.sin(this.rot.yaw) * this.joy.x) * 0.01;
        }
        this.pos.x += this.vel.x;
        this.pos.z += this.vel.z;
        this.vel.x *= 0.9; this.vel.z *= 0.9;
    }
}
