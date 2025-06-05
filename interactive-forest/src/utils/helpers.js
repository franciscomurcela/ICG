import * as THREE from 'three';

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTree(position, scale) {
    const tree = new THREE.Group();

    const trunkHeight = 4 * scale;
    const trunkRadius = 0.8 * scale; 
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); 
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2; 
    trunk.castShadow = true; 
    trunk.receiveShadow = true;

    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); 
    const foliageLayers = 3; 
    const foliageHeight = 2.5 * scale; 
    const foliageRadius = 3 * scale; 

    for (let i = 0; i < foliageLayers; i++) {
        const layerScale = 1 - i * 0.3;
        const coneGeometry = new THREE.ConeGeometry(foliageRadius * layerScale, foliageHeight, 6);
        const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
        cone.position.y = trunkHeight + foliageHeight * i; 
        cone.receiveShadow = true;
        tree.add(cone);
    }

    // Adicionar tronco ao grupo da árvore
    tree.add(trunk);

    // Posicionar a árvore na cena
    tree.position.copy(position);

    return tree;
}

function createRock(position, scale) {
    const geometries = [
        new THREE.DodecahedronGeometry(scale), // Forma irregular
        new THREE.SphereGeometry(scale, 8, 8), // Esfera
    ];
    const randomGeometry = geometries[Math.floor(Math.random() * geometries.length)];

    // Criar material da pedra
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Cor cinza
    const rock = new THREE.Mesh(randomGeometry, rockMaterial);

    // Posicionar a pedra
    rock.position.copy(position);
    rock.castShadow = true; 
    rock.receiveShadow = true;

    return rock;
}

function createRealisticGrassPatch(position, patchSize, density, grassTexture) {
    const grassGroup = new THREE.Group(); 
    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        transparent: true, 
        alphaTest: 0.5, 
        side: THREE.DoubleSide, 
    });

    for (let i = 0; i < density; i++) {
        const x = Math.random() * patchSize - patchSize / 2;
        const z = Math.random() * patchSize - patchSize / 2;
        const yRotation = Math.random() * Math.PI * 2;

        const grassGeometry = new THREE.PlaneGeometry(1, 2); 
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.position.set(position.x + x, position.y, position.z + z);
        grass.rotation.y = yRotation;

        grass.castShadow = true;
        grass.receiveShadow = true;

        grassGroup.add(grass);
    }

    return grassGroup;
}

function createRandomPositionInForest(bounds) {
    const x = getRandomInt(bounds.min.x, bounds.max.x);
    const z = getRandomInt(bounds.min.z, bounds.max.z);
    return new THREE.Vector3(x, 0, z);
}

export { createRock, getRandomInt, createTree, createRandomPositionInForest, createRealisticGrassPatch };