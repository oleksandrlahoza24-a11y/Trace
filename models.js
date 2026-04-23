// models.js
// Handles all geometry, materials, and terrain generation

const IslandModels = {
    // Math function to calculate rolling hills for both terrain and collision
    getGroundHeight: function(x, z) {
        return Math.sin(x / 10) * 2 + Math.cos(z / 12) * 2;
    },

    createGround: function() {
        const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
        groundGeo.rotateX(-Math.PI / 2);
        
        // Apply our rolling hills math to the ground mesh
        const vertices = groundGeo.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            vertices[i + 1] = this.getGroundHeight(x, z);
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x2e8b57, // Lush green
            roughness: 0.8,
            metalness: 0.1
        });
        
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.receiveShadow = true;
        return ground;
    },

    createOcean: function() {
        const oceanGeo = new THREE.PlaneGeometry(1000, 1000);
        oceanGeo.rotateX(-Math.PI / 2);
        const oceanMat = new THREE.MeshStandardMaterial({ 
            color: 0x1e90ff, 
            transparent: true, 
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.8
        });
        const ocean = new THREE.Mesh(oceanGeo, oceanMat);
        ocean.position.y = -1; // Keep ocean slightly below baseline
        return ocean;
    },

    createTrees: function(treeCount = 600) {
        // We use InstancedMesh here to ensure the iPad doesn't crash from too many objects
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const leavesGeo = new THREE.ConeGeometry(3, 6, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });

        const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
        const leavesMesh = new THREE.InstancedMesh(leavesGeo, leavesMat, treeCount);
        
        trunkMesh.castShadow = true;
        leavesMesh.castShadow = true;

        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < treeCount; i++) {
            // Distribute randomly in a circle, keeping the center clear for the player
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 130; 
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;
            
            // Snap trees to the rolling terrain height
            const ty = this.getGroundHeight(tx, tz);
            const scale = 0.5 + Math.random() * 1.5;

            // Apply Trunk Matrix
            dummy.position.set(tx, ty + (1.5 * scale), tz);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            trunkMesh.setMatrixAt(i, dummy.matrix);

            // Apply Leaves Matrix
            dummy.position.set(tx, ty + (4 * scale), tz);
            dummy.updateMatrix();
            leavesMesh.setMatrixAt(i, dummy.matrix);
        }
        
        return { trunks: trunkMesh, leaves: leavesMesh };
    }
};
