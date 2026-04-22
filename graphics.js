import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

export class GraphicsEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 30000);
        this.clock = new THREE.Clock();
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.initEnvironment();
        this.initTerrain();
        
        window.addEventListener('resize', () => this.onResize());
    }

    initEnvironment() {
        // Sky & Sun
        this.sky = new Sky();
        this.sky.scale.setScalar(20000);
        this.scene.add(this.sky);

        this.sun = new THREE.Vector3();
        const phi = THREE.MathUtils.degToRad(87);
        const theta = THREE.MathUtils.degToRad(180);
        this.sun.setFromSphericalCoords(1, phi, theta);
        this.sky.material.uniforms['sunPosition'].value.copy(this.sun);

        // Water Shader Logic
        this.water = new Water(new THREE.PlaneGeometry(15000, 15000), {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', (t) => {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: this.sun,
            sunColor: 0xffffff,
            waterColor: 0x003344,
            distortionScale: 4.0,
        });
        this.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.water);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    }

    initTerrain() {
        const geo = new THREE.PlaneGeometry(3000, 3000, 80, 80);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i), y = pos.getY(i);
            pos.setZ(i, this.getTerrainHeight(x, y));
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2d4c2d, flatShading: true }));
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);
    }

    getTerrainHeight(x, z) {
        const d = Math.sqrt(x*x + z*z);
        let h = Math.max(-10, 220 * Math.exp(-d/500) - 35);
        h += Math.sin(x/40) * Math.cos(z/40) * 8; 
        return h;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.water.material.uniforms['time'].value += 1.0 / 60.0;
        this.renderer.render(this.scene, this.camera);
    }
}
