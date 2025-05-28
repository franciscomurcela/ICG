import * as THREE from 'three';
import {
    createForestScene, rabbitMixer, rabbit, rainParticles, snowParticles,
    pigMixers, rabbitMixers, rabbits, carrots,
    spawnPigInChunk, spawnRabbitInChunk, rabbitGLTF
} from './scenes/forestScene';
import { initControls } from './controls/firstPersonControls';

let scene, camera, renderer, controls, clock, createChunk, chunkSize, chunks, toggleDayNight, toggleWeather;
let foodCount = 3; // Começa com 3 cenouras
    
let foodDiv;

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
    toggleWeather = forestScene.toggleWeather; // <-- Atribui aqui

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
    weatherButton.style.top = '75px'; // Estava '50px', aumenta para 60px ou mais
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

            // Remover coelhos associados a este chunk
            if (rabbits && rabbits.length) {
                for (let i = rabbits.length - 1; i >= 0; i--) {
                    if (rabbits[i].chunkGroup === chunkGroup) {
                        if (rabbits[i].mesh.parent) {
                            rabbits[i].mesh.parent.remove(rabbits[i].mesh);
                        }
                        rabbits.splice(i, 1);
                    }
                }
            }

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
                const chunkGroup = chunks.get(chunkKey);
                if (chunkGroup) {
                    spawnPigInChunk(chunkGroup);
                    if (rabbitGLTF) {
                        spawnRabbitInChunk(chunkGroup);
                    }
                }
                console.debug(`Chunk criado: ${chunkKey}`);
            }
        }
    }

    // Limpar coelhos cujos meshes já não estão na cena OU cujo chunk foi removido
    if (rabbits && rabbits.length) {
        for (let i = rabbits.length - 1; i >= 0; i--) {
            const rabbit = rabbits[i];
            // Remove se o mesh não tem parent (já não está na cena) OU se o chunkGroup já não está em chunks
            if (
                !rabbit.mesh.parent ||
                ![...chunks.values()].includes(rabbit.chunkGroup)
            ) {
                rabbits.splice(i, 1);
            }
        }
    }
}

let rabbitAngle = 0; // Ângulo para o movimento circular

let interactionDiv, messageTimeout;
let nearestPig = null;
let nearestCarrot = null; // NOVO
let nearestRabbit = null;

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
    interactionDiv.innerHTML = ""; // Vai ser atualizado dinamicamente
    document.body.appendChild(interactionDiv);
}
createInteractionUI();

// Cria a caixa de mensagem
const messageDiv = document.createElement('div');
messageDiv.id = 'message-ui';
messageDiv.style.position = 'absolute';
messageDiv.style.top = '80px'; // <-- No topo do ecrã
messageDiv.style.left = '50%';
messageDiv.style.transform = 'translateX(-50%)'; // <-- Só centrar horizontalmente
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

