class WaterSystem {
    constructor(gl, size = 512) {
        this.gl = gl;
        this.size = size;
        this.setupShaders();
        this.setupBuffers();
    }

    setupShaders() {
        const vert = `attribute vec2 p; varying vec2 v; void main(){ v=p*0.5+0.5; gl_Position=vec4(p,0,1); }`;
        const frag = `
            precision highp float;
            varying vec2 v;
            uniform sampler2D tex;
            uniform vec2 res;
            uniform vec3 move; // x, y, strength
            void main() {
                vec2 uv = v;
                vec2 dx = vec2(1.0/res.x, 0.0);
                vec2 dy = vec2(0.0, 1.0/res.y);
                float h = texture2D(tex, uv).r;
                float p = texture2D(tex, uv).g;
                float n = texture2D(tex, uv+dy).r + texture2D(tex, uv-dy).r + 
                          texture2D(tex, uv+dx).r + texture2D(tex, uv-dx).r;
                float next = (n * 0.5 - p + (h - 0.5) * 2.0) * 0.98; 
                next = next * 0.5 + 0.5;
                float d = length(uv - move.xy);
                if(move.z > 0.0) next -= smoothstep(0.02, 0.0, d) * move.z;
                gl_FragColor = vec4(next, h, 0.0, 1.0);
            }`;
        this.prog = createProgram(this.gl, vert, frag);
    }

    setupBuffers() {
        const gl = this.gl;
        const createFBO = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            return { tex, fbo };
        };
        this.fbos = [createFBO(), createFBO()];
        this.current = 0;
    }

    update(interactionX, interactionZ, strength) {
        const gl = this.gl;
        const next = 1 - this.current;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[next].fbo);
        gl.viewport(0, 0, this.size, this.size);
        gl.useProgram(this.prog);
        gl.bindTexture(gl.TEXTURE_2D, this.fbos[this.current].tex);
        gl.uniform2f(gl.getUniformLocation(this.prog, "res"), this.size, this.size);
        gl.uniform3f(gl.getUniformLocation(this.prog, "move"), interactionX, interactionZ, strength);
        drawQuad(gl, this.prog);
        this.current = next;
    }
}
