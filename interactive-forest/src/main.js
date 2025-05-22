import * as THREE from 'three';
import { createForestScene, pigMixer, rabbitMixer, rabbit, rainParticles, snowParticles } from './scenes/forestScene';
import { initControls } from './controls/firstPersonControls';

let scene, camera, renderer, controls, clock, createChunk, chunkSize, chunks, toggleDayNight;

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

    // Botão para alternar entre dia e noite
    const dayNightButton = document.createElement('button');
    dayNightButton.innerText = 'Toggle Day/Night';
    dayNightButton.style.position = 'absolute';
    dayNightButton.style.top = '10px';
    dayNightButton.style.right = '10px';
    dayNightButton.style.padding = '10px';
    dayNightButton.style.background = 'rgba(0, 0, 0, 0.5)';
    dayNightButton.style.color = 'white';
    dayNightButton.style.border = 'none';
    dayNightButton.style.borderRadius = '5px';
    dayNightButton.style.cursor = 'pointer';
    dayNightButton.addEventListener('click', () => {
        toggleDayNight();
    });
    document.body.appendChild(dayNightButton);

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

    // Remover chunks que estão fora do alcance
    for (const chunkKey of chunks.keys()) {
        if (!chunksToKeep.has(chunkKey)) {
            console.debug(`Removendo chunk: ${chunkKey}`);
            const chunkGroup = chunks.get(chunkKey);
            scene.remove(chunkGroup); // Remove o grupo do chunk da cena
            chunks.delete(chunkKey); // Remove o chunk do mapa
            console.debug(`Chunk removido: ${chunkKey}`);
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
}

let rabbitAngle = 0; // Ângulo para o movimento circular

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    controls.update(delta);

    if (pigMixer) pigMixer.update(delta);
    if (rabbitMixer) rabbitMixer.update(delta);

    // Movimento circular do coelho
    if (rabbit) {
        rabbitAngle += delta * 1; // velocidade do círculo
        const radius = 3;
        const x = Math.cos(rabbitAngle) * radius;
        const z = Math.sin(rabbitAngle) * radius;
        rabbit.position.x = x;
        rabbit.position.z = z;

        // Virar o coelho na direção do movimento (tangente ao círculo)
        // Derivada: dx/dt = -sin, dz/dt = cos
        const dx = -Math.sin(rabbitAngle);
        const dz = Math.cos(rabbitAngle);
        rabbit.rotation.y = Math.atan2(dx, dz);
    }

    if (rainParticles && scene.children.includes(rainParticles)) {
        const pos = rainParticles.geometry.attributes.position;
        const vel = rainParticles.geometry.attributes.velocity;
        for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3 + 1] += vel.array[i * 3 + 1];
            if (pos.array[i * 3 + 1] < 0) {
                pos.array[i * 3 + 1] = Math.random() * 200 + 50;
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
                pos.array[i * 3 + 1] = Math.random() * 200 + 50;
                pos.array[i * 3 + 0] = Math.random() * 1000 - 500;
                pos.array[i * 3 + 2] = Math.random() * 1000 - 500;
            }
        }
        pos.needsUpdate = true;
    }

    updateChunks();
    renderer.render(scene, camera);
}

init();
animate();