const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

// Utility functions globally accessible
function createProgram(gl, vsSrc, fsSrc) {
    const p = gl.createProgram();
    const v = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(v, vsSrc); gl.compileShader(v);
    const f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(f, fsSrc); gl.compileShader(f);
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    return p;
}

function renderQuad(gl, prog) {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

const water = new Water(gl, 512);
const player = new Character();

const renderFS = `
    precision highp float;
    uniform sampler2D uWater;
    uniform vec3 uCam;
    uniform float uYaw;
    uniform vec2 uRes;
    void main() {
        vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * vec2(uRes.x/uRes.y, 1.0);
        vec3 ray = normalize(vec3(uv, 1.0));
        mat3 rot = mat3(cos(uYaw),0,sin(uYaw), 0,1,0, -sin(uYaw),0,cos(uYaw));
        ray = rot * ray;
        
        float t = -0.5 / ray.y; // Floor hit
        vec3 col = mix(vec3(0.1, 0.4, 0.8), vec3(0.7, 0.9, 1.0), ray.y * 0.5 + 0.5); // Sky
        
        if(t > 0.0) {
            vec3 world = uCam + ray * t;
            float h = texture2D(uWater, fract(world.xz * 0.2)).r;
            col = mix(vec3(0, 0.1, 0.25), vec3(0.4, 0.8, 1.0), h);
            col *= exp(-t * 0.1); // Distance fog
        }
        gl_FragColor = vec4(col, 1.0);
    }`;

const renderProg = createProgram(gl, `attribute vec2 aPos; void main(){ gl_Position=vec4(aPos,0,1); }`, renderFS);

function loop() {
    player.update();
    water.ix = fract(player.x * 0.2);
    water.iy = fract(player.z * 0.2);
    water.is = Math.hypot(player.vx, player.vz) * 5.0;
    
    water.step(); // Update physics

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderProg);
    gl.uniform3f(gl.getUniformLocation(renderProg, "uCam"), player.x, 0.5, player.z);
    gl.uniform1f(gl.getUniformLocation(renderProg, "uYaw"), player.yaw);
    gl.uniform2f(gl.getUniformLocation(renderProg, "uRes"), canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, water.fbos[water.curr].tex);
    renderQuad(gl, renderProg);
    
    requestAnimationFrame(loop);
}

const fract = (v) => v - Math.floor(v);
loop();
