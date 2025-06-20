import * as THREE from 'three';
import {
    createForestScene, rabbitMixer, rabbit, rainParticles, snowParticles,
    pigMixers, rabbitMixers, rabbits, carrots,
    spawnPigInChunk, spawnRabbitInChunk, rabbitGLTF,
    foxGLTF, foxMixers, spawnFoxInChunk
} from './scenes/forestScene';
import { initControls } from './controls/firstPersonControls';
import bgMusicUrl from './assets/sounds/background.mp3';
import foxSfxUrl from './assets/sounds/fox.mp3';
import pigSfxUrl from './assets/sounds/pig.mp3';
import rabbitSfxUrl from './assets/sounds/rabbit.mp3';

let scene, camera, renderer, controls, clock, createChunk, chunkSize, chunks, toggleDayNight, toggleWeather;
let foodCount = 3; 
let berryCount = 3; 
    
let visibleRange = 2; 
let foodDiv;

function updateFoodUI() {
    foodDiv.innerText = `🥕 ${foodCount}`;
}

let berryDiv;
function updateBerryUI() {
    berryDiv.innerText = `🍒 ${berryCount}`;
}

function init() {
    const forestScene = createForestScene();
    scene = forestScene.scene;
    createChunk = forestScene.createChunk;
    chunkSize = forestScene.chunkSize;
    chunks = forestScene.chunks;
    toggleDayNight = forestScene.toggleDayNight;
    toggleWeather = forestScene.toggleWeather;

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
    weatherButton.style.top = '110px'; 
    weatherButton.style.right = '10px';
    weatherButton.style.padding = '10px';
    weatherButton.style.background = 'rgba(0, 0, 0, 0.5)';
    weatherButton.style.color = 'white';
    weatherButton.style.border = 'none';
    weatherButton.style.borderRadius = '5px';
    weatherButton.style.cursor = 'pointer';
    weatherButton.addEventListener('click', () => {
        toggleWeather(); 
    });
    document.body.appendChild(weatherButton);

    const rangeDiv = document.createElement('div');
    rangeDiv.style.position = 'absolute';
    rangeDiv.style.top = '150px';
    rangeDiv.style.right = '10px';
    rangeDiv.style.background = 'rgba(0,0,0,0.5)';
    rangeDiv.style.color = 'white';
    rangeDiv.style.padding = '8px';
    rangeDiv.style.borderRadius = '8px';
    rangeDiv.style.zIndex = 21;
    rangeDiv.innerHTML = `
        <span>Chunks: </span>
        <button id="range-dec" style="margin-right:5px;">-</button>
        <span id="range-value">${visibleRange}</span>
        <button id="range-inc" style="margin-left:5px;">+</button>
    `;
    document.body.appendChild(rangeDiv);

    document.getElementById('range-dec').onclick = () => {
        if (visibleRange > 1) {
            visibleRange--;
            document.getElementById('range-value').innerText = visibleRange;
            updateChunks();
        }
    };
    document.getElementById('range-inc').onclick = () => {
        if (visibleRange < 4) {
            visibleRange++;
            document.getElementById('range-value').innerText = visibleRange;
            updateChunks();
        }
    };

    foodDiv = document.createElement('div'); 
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

    berryDiv = document.createElement('div');
    berryDiv.id = 'berry-info';
    berryDiv.style.position = 'absolute';
    berryDiv.style.top = '65px';
    berryDiv.style.right = '10px';
    berryDiv.style.color = '#b9001f';
    berryDiv.style.fontSize = '20px';
    berryDiv.style.background = 'rgba(0,0,0,0.5)';
    berryDiv.style.padding = '8px';
    berryDiv.style.borderRadius = '8px';
    berryDiv.style.zIndex = 20;
    berryDiv.innerText = `🍒 ${berryCount}`;
    document.body.appendChild(berryDiv);

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
                    if (foxGLTF) spawnFoxInChunk(chunkGroup);
                }
                console.debug(`Chunk criado: ${chunkKey}`);
            }
        }
    }

    if (rabbits && rabbits.length) {
        for (let i = rabbits.length - 1; i >= 0; i--) {
            const rabbit = rabbits[i];
            if (
                !rabbit.mesh.parent ||
                ![...chunks.values()].includes(rabbit.chunkGroup)
            ) {
                rabbits.splice(i, 1);
            }
        }
    }
}

let rabbitAngle = 0;

