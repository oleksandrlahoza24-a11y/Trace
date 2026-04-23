const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 6, 0);

const SUN_DIR = new THREE.Vector3(0.45, 0.82, 0.28).normalize();

const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
        uSunDir:       { value: SUN_DIR },
        uSunIntensity: { value: 18.0 },
        uRayleigh:     { value: 2.0 },
        uMie:          { value: 0.005 },
        uMieG:         { value: 0.82 },
    },
    vertexShader: `
        varying vec3 vDir;
        void main(){
            vDir=(modelMatrix*vec4(position,1.0)).xyz;
            gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0);
        }`,
    fragmentShader: `
        uniform vec3 uSunDir;
        uniform float uSunIntensity,uRayleigh,uMie,uMieG;
        varying vec3 vDir;
        const float PI=3.14159265;
        const vec3 rB=vec3(5.8e-6,1.35e-5,3.31e-5);
        float ray(float c){return(3.0/(16.0*PI))*(1.0+c*c);}
        float mie(float c){float g2=uMieG*uMieG;return(1.0/(4.0*PI))*((1.0-g2)/pow(1.0-2.0*uMieG*c+g2,1.5));}
        void main(){
            vec3 d=normalize(vDir);
            float ca=dot(d,uSunDir);
            float sc=exp(-max(d.y,0.0)*6.0);
            vec3 sky=uSunIntensity*(uRayleigh*rB*ray(ca)+uMie*vec3(2.1e-3)*mie(ca))*sc;
            sky+=pow(max(0.0,ca),200.0)*vec3(12.0,10.0,7.0);
            sky=max(sky,vec3(0.08,0.12,0.22)*max(0.0,-d.y+0.3));
            gl_FragColor=vec4(sky,1.0);
        }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 24), skyMat));
scene.fog = new THREE.FogExp2(0x9ecfdf, 0.0009);

const sunLight = new THREE.DirectionalLight(0xfff4d6, 3.2);
sunLight.position.copy(SUN_DIR.clone().multiplyScalar(300));
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 700;
sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -200;
sunLight.shadow.camera.right = sunLight.shadow.camera.top   =  200;
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.04;
scene.add(sunLight);
scene.add(new THREE.HemisphereLight(0x88ccee, 0x3a5e28, 0.9));
const fill = new THREE.DirectionalLight(0xb0d8ff, 0.4);
fill.position.set(-120, 60, -80);
scene.add(fill);

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
    if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = 1.0;
});

const quadVS = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

const bloomMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.26 }, uThresh: { value: 0.82 } },
    vertexShader: quadVS,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uStrength,uThresh;
        varying vec2 vUv;
        void main(){
            vec4 base=texture2D(tDiffuse,vUv);
            float br=dot(base.rgb,vec3(0.2126,0.7152,0.0722));
            vec2 p=vec2(1.0/1280.0,1.0/720.0);
            vec3 b=vec3(0.0);
            float w[5];w[0]=0.227;w[1]=0.194;w[2]=0.121;w[3]=0.054;w[4]=0.016;
            b+=texture2D(tDiffuse,vUv).rgb*w[0];
            for(int i=1;i<5;i++){
                b+=texture2D(tDiffuse,vUv+vec2(p.x*float(i),0.0)).rgb*w[i];
                b+=texture2D(tDiffuse,vUv-vec2(p.x*float(i),0.0)).rgb*w[i];
                b+=texture2D(tDiffuse,vUv+vec2(0.0,p.y*float(i))).rgb*w[i];
                b+=texture2D(tDiffuse,vUv-vec2(0.0,p.y*float(i))).rgb*w[i];
            }
            float mask=smoothstep(uThresh,uThresh+0.12,br);
            gl_FragColor=vec4(base.rgb+b*mask*uStrength,base.a);
        }`,
});

