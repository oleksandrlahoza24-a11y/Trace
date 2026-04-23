// models.js — Ultra-Detailed World Assets

const IslandModels = (() => {

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function grad(h, x, z) {
        const v = [1,-1]; return v[h&1]*x + v[(h>>1)&1]*z;
    }
    function hash(n) { return Math.abs(Math.sin(n) * 43758.5453123) % 1; }
    function noise2(x, z) {
        const ix = Math.floor(x), iz = Math.floor(z);
        const fx = x - ix, fz = z - iz;
        const ux = fade(fx), uz = fade(fz);
        const a = hash(ix     + iz     * 57);
        const b = hash(ix + 1 + iz     * 57);
        const c = hash(ix     + (iz+1) * 57);
        const d = hash(ix + 1 + (iz+1) * 57);
        return lerp(lerp(lerp(a,b,ux), lerp(c,d,ux), uz)*2-1,
                    lerp(lerp(a,b,ux), lerp(c,d,ux), uz)*2-1, 0.5) * 2 - 1;
    }
    function fbm(x, z, octaves = 5) {
        let v = 0, amp = 1, freq = 1, max = 0;
        for (let o = 0; o < octaves; o++) {
            v   += noise2(x * freq, z * freq) * amp;
            max += amp;
            amp  *= 0.5;
            freq *= 2.1;
        }
        return v / max;
    }

    const getGroundHeight = function(x, z) {
        const big   = Math.sin(x / 18) * 3.5 + Math.cos(z / 14) * 3;
        const med   = Math.sin(x / 6)  * 1.2 + Math.cos(z / 7)  * 1.0;
        const micro = fbm(x * 0.15, z * 0.15, 4) * 2.5;
        // Island falloff: flatten near the edges, raise the centre
        const dist  = Math.sqrt(x*x + z*z);
        const isle  = Math.max(0, 1 - (dist / 110)) * 4.0;
        return big + med + micro + isle;
    };

    function mat(color, rough = 0.8, metal = 0, emissive = 0x000000, emissiveInt = 0) {
        return new THREE.MeshStandardMaterial({
            color, roughness: rough, metalness: metal,
            emissive, emissiveIntensity: emissiveInt,
        });
    }
    function matVertex(rough = 0.85) {
        return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 });
    }

    function createGround() {
        const seg = 128;
        const geo = new THREE.PlaneGeometry(300, 300, seg, seg);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position.array;
        const count = pos.length / 3;
        const colors = new Float32Array(count * 3);
        const c = new THREE.Color();

        for (let i = 0; i < count; i++) {
            const x = pos[i * 3];
            const z = pos[i * 3 + 2];
            const h = getGroundHeight(x, z);
            pos[i * 3 + 1] = h;

            // Vertex colour painting: blend grass → dirt → rock by slope & height
            const slope = Math.abs(fbm(x * 0.15, z * 0.15, 2));
            if (h > 5.5)        c.setHex(0x8a8070);   // Rocky peak
            else if (slope > 0.35) c.setHex(0x7a6348); // Exposed dirt/cliff
            else if (h < -0.5)  c.setHex(0xc2a96e);   // Sandy shore
            else                 c.setHex(0x3a7d3c);   // Grass

            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, matVertex(0.88));
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        return mesh;
    }

    function createOcean() {
        const geo = new THREE.PlaneGeometry(1200, 1200, 4, 4);
        geo.rotateX(-Math.PI / 2);
        const oceanMat = new THREE.ShaderMaterial({
            name: 'ocean',
            uniforms: {
                uTime:    { value: 0 },
                uDeep:    { value: new THREE.Color(0x0a3d6b) },
                uShallow: { value: new THREE.Color(0x1fa8c7) },
                uFoam:    { value: new THREE.Color(0xd6f5ff) },
            },
            vertexShader: `
                uniform float uTime;
                varying vec2 vUv;
                varying float vWave;
                void main(){
                    vUv = uv;
                    vec3 p = position;
                    float w  = sin(p.x*0.08 + uTime*0.9) * 0.25
                             + cos(p.z*0.10 + uTime*0.7) * 0.20
                             + sin(p.x*0.2  + p.z*0.15 + uTime*1.4) * 0.10;
                    p.y += w;
                    vWave = w;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uDeep, uShallow, uFoam;
                uniform float uTime;
                varying vec2 vUv;
                varying float vWave;
                void main(){
                    float t = smoothstep(-0.3, 0.3, vWave);
                    vec3 col = mix(uDeep, uShallow, t);
                    // Foam on wave crests
                    float foam = smoothstep(0.18, 0.28, vWave);
                    col = mix(col, uFoam, foam * 0.6);
                    // Fresnel edge glow
                    col += vec3(0.04, 0.09, 0.12) * (1.0 - t);
                    gl_FragColor = vec4(col, 0.88);
                }
            `,
            transparent: true,
            side: THREE.FrontSide,
        });
        const mesh = new THREE.Mesh(geo, oceanMat);
        mesh.position.y = -1.4;
        mesh.receiveShadow = false;
        return mesh;
    }

    function createTrees(count = 500) {
        const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 4, 7);
        const trunkMat = mat(0x6b3d1e, 0.92, 0);

        // Pine: stacked cones
        const pineA = new THREE.ConeGeometry(2.8, 5,  7);
        const pineB = new THREE.ConeGeometry(2.0, 4,  7);
        const pineC = new THREE.ConeGeometry(1.2, 3,  7);
        const leafMats = [
            mat(0x1d6b2a, 0.85, 0),
            mat(0x256b30, 0.82, 0),
            mat(0x154f1f, 0.88, 0),
        ];

        const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        const cone0 = new THREE.InstancedMesh(pineA, leafMats[0], count);
        const cone1 = new THREE.InstancedMesh(pineB, leafMats[1], count);
        const cone2 = new THREE.InstancedMesh(pineC, leafMats[2], count);
        [trunkMesh, cone0, cone1, cone2].forEach(m => { m.castShadow = true; m.receiveShadow = true; });

        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const angle  = Math.random() * Math.PI * 2;
            const radius = 12 + Math.random() * 125;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            const ty = getGroundHeight(tx, tz);
            const sc = 0.55 + Math.random() * 1.2;
            const rot = Math.random() * Math.PI * 2;

            dummy.rotation.y = rot;
            dummy.position.set(tx, ty + 2 * sc, tz);
            dummy.scale.setScalar(sc);
            dummy.updateMatrix();
            trunkMesh.setMatrixAt(i, dummy.matrix);

            dummy.position.set(tx, ty + 4.5 * sc, tz);
            dummy.updateMatrix(); cone0.setMatrixAt(i, dummy.matrix);

            dummy.position.set(tx, ty + 6.5 * sc, tz);
            dummy.scale.setScalar(sc * 0.9);
            dummy.updateMatrix(); cone1.setMatrixAt(i, dummy.matrix);

            dummy.position.set(tx, ty + 8.2 * sc, tz);
            dummy.scale.setScalar(sc * 0.75);
            dummy.updateMatrix(); cone2.setMatrixAt(i, dummy.matrix);
        }
        return { trunks: trunkMesh, leavesA: cone0, leavesB: cone1, leavesC: cone2 };
    }

    function createRocks(count = 180) {
        const geo = new THREE.DodecahedronGeometry(1, 1);
        // Roughen vertex positions for natural look
        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i]   += (Math.random() - 0.5) * 0.35;
            pos[i+1] += (Math.random() - 0.5) * 0.25;
            pos[i+2] += (Math.random() - 0.5) * 0.35;
        }
        geo.computeVertexNormals();
        const rockMat = mat(0x7a7060, 0.92, 0.05);
        const rocks   = new THREE.InstancedMesh(geo, rockMat, count);
        rocks.castShadow = true;
        rocks.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const angle  = Math.random() * Math.PI * 2;
            const radius = Math.random() * 120;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            const ty = getGroundHeight(tx, tz);
            const sc = 0.2 + Math.random() * 1.8;
            dummy.position.set(tx, ty + sc * 0.4, tz);
            dummy.scale.set(sc, sc * (0.5 + Math.random() * 0.7), sc * (0.7 + Math.random() * 0.5));
            dummy.rotation.set(Math.random()*0.4, Math.random()*Math.PI*2, Math.random()*0.3);
            dummy.updateMatrix();
            rocks.setMatrixAt(i, dummy.matrix);
        }
        return rocks;
    }

    function createFerns(count = 350) {
        // 4 crossed quads per fern using BufferGeometry
        const geo = new THREE.BufferGeometry();
        const verts = [], uvs = [], idx = [];
        const W = 1.0, H = 1.2;
        function addQuad(rx, rz) {
            const base = verts.length / 3;
            const cx = Math.cos(rx), cz = Math.sin(rz);
            verts.push(-cx*W, 0, -cz*W,  cx*W, 0, cz*W,  cx*W, H, cz*W,  -cx*W, H, -cz*W);
            uvs.push(0,0, 1,0, 1,1, 0,1);
            idx.push(base, base+1, base+2, base, base+2, base+3);
        }
        for (let a = 0; a < 3; a++) addQuad(a * Math.PI / 3, a * Math.PI / 3 + 0.5);
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,   2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const fernMat = mat(0x2a6e22, 0.80, 0);
        fernMat.side = THREE.DoubleSide;

        const ferns = new THREE.InstancedMesh(geo, fernMat, count);
        ferns.castShadow = true;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const angle  = Math.random() * Math.PI * 2;
            const radius = 8 + Math.random() * 110;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            const ty = getGroundHeight(tx, tz);
            const sc = 0.4 + Math.random() * 0.9;
            dummy.position.set(tx, ty, tz);
            dummy.scale.setScalar(sc);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();
            ferns.setMatrixAt(i, dummy.matrix);
        }
        return ferns;
    }

    function createFlowers(count = 600) {
        const geo = new THREE.BufferGeometry();
        const positions = [], colors = [];
        const palette = [0xff4466, 0xffcc00, 0xff8833, 0xcc55ff, 0xffffff, 0x55ddff];
        const c = new THREE.Color();
        for (let i = 0; i < count; i++) {
            const angle  = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 100;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            const ty = getGroundHeight(tx, tz) + 0.5;
            positions.push(tx, ty, tz);
            c.setHex(palette[Math.floor(Math.random() * palette.length)]);
            colors.push(c.r, c.g, c.b);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
        const mat2 = new THREE.PointsMaterial({ size: 0.28, vertexColors: true, sizeAttenuation: true });
        return new THREE.Points(geo, mat2);
    }

    function createGrass(count = 800) {
        const geo = new THREE.BufferGeometry();
        const v = [], idx = [];
        for (let b = 0; b < 3; b++) {
            const base = b * 4;
            const ang = (b / 3) * Math.PI;
            const cx = Math.cos(ang) * 0.35, cz = Math.sin(ang) * 0.35;
            v.push(-cx, 0, -cz,  cx, 0, cz,  cx*0.6, 0.9, cz*0.6, -cx*0.6, 0.9, -cz*0.6);
            idx.push(base, base+1, base+2, base, base+2, base+3);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const grassMat = mat(0x4a8c30, 0.90, 0);
        grassMat.side = THREE.DoubleSide;
        const grass = new THREE.InstancedMesh(geo, grassMat, count);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const angle  = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 118;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            const ty = getGroundHeight(tx, tz);
            const sc = 0.5 + Math.random() * 1.1;
            dummy.position.set(tx, ty, tz);
            dummy.scale.setScalar(sc);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();
            grass.setMatrixAt(i, dummy.matrix);
        }
        return grass;
    }

    function createDriftwood(count = 30) {
        const geo = new THREE.CylinderGeometry(0.18, 0.28, 4.5, 6);
        const driftMat = mat(0x9c7a52, 0.97, 0);
        const logs = new THREE.InstancedMesh(geo, driftMat, count);
        logs.castShadow = true;
        logs.receiveShadow = true;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            // Scatter along shoreline ring
            const angle  = Math.random() * Math.PI * 2;
            const radius = 95 + Math.random() * 25;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            const ty = getGroundHeight(tx, tz);
            const sc = 0.5 + Math.random() * 1.4;
            dummy.position.set(tx, ty + 0.15 * sc, tz);
            dummy.scale.set(sc * (0.5 + Math.random()), sc, sc * (0.5 + Math.random()));
            dummy.rotation.set(
                (Math.random() - 0.5) * 0.5,
                Math.random() * Math.PI * 2,
                Math.PI / 2 + (Math.random() - 0.5) * 0.6
            );
            dummy.updateMatrix();
            logs.setMatrixAt(i, dummy.matrix);
        }
        return logs;
    }

    function createCliffs(count = 40) {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i]   += (Math.random() - 0.5) * 0.3;
            pos[i+1] += (Math.random() - 0.5) * 0.2;
            pos[i+2] += (Math.random() - 0.5) * 0.3;
        }
        geo.computeVertexNormals();
        const cliffMat = mat(0x686050, 0.95, 0.02);
        const cliffs   = new THREE.InstancedMesh(geo, cliffMat, count);
        cliffs.castShadow = true;
        cliffs.receiveShadow = true;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const angle  = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const radius = 88 + Math.random() * 18;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            const ty = getGroundHeight(tx, tz);
            const w = 4  + Math.random() * 10;
            const h = 5  + Math.random() * 18;
            const d = 3  + Math.random() * 7;
            dummy.position.set(tx, ty + h * 0.5, tz);
            dummy.scale.set(w, h, d);
            dummy.rotation.y = angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.4;
            dummy.updateMatrix();
            cliffs.setMatrixAt(i, dummy.matrix);
        }
        return cliffs;
    }

    function tickOcean(ocean, elapsed) {
        if (ocean?.material?.uniforms?.uTime) {
            ocean.material.uniforms.uTime.value = elapsed;
        }
    }

    return {
        getGroundHeight,
        createGround,
        createOcean,
        createTrees,
        createRocks,
        createFerns,
        createFlowers,
        createGrass,
        createDriftwood,
        createCliffs,
        tickOcean,
    };
})();
