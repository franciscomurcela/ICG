import * as THREE from 'three';
import { createForestScene } from './scenes/forestScene';
import { initControls } from './controls/firstPersonControls';

let scene, camera, renderer, controls, clock, createChunk, chunkSize, chunks, toggleDayNight;

function init() {
    const forestScene = createForestScene();
    scene = forestScene.scene;
    createChunk = forestScene.createChunk;
    chunkSize = forestScene.chunkSize;
    chunks = forestScene.chunks;
    toggleDayNight = forestScene.toggleDayNight;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000); // Aumentar o valor de 'far'
    camera.position.set(0, 1.6, 0); // Altura inicial da câmera

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Habilitar sombras
    renderer.frustumCulled = true; // Ativar frustum culling
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Tipo de sombra para suavizar
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    controls = initControls(camera);

    // Adicionar o objeto pai da câmera à cena
    scene.add(controls.getCameraParent());

    // Gerar chunks iniciais
    updateChunks();

    // Adicionar botão para alternar entre dia e noite
    const button = document.createElement('button');
    button.innerText = 'Toggle Day/Night';
    button.style.position = 'absolute';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.padding = '10px';
    button.style.background = 'rgba(0, 0, 0, 0.5)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.addEventListener('click', () => {
        toggleDayNight();
    });
    document.body.appendChild(button);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateChunks() {
    const cameraParentPosition = controls.getCameraParent().position; // Posição do objeto pai da câmera
    const cameraChunkX = Math.floor(cameraParentPosition.x / chunkSize);
    const cameraChunkZ = Math.floor(cameraParentPosition.z / chunkSize);

    const visibleRange = 2; // Reduzir o alcance dos chunks visíveis
    const chunksToKeep = new Set(); // Conjunto para armazenar os chunks que devem ser mantidos

    // Gerar novos chunks ao redor da posição atual da câmera
    for (let x = cameraChunkX - visibleRange; x <= cameraChunkX + visibleRange; x++) {
        for (let z = cameraChunkZ - visibleRange; z <= cameraChunkZ + visibleRange; z++) {
            createChunk(x, z); // Gera o chunk se ainda não existir
            chunksToKeep.add(`${x},${z}`); // Adiciona o chunk à lista de chunks a serem mantidos
        }
    }

    // Remover chunks que estão fora do alcance
    for (const chunkKey of chunks.keys()) {
        if (!chunksToKeep.has(chunkKey)) {
            const chunk = chunks.get(chunkKey);
            scene.remove(chunk); // Remove o chunk da cena
            chunks.delete(chunkKey); // Remove o chunk do mapa
        }
    }

}



function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    controls.update(delta); // Atualizar os controles

    // Atualizar chunks dinamicamente
    updateChunks();

    renderer.render(scene, camera);
}

init();
animate();