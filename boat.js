const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x87ceeb, 1);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 8, 0);

const SUN_DIR = new THREE.Vector3(0.6, 1.0, 0.4).normalize();

const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
        uSunDir: { value: SUN_DIR },
    },
    vertexShader: `
        varying vec3 vDir;
        void main(){
            vDir = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform vec3 uSunDir;
        varying vec3 vDir;
        void main(){
            vec3 d = normalize(vDir);
            float sunDot = dot(d, uSunDir);
            float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 zenith  = vec3(0.10, 0.28, 0.72);
            vec3 horizon = vec3(0.60, 0.78, 0.95);
            vec3 ground  = vec3(0.45, 0.55, 0.60);
            vec3 sky = mix(ground, mix(horizon, zenith, t), step(0.0, d.y));
            float sun = pow(max(sunDot, 0.0), 180.0);
            float glow = pow(max(sunDot, 0.0), 8.0) * 0.25;
            sky += vec3(1.0, 0.95, 0.7) * sun;
            sky += vec3(1.0, 0.85, 0.5) * glow;
            gl_FragColor = vec4(sky, 1.0);
        }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 20, 20), skyMat));
scene.fog = new THREE.FogExp2(0x9ecfdf, 0.0010);

const sunLight = new THREE.DirectionalLight(0xfff4d0, 2.4);
sunLight.position.copy(SUN_DIR.clone().multiplyScalar(250));
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 600;
sunLight.shadow.camera.left   = -180;
sunLight.shadow.camera.right  =  180;
sunLight.shadow.camera.top    =  180;
sunLight.shadow.camera.bottom = -180;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);

const hemi = new THREE.HemisphereLight(0x88ccff, 0x3a6e28, 1.1);
scene.add(hemi);

const fillLight = new THREE.DirectionalLight(0xaaccff, 0.5);
fillLight.position.set(-100, 80, -60);
scene.add(fillLight);

const ocean   = IslandModels.createOcean();
const ground  = IslandModels.createGround();
const rocks   = IslandModels.createRocks(180);
const ferns   = IslandModels.createFerns(350);
const flowers = IslandModels.createFlowers(600);
const grass   = IslandModels.createGrass(800);
const drift   = IslandModels.createDriftwood(30);
const cliffs  = IslandModels.createCliffs(40);
const forest  = IslandModels.createTrees(500);
scene.add(ground, ocean, rocks, ferns, flowers, grass, drift, cliffs);
scene.add(forest.trunks, forest.leavesA, forest.leavesB, forest.leavesC);

scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
});

const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
const rtA = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOpts);
const rtB = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOpts);
const velRT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOpts);

const qGeo = new THREE.PlaneGeometry(2, 2);
const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const qScene = new THREE.Scene();
const QVS = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

function makePass(fs, extraUniforms) {
    const mat = new THREE.ShaderMaterial({
        uniforms: Object.assign({ tDiffuse: { value: null } }, extraUniforms || {}),
        vertexShader: QVS,
        fragmentShader: fs,
    });
    return { mat, mesh: new THREE.Mesh(qGeo, mat) };
}

function blit(src, dst, pass) {
    pass.mat.uniforms.tDiffuse.value = src;
    qScene.children[0] = pass.mesh;
    renderer.setRenderTarget(dst);
    renderer.render(qScene, qCam);
    renderer.setRenderTarget(null);
}

const bloomPass = makePass(`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main(){
        vec2 px = vec2(1.0) / vec2(${window.innerWidth}.0, ${window.innerHeight}.0);
        vec4 base = texture2D(tDiffuse, vUv);
        float br = dot(base.rgb, vec3(0.299, 0.587, 0.114));
        if(br < 0.75){ gl_FragColor = base; return; }
        vec4 blur = vec4(0.0);
        float total = 0.0;
        float weights[5]; weights[0]=0.227; weights[1]=0.194; weights[2]=0.121; weights[3]=0.054; weights[4]=0.016;
        for(int i=0;i<5;i++){
            float w = weights[i];
            blur += texture2D(tDiffuse, vUv + vec2(px.x*float(i), 0.0)) * w;
            blur += texture2D(tDiffuse, vUv - vec2(px.x*float(i), 0.0)) * w;
            blur += texture2D(tDiffuse, vUv + vec2(0.0, px.y*float(i))) * w;
            blur += texture2D(tDiffuse, vUv - vec2(0.0, px.y*float(i))) * w;
            total += w * 4.0;
        }
        blur /= total;
        gl_FragColor = base + blur * smoothstep(0.75, 1.0, br) * 0.35;
    }`);

const velMat = new THREE.ShaderMaterial({
    uniforms: { uPrevVP: { value: new THREE.Matrix4() }, uCurrVP: { value: new THREE.Matrix4() } },
    vertexShader: `
        uniform mat4 uPrevVP, uCurrVP;
        varying vec4 vC, vP;
        void main(){
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vC = uCurrVP * wp;
            vP = uPrevVP * wp;
            gl_Position = vC;
        }`,
    fragmentShader: `
        varying vec4 vC, vP;
        void main(){
            vec2 c = vC.xy / vC.w * 0.5 + 0.5;
            vec2 p = vP.xy / vP.w * 0.5 + 0.5;
            gl_FragColor = vec4((c - p) * 0.5 + 0.5, 0.0, 1.0);
        }`,
});

const mblurPass = makePass(`
    uniform sampler2D tDiffuse;
    uniform sampler2D tVel;
    varying vec2 vUv;
    void main(){
        vec2 vel = (texture2D(tVel, vUv).rg * 2.0 - 1.0) * 0.5;
        if(length(vel) < 0.001){ gl_FragColor = texture2D(tDiffuse, vUv); return; }
        vec4 c = vec4(0.0);
        for(int i=0;i<10;i++){
            float t = float(i)/9.0 - 0.5;
            c += texture2D(tDiffuse, vUv + vel * t);
        }
        gl_FragColor = c / 10.0;
    }`, { tVel: { value: velRT.texture } });

const cinemaPass = makePass(`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float rnd(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
        vec2 d = (vUv - 0.5) * 0.0008;
        float r = texture2D(tDiffuse, vUv + d).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - d).b;
        vec3 col = vec3(r, g, b);
        col = (col - 0.5) * 1.05 + 0.5;
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(lum), col, 1.15);
        col += (rnd(vUv + fract(uTime * 0.05)) - 0.5) * 0.025;
        float v = length(vUv - 0.5) * 1.5;
        col *= 1.0 - smoothstep(0.5, 1.2, v) * 0.45;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`, { uTime: { value: 0.0 } });

let prevVP = new THREE.Matrix4();

function renderVelocity() {
    const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    velMat.uniforms.uCurrVP.value.copy(vp);
    velMat.uniforms.uPrevVP.value.copy(prevVP);
    scene.overrideMaterial = velMat;
    renderer.setRenderTarget(velRT);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.overrideMaterial = null;
    prevVP.copy(vp);
}

let moveTouch = { id: null, startX: 0, startY: 0, curX: 0, curY: 0 };
let lookTouch = { id: null, lastX: 0, lastY: 0 };
let yaw = 0, pitch = 0;
let vx = 0, vz = 0;
const keys = {};
const LOOK_S = 0.003;
const MAX_V  = 0.28;
const ACCEL  = 0.14;
const FRIC   = 0.80;
const DEAD   = 10;
const RANGE  = 70;

window.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth / 2 && moveTouch.id === null)
            moveTouch = { id: t.identifier, startX: t.clientX, startY: t.clientY, curX: t.clientX, curY: t.clientY };
        else if (t.clientX >= window.innerWidth / 2 && lookTouch.id === null)
            lookTouch = { id: t.identifier, lastX: t.clientX, lastY: t.clientY };
    }
}, { passive: false });

window.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier === moveTouch.id) { moveTouch.curX = t.clientX; moveTouch.curY = t.clientY; }
        else if (t.identifier === lookTouch.id) {
            yaw   -= (t.clientX - lookTouch.lastX) * LOOK_S;
            pitch -= (t.clientY - lookTouch.lastY) * LOOK_S;
            pitch  = Math.max(-1.2, Math.min(1.2, pitch));
            lookTouch.lastX = t.clientX; lookTouch.lastY = t.clientY;
        }
    }
}, { passive: false });

const endT = e => {
    for (const t of e.changedTouches) {
        if (t.identifier === moveTouch.id) moveTouch = { id: null, startX: 0, startY: 0, curX: 0, curY: 0 };
        if (t.identifier === lookTouch.id) lookTouch.id = null;
    }
};
window.addEventListener('touchend',    endT, { passive: false });
window.addEventListener('touchcancel', endT, { passive: false });
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    rtA.setSize(w, h); rtB.setSize(w, h); velRT.setSize(w, h);
});

const clock = new THREE.Clock();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const fwd   = new THREE.Vector3();
const right = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t  = clock.getElapsedTime();

    euler.x = pitch; euler.y = yaw;
    camera.quaternion.setFromEuler(euler);

    let ix = 0, iz = 0;
    if (moveTouch.id !== null) {
        const dx = moveTouch.curX - moveTouch.startX;
        const dy = moveTouch.curY - moveTouch.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > DEAD) {
            const n = Math.min(dist, RANGE) / RANGE;
            ix = (dx / dist) * n;
            iz = (dy / dist) * n;
        }
    }
    if (keys['KeyW'] || keys['ArrowUp'])    iz -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  iz += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  ix -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1;

    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();

    vx = vx * FRIC + ix * ACCEL * MAX_V;
    vz = vz * FRIC + iz * ACCEL * MAX_V;
    const spd = Math.sqrt(vx * vx + vz * vz);
    if (spd > MAX_V) { vx = (vx / spd) * MAX_V; vz = (vz / spd) * MAX_V; }

    camera.position.addScaledVector(right,  vx);
    camera.position.addScaledVector(fwd,   -vz);

    const gh = IslandModels.getGroundHeight(camera.position.x, camera.position.z);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, gh + 1.72, 0.18);

    IslandModels.tickOcean(ocean, t);
    cinemaPass.mat.uniforms.uTime.value = t;

    renderVelocity();

    renderer.setRenderTarget(rtA);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    blit(rtA.texture, rtB, bloomPass);
    blit(rtB.texture, rtA, mblurPass);
    blit(rtA.texture, null, cinemaPass);
}

animate();
