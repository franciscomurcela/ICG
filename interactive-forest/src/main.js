import * as THREE from 'three';
import { createForestScene, rabbitMixer, rabbit, rainParticles, snowParticles, pigMixers, rabbitMixers, rabbits } from './scenes/forestScene';
import { initControls } from './controls/firstPersonControls';

let scene, camera, renderer, controls, clock, createChunk, chunkSize, chunks, toggleDayNight;
let foodCount = 3; // Começa com 3 cenouras
    
let foodDiv; // <-- Torna global

function updateFoodUI() {
    foodDiv.innerText = `🥕 ${foodCount}`;
}

function init() {
    const forestScene = createForestScene();
    scene = forestScene.scene;
    createChunk = forestScene.createChunk;
    chunkSize = forestScene.chunkSize;
    chunks = forestScene.chunks;
    toggleDayNight = forestScene.toggleDayNight;
    const toggleWeather = forestScene.toggleWeather; // Obter a função toggleWeather

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 1.6, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    controls = initControls(camera);

    scene.add(controls.getCameraParent());

    updateChunks();


    // Botão para alternar clima
    const weatherButton = document.createElement('button');
    weatherButton.innerText = 'Toggle Weather';
    weatherButton.style.position = 'absolute';
    weatherButton.style.top = '50px';
    weatherButton.style.right = '10px';
    weatherButton.style.padding = '10px';
    weatherButton.style.background = 'rgba(0, 0, 0, 0.5)';
    weatherButton.style.color = 'white';
    weatherButton.style.border = 'none';
    weatherButton.style.borderRadius = '5px';
    weatherButton.style.cursor = 'pointer';
    weatherButton.addEventListener('click', () => {
        toggleWeather(); // Chamar toggleWeather
    });
    document.body.appendChild(weatherButton);

    foodDiv = document.createElement('div'); // <-- Remove 'const'
    foodDiv.id = 'food-info';
    foodDiv.style.position = 'absolute';
    foodDiv.style.top = '20px';
    foodDiv.style.right = '10px';
    foodDiv.style.color = 'orange';
    foodDiv.style.fontSize = '20px';
    foodDiv.style.background = 'rgba(0,0,0,0.5)';
    foodDiv.style.padding = '8px';
    foodDiv.style.borderRadius = '8px';
    foodDiv.style.zIndex = 20;
    foodDiv.innerText = `🥕 ${foodCount}`;
    document.body.appendChild(foodDiv);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateChunks() {
    const cameraParentPosition = controls.getCameraParent().position;
    const cameraChunkX = Math.floor(cameraParentPosition.x / chunkSize);
    const cameraChunkZ = Math.floor(cameraParentPosition.z / chunkSize);

    const visibleRange = 2;
    const chunksToKeep = new Set();

    // Preencher chunksToKeep com os chunks dentro do alcance
    for (let x = cameraChunkX - visibleRange; x <= cameraChunkX + visibleRange; x++) {
        for (let z = cameraChunkZ - visibleRange; z <= cameraChunkZ + visibleRange; z++) {
            const chunkKey = `${x},${z}`;
            chunksToKeep.add(chunkKey);
        }
    }

    // Remover chunks fora do alcance
    for (const chunkKey of chunks.keys()) {
        if (!chunksToKeep.has(chunkKey)) {
            const chunkGroup = chunks.get(chunkKey);

            scene.remove(chunkGroup);
            chunks.delete(chunkKey);
        }
    }

    // Gerar novos chunks ao redor da posição atual da câmera
    for (let x = cameraChunkX - visibleRange; x <= cameraChunkX + visibleRange; x++) {
        for (let z = cameraChunkZ - visibleRange; z <= cameraChunkZ + visibleRange; z++) {
            const chunkKey = `${x},${z}`;
            if (!chunks.has(chunkKey)) {
                createChunk(x, z);
                console.debug(`Chunk criado: ${chunkKey}`);
            }
        }
    }

    // Limpar coelhos cujos meshes já não estão na cena
    if (rabbits && rabbits.length) {
        for (let i = rabbits.length - 1; i >= 0; i--) {
            if (!rabbits[i].mesh.parent) {
                rabbits.splice(i, 1);
            }
        }
    }
}

let rabbitAngle = 0; // Ângulo para o movimento circular

let interactionDiv, messageTimeout;
let nearestPig = null;

// Cria a caixa de interação (apenas uma vez)
function createInteractionUI() {
    interactionDiv = document.createElement('div');
    interactionDiv.id = 'interaction-ui';
    interactionDiv.style.position = 'absolute';
    interactionDiv.style.top = '50%';
    interactionDiv.style.left = '50%';
    interactionDiv.style.transform = 'translate(-50%, -120px)';
    interactionDiv.style.padding = '12px 20px';
    interactionDiv.style.background = 'rgba(0,0,0,0.7)';
    interactionDiv.style.color = '#fff';
    interactionDiv.style.fontSize = '22px';
    interactionDiv.style.borderRadius = '8px';
    interactionDiv.style.display = 'none';
    interactionDiv.style.zIndex = 30;
    interactionDiv.innerHTML = "<b>E</b> para alimentar porco";
    document.body.appendChild(interactionDiv);
}
createInteractionUI();

// Cria a caixa de mensagem
const messageDiv = document.createElement('div');
messageDiv.id = 'message-ui';
messageDiv.style.position = 'absolute';
messageDiv.style.top = '40%';
messageDiv.style.left = '50%';
messageDiv.style.transform = 'translate(-50%, -50%)';
messageDiv.style.padding = '14px 24px';
messageDiv.style.background = 'rgba(0,0,0,0.8)';
messageDiv.style.color = '#fff';
messageDiv.style.fontSize = '24px';
messageDiv.style.borderRadius = '10px';
messageDiv.style.display = 'none';
messageDiv.style.zIndex = 40;
document.body.appendChild(messageDiv);

function showMessage(text) {
    messageDiv.innerText = text;
    messageDiv.style.display = 'block';
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 1200);
}

