class Character {
    constructor() {
        this.x = 0; this.z = 0;
        this.yaw = 0;
        this.vx = 0; this.vz = 0;
        this.joy = { active: false, sx: 0, sy: 0, x: 0, y: 0 };
        
        window.addEventListener('touchstart', e => {
            const t = e.touches[0];
            if(t.clientX < window.innerWidth/2) {
                this.joy.active = true;
                this.joy.sx = t.clientX; this.joy.sy = t.clientY;
            }
        });
        window.addEventListener('touchmove', e => {
            const t = Array.from(e.touches).find(v => v.clientX < window.innerWidth/2);
            if(this.joy.active && t) {
                this.joy.x = (t.clientX - this.joy.sx) * 0.01;
                this.joy.y = (t.clientY - this.joy.sy) * 0.01;
            }
            const look = Array.from(e.touches).find(v => v.clientX > window.innerWidth/2);
            if(look) this.yaw -= 0.05; // Quick turn for testing
        });
        window.addEventListener('touchend', () => { this.joy.active = false; this.joy.x = 0; this.joy.y = 0; });
    }

    update() {
        if(this.joy.active) {
            this.vx += (Math.sin(this.yaw) * -this.joy.y + Math.cos(this.yaw) * this.joy.x) * 0.005;
            this.vz += (Math.cos(this.yaw) * -this.joy.y - Math.sin(this.yaw) * this.joy.x) * 0.005;
        }
        this.x += this.vx; this.z += this.vz;
        this.vx *= 0.9; this.vz *= 0.9;
    }
}