let interactionDiv, messageTimeout;
let nearestPig = null;
let nearestCarrot = null; 
let nearestRabbit = null;
let nearestBerry = null;
let nearestFox = null;
let minDistFox = 3.5;
const foxes = getFoxMeshes();
for (const fox of foxes) {
    const foxWorldPos = new THREE.Vector3();
    fox.getWorldPosition(foxWorldPos);
    const dx = playerPos.x - foxWorldPos.x;
    const dz = playerPos.z - foxWorldPos.z;
    const distXZ = Math.sqrt(dx * dx + dz * dz);
    if (distXZ < minDistFox) {
        minDistFox = distXZ;
        nearestFox = fox;
    }
}
let minDistBerry = 3.5;

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
    interactionDiv.innerHTML = ""; 
    document.body.appendChild(interactionDiv);
}
createInteractionUI();

const messageDiv = document.createElement('div');
messageDiv.id = 'message-ui';
messageDiv.style.position = 'absolute';
messageDiv.style.top = '80px'; 
messageDiv.style.left = '50%';
messageDiv.style.transform = 'translateX(-50%)';
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
    const pigs = [];
    scene.traverse(obj => {
        if (obj.name && obj.name.startsWith('Pig_') && obj.type === 'Group') {
            pigs.push(obj);
        }
    });
    return pigs;
}

function getRabbitMeshes() {
    const rabbits = [];
    scene.traverse(obj => {
        if (obj.name && obj.name.startsWith('Rabbit_') && obj.type === 'Group') {
            rabbits.push(obj);
        }
    });
    return rabbits;
}

function getFoxMeshes() {
    if (!scene) return [];
    const foxes = [];
    scene.traverse(obj => {
        if (obj.name && obj.name.startsWith('Fox_') && obj.type === 'Group') {
            foxes.push(obj);
        }
    });
    return foxes;
}

function getBerryMeshes() {
    const berries = [];
    scene.traverse(obj => {
        if (obj.name && obj.name.startsWith('Berry_')) {
            berries.push(obj);
        }
    });
    return berries;
}

let bgMusic = new Audio(bgMusicUrl);
bgMusic.loop = true;
bgMusic.volume = 0.5;