function getRabbitMeshes() {
    // Só retorna os meshes principais dos coelhos (não filhos internos)
    const rabbits = [];
    scene.traverse(obj => {
        if (obj.name && obj.name.startsWith('Rabbit_') && obj.type === 'Group') {
            rabbits.push(obj);
        }
    });
    return rabbits;
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

    // --- INTERAÇÃO COM PORCOS E CENOURAS ---
    nearestPig = null;
    nearestCarrot = null;
    nearestRabbit = null;
    let minDistPig = 2.5;
    let minDistCarrot = 1.5;
    let minDistRabbit = 2.5;
    const playerPos = controls.getCameraParent().position;

    // Porcos
    const pigs = getPigMeshes();
    for (const pig of pigs) {
        const pigWorldPos = new THREE.Vector3();
        pig.getWorldPosition(pigWorldPos);
        const dx = playerPos.x - pigWorldPos.x;
        const dz = playerPos.z - pigWorldPos.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        if (distXZ < minDistPig) {
            minDistPig = distXZ;
            nearestPig = pig;
        }
    }

    // Cenouras
    if (carrots && carrots.length) {
        for (const carrot of carrots) {
            const worldPos = new THREE.Vector3();
            carrot.getWorldPosition(worldPos);
            const dx = playerPos.x - worldPos.x;
            const dz = playerPos.z - worldPos.z;
            const distXZ = Math.sqrt(dx * dx + dz * dz);
            if (distXZ < minDistCarrot) {
                minDistCarrot = distXZ;
                nearestCarrot = carrot;
            }
        }
    }

    // Coelhos
    const rabbits = getRabbitMeshes();
    nearestRabbit = null;
    for (const rabbit of rabbits) {
        const rabbitWorldPos = new THREE.Vector3();
        rabbit.getWorldPosition(rabbitWorldPos);
        const dx = playerPos.x - rabbitWorldPos.x;
        const dz = playerPos.z - rabbitWorldPos.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        if (distXZ < minDistRabbit) {
            minDistRabbit = distXZ;
            nearestRabbit = rabbit;
        }

        // Movimento circular (já existente)
        if (rabbit.userData && rabbit.userData.radius) {
            rabbit.userData.angle += delta * rabbit.userData.speed;
            rabbit.position.x = rabbit.userData.centerX + Math.cos(rabbit.userData.angle) * rabbit.userData.radius - rabbit.parent.position.x;
            rabbit.position.z = rabbit.userData.centerZ + Math.sin(rabbit.userData.angle) * rabbit.userData.radius - rabbit.parent.position.z;
            const dx2 = -Math.sin(rabbit.userData.angle);
            const dz2 = Math.cos(rabbit.userData.angle);
            rabbit.rotation.y = Math.atan2(dx2, dz2);
        }
    }

    // Mostrar UI de interação
    if (nearestCarrot) {
        interactionDiv.innerHTML = "<b>E</b> para apanhar cenoura";
        interactionDiv.style.display = 'block';
    } else if (nearestPig) {
        interactionDiv.innerHTML = "<b>E</b> para alimentar porco";
        interactionDiv.style.display = 'block';
    } else if (nearestRabbit) {
        interactionDiv.innerHTML = "<b>E</b> para alimentar coelho";
        interactionDiv.style.display = 'block';
    } else {
        interactionDiv.style.display = 'none';
    }

    // --- NOVO: manter chuva e neve centradas no utilizador ---
    const cameraPos = controls.getCameraParent().position;
    if (rainParticles && scene.children.includes(rainParticles)) {
        rainParticles.position.set(cameraPos.x, 0, cameraPos.z);
    }
    if (snowParticles && scene.children.includes(snowParticles)) {
        snowParticles.position.set(cameraPos.x, 0, cameraPos.z);
    }

    // Atualização das partículas
    if (rainParticles && scene.children.includes(rainParticles)) {
        const pos = rainParticles.geometry.attributes.position;
        const vel = rainParticles.geometry.attributes.velocity;
        for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3 + 1] += vel.array[i * 3 + 1];
            if (pos.array[i * 3 + 1] < 0) {
                // Quando a gota chega ao chão, reinicia em cima e randomiza X e Z à volta do utilizador
                pos.array[i * 3 + 1] = Math.random() * 20 + 5;
                pos.array[i * 3 + 0] = (Math.random() * 1000 - 500) + cameraPos.x;
                pos.array[i * 3 + 2] = (Math.random() * 1000 - 500) + cameraPos.z;
            }
        }
        pos.needsUpdate = true;
    }
    if (snowParticles && scene.children.includes(snowParticles)) {
        const pos = snowParticles.geometry.attributes.position;
        const vel = snowParticles.geometry.attributes.velocity;
        for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3 + 0] += vel.array[i * 3 + 0];
            pos.array[i * 3 + 1] += vel.array[i * 3 + 1];
            pos.array[i * 3 + 2] += vel.array[i * 3 + 2];
            if (pos.array[i * 3 + 1] < 0) {
                pos.array[i * 3 + 1] = Math.random() * 40 + 10;
                pos.array[i * 3 + 0] = Math.random() * 60 - 30;
                pos.array[i * 3 + 2] = Math.random() * 60 - 30;
            }
        }
        pos.needsUpdate = true;
    }


    updateChunks();
    renderer.render(scene, camera);
}

window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyE') {
        if (nearestCarrot) {
            // Apanhar cenoura
            if (nearestCarrot.parent) nearestCarrot.parent.remove(nearestCarrot);
            const idx = carrots.indexOf(nearestCarrot);
            if (idx !== -1) carrots.splice(idx, 1);
            foodCount++;
            updateFoodUI();
            showMessage('Apanhaste uma cenoura!');
        } else if (nearestPig && foodCount > 0) {
            // Alimentar porco
            foodCount--;
            updateFoodUI();
            showMessage('Porco alimentado');
            const pig = nearestPig; // Guarda referência ao porco atual
            const originalY = pig.position.y;
            pig.position.y = originalY + 1;
            setTimeout(() => {
                pig.position.y = originalY;
            }, 400);
        } else if (nearestRabbit && foodCount > 0) {
            // Alimentar coelho
            foodCount--;
            updateFoodUI();
            showMessage('Coelho alimentado!');
            // Aumentar velocidade do coelho
            if (nearestRabbit.userData && nearestRabbit.userData.speed) {
                const rabbit = nearestRabbit; // Guarda referência ao coelho atual
                const originalSpeed = rabbit.userData.speed;
                rabbit.userData.speed = originalSpeed * 2.5;
                setTimeout(() => {
                    // Verifica se o coelho ainda existe antes de restaurar
                    if (rabbit.userData) {
                        rabbit.userData.speed = originalSpeed;
                    }
                }, 4000);
            }
        }
    }
    if (event.code === 'KeyR') {
        toggleWeather();
    }
});

init();
animate();