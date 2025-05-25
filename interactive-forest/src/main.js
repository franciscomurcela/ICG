import * as THREE from 'three';
import { createForestScene, rabbitMixer, rabbit, rainParticles, snowParticles, pigMixers } from './scenes/forestScene';
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
}

let rabbitAngle = 0; // Ângulo para o movimento circular

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    controls.update(delta);

    if (rabbitMixer) rabbitMixer.update(delta);

    // Atualizar animações dos porcos
    if (pigMixers && pigMixers.length) {
        pigMixers.forEach(mixer => mixer.update(delta));
    }

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

init();
animate();