function getPigMeshes() {
    // Só retorna os meshes principais dos porcos (não filhos internos)
    const pigs = [];
    scene.traverse(obj => {
        if (obj.name && obj.name.startsWith('Pig_') && obj.type === 'Group') {
            pigs.push(obj);
        }
    });
    return pigs;
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    controls.update(delta);

    if (rabbitMixer) rabbitMixer.update(delta);
    if (pigMixers && pigMixers.length) pigMixers.forEach(mixer => mixer.update(delta));
    if (rabbitMixers && rabbitMixers.length) rabbitMixers.forEach(mixer => mixer.update(delta));
    if (rabbits && rabbits.length) {
        rabbits.forEach(r => {
            r.angle += delta * r.speed;
            r.mesh.position.x = r.centerX + Math.cos(r.angle) * r.radius;
            r.mesh.position.z = r.centerZ + Math.sin(r.angle) * r.radius;
            const dx = -Math.sin(r.angle);
            const dz = Math.cos(r.angle);
            r.mesh.rotation.y = Math.atan2(dx, dz);
        });
    }

    // --- INTERAÇÃO COM PORCOS ---
    nearestPig = null;
    let minDist = 2.5;
    const playerPos = controls.getCameraParent().position;
    const pigs = getPigMeshes();
    for (const pig of pigs) {
        // Posição global do mesh principal do porco
        const pigWorldPos = new THREE.Vector3();
        pig.getWorldPosition(pigWorldPos);
        // Calcula distância apenas no plano XZ
        const dx = playerPos.x - pigWorldPos.x;
        const dz = playerPos.z - pigWorldPos.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        if (distXZ < minDist) {
            minDist = distXZ;
            nearestPig = pig;
        }
    }
    if (nearestPig) {
        interactionDiv.style.display = 'block';
    } else {
        interactionDiv.style.display = 'none';
    }

    updateChunks();
    renderer.render(scene, camera);
}

window.addEventListener('keydown', (event) => {
    console.log('Key pressed:', event.code, nearestPig, foodCount);
    if (event.code === 'KeyE' && nearestPig && foodCount > 0) {
        foodCount--;
        updateFoodUI();
        showMessage('Porco alimentado');
        nearestPig.position.y += 1;
        setTimeout(() => {
            nearestPig.position.y = 0;
        }, 400);
    }
});

init();
animate();