const godMat = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        uSunPos:  { value: new THREE.Vector2(0.62, 0.78) },
        uDecay:   { value: 0.965 },
        uWeight:  { value: 0.36 },
        uExp:     { value: 0.26 },
        uDensity: { value: 0.97 },
    },
    vertexShader: quadVS,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uSunPos;
        uniform float uDecay,uWeight,uExp,uDensity;
        varying vec2 vUv;
        void main(){
            vec2 uv=vUv;
            vec2 dv=(uv-uSunPos)*(1.0/64.0)*uDensity;
            float ill=1.0; vec4 acc=vec4(0.0);
            for(int i=0;i<64;i++){
                uv-=dv;
                vec4 s=texture2D(tDiffuse,uv);
                s.rgb=max(s.rgb-0.55,0.0);
                acc+=s*ill*uWeight;
                ill*=uDecay;
            }
            gl_FragColor=texture2D(tDiffuse,vUv)+acc*uExp;
        }`,
});

const velMat = new THREE.ShaderMaterial({
    uniforms: { uPrevVP: { value: new THREE.Matrix4() }, uCurrVP: { value: new THREE.Matrix4() } },
    vertexShader: `
        uniform mat4 uPrevVP,uCurrVP;
        varying vec4 vC,vP;
        void main(){
            vC=uCurrVP*modelMatrix*vec4(position,1.0);
            vP=uPrevVP*modelMatrix*vec4(position,1.0);
            gl_Position=vC;
        }`,
    fragmentShader: `
        varying vec4 vC,vP;
        void main(){
            vec2 c=vC.xy/vC.w*0.5+0.5;
            vec2 p=vP.xy/vP.w*0.5+0.5;
            gl_FragColor=vec4((c-p)*0.5+0.5,0.0,1.0);
        }`,
});

const velRT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
});

const mblurMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, tVelocity: { value: velRT.texture }, uScale: { value: 0.55 } },
    vertexShader: quadVS,
    fragmentShader: `
        uniform sampler2D tDiffuse,tVelocity;
        uniform float uScale;
        varying vec2 vUv;
        void main(){
            vec2 vel=(texture2D(tVelocity,vUv).rg*2.0-1.0)*uScale;
            if(length(vel)<0.0003){gl_FragColor=texture2D(tDiffuse,vUv);return;}
            vec4 col=vec4(0.0);
            for(int i=0;i<12;i++){
                float t=float(i)/11.0-0.5;
                col+=texture2D(tDiffuse,vUv+vel*t);
            }
            gl_FragColor=col/12.0;
        }`,
});

const cinemaMat = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse:    { value: null },
        uTime:       { value: 0.0 },
        uGrain:      { value: 0.030 },
        uVignette:   { value: 0.42 },
        uAberration: { value: 0.0009 },
        uSaturation: { value: 1.15 },
        uContrast:   { value: 1.04 },
    },
    vertexShader: quadVS,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime,uGrain,uVignette,uAberration,uSaturation,uContrast;
        varying vec2 vUv;
        float rand(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);}
        void main(){
            vec2 d=(vUv-0.5)*uAberration;
            float r=texture2D(tDiffuse,vUv+d).r;
            float g=texture2D(tDiffuse,vUv).g;
            float b=texture2D(tDiffuse,vUv-d).b;
            vec3 col=vec3(r,g,b);
            col=(col-0.5)*uContrast+0.5;
            float lum=dot(col,vec3(0.2126,0.7152,0.0722));
            col=mix(vec3(lum),col,uSaturation);
            col+=(rand(vUv+fract(uTime*0.07))-0.5)*uGrain;
            float vd=length(vUv-0.5)*1.6;
            col*=1.0-smoothstep(0.45,1.25,vd)*uVignette;
            gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
        }`,
});

const gammaMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: quadVS,
    fragmentShader: `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){vec4 c=texture2D(tDiffuse,vUv);gl_FragColor=vec4(pow(clamp(c.rgb,0.0,1.0),vec3(1.0/2.2)),c.a);}`,
});

const quadGeo  = new THREE.PlaneGeometry(2, 2);
const quadCam  = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadScene= new THREE.Scene();

function makeQuadMesh(mat) {
    const m = new THREE.Mesh(quadGeo, mat);
    return m;
}
const qBloom   = makeQuadMesh(bloomMat);
const qGod     = makeQuadMesh(godMat);
const qMblur   = makeQuadMesh(mblurMat);
const qCinema  = makeQuadMesh(cinemaMat);
const qGamma   = makeQuadMesh(gammaMat);

const rtA = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.HalfFloatType,
});
const rtB = rtA.clone();

function blit(srcTex, dstRT, quadMesh) {
    quadScene.children.length = 0;
    quadScene.add(quadMesh);
    quadMesh.material.uniforms.tDiffuse.value = srcTex;
    renderer.setRenderTarget(dstRT);
    renderer.render(quadScene, quadCam);
    renderer.setRenderTarget(null);
}

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
const LOOK_S = 0.0030;
const MAX_V  = 0.30;
const ACCEL  = 0.13;
const FRIC   = 0.80;
const DEAD   = 10;
const RANGE  = 75;

window.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth / 2 && moveTouch.id === null) {
            moveTouch = { id: t.identifier, startX: t.clientX, startY: t.clientY, curX: t.clientX, curY: t.clientY };
        } else if (t.clientX >= window.innerWidth / 2 && lookTouch.id === null) {
            lookTouch = { id: t.identifier, lastX: t.clientX, lastY: t.clientY };
        }
    }
}, { passive: false });

window.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier === moveTouch.id) { moveTouch.curX = t.clientX; moveTouch.curY = t.clientY; }
        else if (t.identifier === lookTouch.id) {
            yaw   -= (t.clientX - lookTouch.lastX) * LOOK_S;
            pitch -= (t.clientY - lookTouch.lastY) * LOOK_S;
            pitch  = Math.max(-1.28, Math.min(1.28, pitch));
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
window.addEventListener('keydown', e => { keys[e.code] = true;  e.preventDefault(); });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    rtA.setSize(w, h); rtB.setSize(w, h); velRT.setSize(w, h);
});

const clock   = new THREE.Clock();
const euler   = new THREE.Euler(0, 0, 0, 'YXZ');
const fwd     = new THREE.Vector3();
const right   = new THREE.Vector3();

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
        const dist = Math.sqrt(dx*dx + dy*dy);
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
    const spd = Math.sqrt(vx*vx + vz*vz);
    if (spd > MAX_V) { vx = (vx/spd)*MAX_V; vz = (vz/spd)*MAX_V; }

    camera.position.addScaledVector(right,  vx);
    camera.position.addScaledVector(fwd,   -vz);

    const gh = IslandModels.getGroundHeight(camera.position.x, camera.position.z);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, gh + 1.72, 0.16);

    IslandModels.tickOcean(ocean, t);

    const sn = sunLight.position.clone().project(camera);
    godMat.uniforms.uSunPos.value.set(sn.x * 0.5 + 0.5, sn.y * 0.5 + 0.5);
    cinemaMat.uniforms.uTime.value = t;

    renderVelocity();

    renderer.setRenderTarget(rtA);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    blit(rtA.texture, rtB, qBloom);
    blit(rtB.texture, rtA, qGod);
    blit(rtA.texture, rtB, qMblur);
    blit(rtB.texture, rtA, qCinema);
    blit(rtA.texture, null, qGamma);
}

animate();
