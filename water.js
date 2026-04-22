class Water {
    constructor(gl, size) {
        this.gl = gl;
        this.size = size;
        this.ix = 0; // Interaction X
        this.iy = 0; // Interaction Y
        this.is = 0; // Interaction Strength

        const vs = `attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos*0.5+0.5; gl_Position = vec4(aPos, 0, 1); }`;
        const fs = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTex;
            uniform vec3 uMouse; // x, y, strength
            uniform vec2 uRes;
            void main() {
                vec2 tx = 1.0 / uRes;
                float h = texture2D(uTex, vUv).r;
                float p = texture2D(uTex, vUv).g;
                float n = texture2D(uTex, vUv+vec2(0,tx.y)).r + texture2D(uTex, vUv-vec2(0,tx.y)).r +
                          texture2D(uTex, vUv+vec2(tx.x,0)).r + texture2D(uTex, vUv-vec2(tx.x,0)).r;
                float next = (n * 0.5 - p + (h - 0.5) * 2.0) * 0.98;
                next = next * 0.5 + 0.5;
                float d = length(vUv - uMouse.xy);
                if(uMouse.z > 0.0) next -= smoothstep(0.03, 0.0, d) * uMouse.z;
                gl_FragColor = vec4(next, h, 0.0, 1.0);
            }`;

        this.prog = createProgram(gl, vs, fs);
        this.fbos = [this.createFBO(), this.createFBO()];
        this.curr = 0;
    }

    createFBO() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        return { tex, fbo };
    }

    step() {
        const gl = this.gl;
        const next = 1 - this.curr;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[next].fbo);
        gl.viewport(0, 0, this.size, this.size);
        gl.useProgram(this.prog);
        gl.bindTexture(gl.TEXTURE_2D, this.fbos[this.curr].tex);
        gl.uniform3f(gl.getUniformLocation(this.prog, "uMouse"), this.ix, this.iy, this.is);
        gl.uniform2f(gl.getUniformLocation(this.prog, "uRes"), this.size, this.size);
        renderQuad(gl, this.prog);
        this.curr = next;
    }
}
