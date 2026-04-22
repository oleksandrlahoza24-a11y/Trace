import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

export class GraphicsEngine {
    constructor() {
        this.scene = new THREE.Scene();
        // Atmospheric Fog: Colors the distance to match the sky
        this.scene.fog = new THREE.FogExp2(0xaaccff, 0.0007);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 20000);
        this.clock = new THREE.Clock();
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        document.body.appendChild(this.renderer.domElement);

        this.initEnvironment();
        this.initTerrain();
        this.addTrees();
        
        window.addEventListener('resize', () => this.onResize());
    }

    initEnvironment() {
        const sun = new THREE.Vector3();
        const sky = new Sky();
        sky.scale.setScalar(10000);
        this.scene.add(sky);

        sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(88), THREE.MathUtils.degToRad(180));
        sky.material.uniforms['sunPosition'].value.copy(sun);

        this.water = new Water(new THREE.PlaneGeometry(15000, 15000), {
            textureWidth: 512, textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', (t) => t.wrapS = t.wrapT = THREE.RepeatWrapping),
            sunDirection: sun, sunColor: 0xffffff, waterColor: 0x004e5f, distortionScale: 3.7
        });
        this.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.water);

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    }

    getTerrainHeight(x, z) {
        const d = Math.sqrt(x*x + z*z);
        let h = Math.max(-15, 250 * Math.exp(-d/600) - 40); // Base island shape
        h += Math.sin(x/60) * Math.cos(z/60) * 15; // Rolling hills
        return h;
    }

    initTerrain() {
        const size = 4000, res = 120;
        const geo = new THREE.PlaneGeometry(size, size, res, res);
        const pos = geo.attributes.position;
        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getY(i);
            const h = this.getTerrainHeight(x, z);
            pos.setZ(i, h);

            // COLOR LOGIC: Sand near water, Grass on hills
            if (h < 2) color.setHex(0xd2b48c); // Sand
            else if (h < 40) color.setHex(0x3a5f0b); // Grass
            else color.setHex(0x555555); // Rock
            
            colors.push(color.r, color.g, color.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);
    }

    addTrees() {
        // Use InstancedMesh to render 200 trees with only 1 draw call (iPad optimization)
        const trunkGeo = new THREE.CylinderGeometry(1, 1.5, 10);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d2926 });
        const count = 200;
        const mesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 1500;
            const z = (Math.random() - 0.5) * 1500;
            const y = this.getTerrainHeight(x, z);
            
            if (y > 5) { // Only grow trees above water level
                dummy.position.set(x, y + 5, z);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }
        }
        this.scene.add(mesh);
    }

    onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        if (w > 0 && h > 0) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }
    }

    render() {
    // Check if renderer or camera is valid before drawing
    if (!this.renderer || !this.camera || isNaN(this.camera.aspect)) return;

    this.water.material.uniforms['time'].value += 0.01;
    this.renderer.render(this.scene, this.camera);
    }
  }


    
