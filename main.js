// --- Helper Functions ---
function createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    const s1 = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(s1, vs); gl.compileShader(s1);
    const s2 = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(s2, fs); gl.compileShader(s2);
    gl.attachShader(p, s1); gl.attachShader(p, s2); gl.linkProgram(p);
    return p;
}
function drawQuad(gl, p) {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(p, "p"); gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// --- Main Engine ---
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const gl = canvas.getContext('webgl');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

const water = new WaterSystem(gl);
const player = new Player();

const renderFrag = `
    precision highp float;
    varying vec2 v;
    uniform sampler2D tex;
    uniform vec3 camPos;
    uniform vec2 camRot;
    uniform vec2 res;
    void main() {
        vec2 uv = (gl_FragCoord.xy / res - 0.5) * vec2(res.x/res.y, 1.0);
        vec3 ray = normalize(vec3(uv, 1.0));
        // Rotate ray
        float y = camRot.x, p = camRot.y;
        mat3 r = mat3(cos(y),0,sin(y), 0,1,0, -sin(y),0,cos(y)) * mat3(1,0,0, 0,cos(p),-sin(p), 0,sin(p),cos(p));
        ray = r * ray;
        
        float t = -camPos.y / ray.y;
        vec3 col;
        if(t > 0.0) {
            vec3 world = camPos + ray * t;
            float h = texture2D(tex, fract(world.xz * 0.2)).r;
            col = mix(vec3(0, 0.1, 0.2), vec3(0.5, 0.8, 1), h);
            col *= exp(-t * 0.1); // Fog
        } else {
            col = mix(vec3(0.1, 0.3, 0.6), vec3(0.7, 0.9, 1.0), ray.y);
        }
        gl_FragColor = vec4(col, 1.0);
    }`;

const renderProg = createProgram(gl, `attribute vec2 p; void main(){ gl_Position=vec4(p,0,1); }`, renderFrag);

function loop() {
    player.step();
    // Update water using player position
    water.update(fract(player.pos.x * 0.2), fract(player.pos.z * 0.2), Math.hypot(player.vel.x, player.vel.z));
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderProg);
    gl.uniform3f(gl.getUniformLocation(renderProg, "camPos"), player.pos.x, player.pos.y, player.pos.z);
    gl.uniform2f(gl.getUniformLocation(renderProg, "camRot"), player.rot.yaw, player.rot.pitch);
    gl.uniform2f(gl.getUniformLocation(renderProg, "res"), canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, water.fbos[water.current].tex);
    drawQuad(gl, renderProg);
    requestAnimationFrame(loop);
}
loop();