function playFoxSfx() {
    const sfx = new Audio(foxSfxUrl);
    sfx.volume = 0.7;
    sfx.play();
}
function playPigSfx() {
    const sfx = new Audio(pigSfxUrl);
    sfx.volume = 0.7;
    sfx.play();
}
function playRabbitSfx() {
    const sfx = new Audio(rabbitSfxUrl);
    sfx.volume = 0.7;
    sfx.play();
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
    if (foxMixers && foxMixers.length) foxMixers.forEach(mixer => mixer.update(delta));

    // --- INTERAÇÃO COM PORCOS E CENOURAS ---
    nearestPig = null;
    nearestCarrot = null;
    nearestRabbit = null;
    nearestBerry = null;
    let minDistPig = 3.5;      
    let minDistCarrot = 3.5;   
    let minDistRabbit = 3.5;   
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

        // Movimento circular
        if (rabbit.userData && rabbit.userData.radius) {
            rabbit.userData.angle += delta * rabbit.userData.speed;
            rabbit.position.x = rabbit.userData.centerX + Math.cos(rabbit.userData.angle) * rabbit.userData.radius - rabbit.parent.position.x;
            rabbit.position.z = rabbit.userData.centerZ + Math.sin(rabbit.userData.angle) * rabbit.userData.radius - rabbit.parent.position.z;
            const dx2 = -Math.sin(rabbit.userData.angle);
            const dz2 = Math.cos(rabbit.userData.angle);
            rabbit.rotation.y = Math.atan2(dx2, dz2);
        }
    }

    // Bagas
    const berries = getBerryMeshes();
    nearestBerry = null;
    let minDistBerry = 3.5;
    for (const berry of berries) {
        const berryWorldPos = new THREE.Vector3();
        berry.getWorldPosition(berryWorldPos);
        const dx = playerPos.x - berryWorldPos.x;
        const dz = playerPos.z - berryWorldPos.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        if (distXZ < minDistBerry) {
            minDistBerry = distXZ;
            nearestBerry = berry;
        }
    }

    // Raposas
    const foxes = getFoxMeshes();
    nearestFox = null;
    let minDistFox = 3.5;
    for (const fox of foxes) {
        const foxWorldPos = new THREE.Vector3();
        fox.getWorldPosition(foxWorldPos);
        const dx = playerPos.x - foxWorldPos.x;
        const dz = playerPos.z - foxWorldPos.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);
        if (distXZ < minDistFox) {
            minDistFox = distXZ;
            nearestFox = fox;
        }
    }

    // Mostrar UI de interação
    if (nearestCarrot) {
        interactionDiv.innerHTML = "<b>E</b> para apanhar cenoura";
        interactionDiv.style.display = 'block';
    } else if (nearestBerry) {
        interactionDiv.innerHTML = "<b>E</b> para apanhar baga";
        interactionDiv.style.display = 'block';
    } else if (nearestPig && foodCount > 0) {
        interactionDiv.innerHTML = "<b>E</b> para alimentar porco";
        interactionDiv.style.display = 'block';
    } else if (nearestRabbit && foodCount > 0) {
        interactionDiv.innerHTML = "<b>E</b> para alimentar coelho";
        interactionDiv.style.display = 'block';
    } else if (nearestFox && berryCount > 0) {
        interactionDiv.innerHTML = "<b>E</b> para alimentar raposa";
        interactionDiv.style.display = 'block';
    } else {
        interactionDiv.style.display = 'none';
    }

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
            if (nearestCarrot.parent) nearestCarrot.parent.remove(nearestCarrot);
            const idx = carrots.indexOf(nearestCarrot);
            if (idx !== -1) carrots.splice(idx, 1);
            foodCount++;
            updateFoodUI();
            showMessage('Apanhaste uma cenoura!');
        } else if (nearestBerry) {
            if (nearestBerry.parent) nearestBerry.parent.remove(nearestBerry);
            berryCount++;
            updateBerryUI();
            showMessage('Apanhaste uma baga!');
        } else if (nearestPig && foodCount > 0) {
            foodCount--;
            updateFoodUI();
            showMessage('Porco alimentado');
            playPigSfx();
            const pig = nearestPig;
            const originalY = pig.position.y;
            pig.position.y = originalY + 1;
            setTimeout(() => { pig.position.y = originalY; }, 400);
            showHeartAbove(nearestPig);
        } else if (nearestRabbit && foodCount > 0) {
            foodCount--;
            updateFoodUI();
            showMessage('Coelho alimentado!');
            playRabbitSfx();
            if (nearestRabbit.userData && nearestRabbit.userData.speed) {
                const rabbit = nearestRabbit;
                const originalSpeed = rabbit.userData.speed;
                rabbit.userData.speed = originalSpeed * 2.5;
                setTimeout(() => {
                    if (rabbit.userData) rabbit.userData.speed = originalSpeed;
                }, 4000);
            }
            showHeartAbove(nearestRabbit);
        } else {
            let nearestFox = null;
            let minDistFox = 3.5;
            const foxes = getFoxMeshes();
            const playerPos = controls.getCameraParent().position;
            for (const fox of foxes) {
                const foxWorldPos = new THREE.Vector3();
                fox.getWorldPosition(foxWorldPos);
                const dx = playerPos.x - foxWorldPos.x;
                const dz = playerPos.z - foxWorldPos.z;
                const distXZ = Math.sqrt(dx * dx + dz * dz);
                if (distXZ < minDistFox) {
                    minDistFox = distXZ;
                    nearestFox = fox;
                }
            }
            if (nearestFox && berryCount > 0 && minDistFox < 3.5) {
                berryCount--;
                updateBerryUI();
                showMessage('Raposa alimentada!');
                playFoxSfx();
                showHeartAbove(nearestFox);

                let spinProgress = 0;
                const spinDuration = 600;
                const initialY = nearestFox.rotation.y;
                function doSpin() {
                    spinProgress += 16;
                    nearestFox.rotation.y = initialY + Math.PI * 2 * (spinProgress / spinDuration);
                    if (spinProgress < spinDuration) {
                        requestAnimationFrame(doSpin);
                    } else {
                        nearestFox.rotation.y = initialY;
                    }
                }
                doSpin();
            }
        }
    }
    if (event.code === 'KeyR') {
        toggleWeather();
    }
});

// --- MENU POPUP DE INSTRUÇÕES ---
const helpDiv = document.createElement('div');
helpDiv.id = 'help-popup';
helpDiv.style.position = 'absolute';
helpDiv.style.top = '50%';
helpDiv.style.left = '50%';
helpDiv.style.transform = 'translate(-50%, -50%)';
helpDiv.style.background = 'rgba(0,0,0,0.92)';
helpDiv.style.color = '#fff';
helpDiv.style.padding = '32px 40px';
helpDiv.style.fontSize = '20px';
helpDiv.style.borderRadius = '16px';
helpDiv.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
helpDiv.style.zIndex = 100;
helpDiv.style.textAlign = 'center';
helpDiv.style.maxWidth = '90vw';
helpDiv.style.display = 'block';

helpDiv.innerHTML = `
    <h2 style="margin-top:0">Bem-vindo à Floresta Interativa! 🌲</h2>
    <ul style="text-align:left; margin: 20px auto 20px auto; max-width: 400px;">
        <li><b>WASD</b> para mover</li>
        <li><b>Rato</b> para olhar em volta</li>
        <li><b>E</b> para interagir:</li>
        <ul>
            <li>Apanhar <b>cenouras</b> (<span style="color:orange">🥕</span>) e alimentar <b>porcos</b> ou <b>coelhos</b></li>
            <li>Apanhar <b>bagas</b> (<span style="color:#b9001f">🍒</span>) e alimentar <b>raposas</b></li>
        </ul>
        <li><b>R</b> para mudar o clima</li>
        <li><b>H</b> para abrir/fechar este menu</li>
        <li><b>Chunks +/-</b> para ajustar o alcance do mundo (menos = mais leve para PC fraco)</li>
    </ul>
    <div style="margin-top:16px;">
        <span>Chunks ativos: </span>
        <button id="help-range-dec" style="margin-right:5px;">-</button>
        <span id="help-range-value">${visibleRange}</span>
        <button id="help-range-inc" style="margin-left:5px;">+</button>
    </div>
    <div style="margin-top:20px;">
        <button id="close-help-btn" style="padding:10px 24px; font-size:18px; border-radius:8px; border:none; cursor:pointer;">Fechar</button>
    </div>
`;
document.body.appendChild(helpDiv);

// Botão para fechar o menu
document.getElementById('close-help-btn').onclick = () => {
    helpDiv.style.display = 'none';
    if (bgMusic.paused) bgMusic.play();
};

// Atalho para abrir/fechar o menu com 'H'
window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyH') {
        const wasVisible = helpDiv.style.display !== 'none';
        helpDiv.style.display = wasVisible ? 'none' : 'block';
        if (wasVisible && bgMusic.paused) {
            bgMusic.play();
        }
    }
});

// Sincronizar range do menu com o jogo
document.getElementById('help-range-dec').onclick = () => {
    if (visibleRange > 1) {
        visibleRange--;
        document.getElementById('help-range-value').innerText = visibleRange;
        document.getElementById('range-value').innerText = visibleRange;
        updateChunks();
    }
};
document.getElementById('help-range-inc').onclick = () => {
    if (visibleRange < 4) {
        visibleRange++;
        document.getElementById('help-range-value').innerText = visibleRange;
        document.getElementById('range-value').innerText = visibleRange;
        updateChunks();
    }
};

function showHeartAbove(object3D) {
    const heart = document.createElement('div');
    heart.innerText = '❤️';
    heart.style.position = 'absolute';
    heart.style.fontSize = '36px';
    heart.style.pointerEvents = 'none';
    heart.style.transition = 'opacity 0.3s';
    heart.style.opacity = '1';
    heart.style.zIndex = 200;

    document.body.appendChild(heart);

    // Atualiza a posição do coração durante 1 segundo
    let elapsed = 0;
    const duration = 1000;
    function updateHeart() {
        if (!object3D.parent) {
            heart.remove();
            return;
        }
        // Converter posição 3D para 2D
        const pos = object3D.position.clone();
        object3D.getWorldPosition(pos);
        pos.y += 2; // Ajusta altura acima do animal

        // Projeta para coordenadas de ecrã
        const vector = pos.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (1 - (vector.y * 0.5 + 0.5)) * window.innerHeight;

        heart.style.left = `${x - 18}px`;
        heart.style.top = `${y - 48}px`;

        elapsed += 16;
        if (elapsed < duration) {
            requestAnimationFrame(updateHeart);
        } else {
            heart.style.opacity = '0';
            setTimeout(() => heart.remove(), 300);
        }
    }
    updateHeart();
}

init();
animate();