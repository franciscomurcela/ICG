import * as THREE from 'three';
import { createTree, createRock, createRealisticGrassPatch} from '../utils/helpers';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Importar texturas diretamente
import grassTexture from '../assets/textures/grass.jpg';
import backgroundTexture from '../assets/textures/background.jpg'; // Importar a imagem de fundo
import grassBladeTexture from '../assets/textures/grass-blade.png'; // Textura de relva com transparência
import rainyTexture from '../assets/textures/rainy.jpg'; // Importar o background para chuva
import snowTexture from '../assets/textures/snow.jpg'; // Importar textura de neve
import pigGLBUrl from '../assets/models/pig.glb';
import rabbitGLBUrl from '../assets/models/rabbit.glb';
import foxGLBUrl from '../assets/models/fox.glb';

let isDay = true;
let sun; 
let stars; 
let moon; 
let moonShadow; 
let currentWeather = 'clear'; 
let rabbitMixer = null;
let rabbit = null;
let rabbitAngle = 0; 
let rainParticles = null;
let snowParticles = null;
let carrots = []; 

let weatherIndex = 0;
const weatherStates = ['day', 'night', 'rain', 'snow'];

function toggleDayNight(scene, ambientLight, directionalLight, backgroundDay, backgroundNight) {
    isDay = !isDay;

    if (isDay) {
        ambientLight.intensity = 0.5;
        directionalLight.intensity = 1.5;
        directionalLight.color.set(0xffffff); 
        directionalLight.castShadow = true; 
        scene.background = backgroundDay; 
        sun.visible = true;
        moon.visible = false;
        moonShadow.visible = false;
        stars.visible = false;
    } else {
        ambientLight.intensity = 0.2;
        directionalLight.intensity = 0.3; 
        directionalLight.color.set(0x87CEEB); 
        directionalLight.castShadow = false; 
        scene.background = backgroundNight; 
        sun.visible = false;
        moon.visible = true;
        moonShadow.visible = true;
        stars.visible = true;
    }
}

function setTerrainTexture(isSnow) {
    for (const chunkGroup of chunks.values()) {
        chunkGroup.children.forEach(obj => {
            if (
                obj.isMesh &&
                obj.geometry &&
                obj.geometry.type === 'PlaneGeometry' &&
                obj.material && obj.material.type === 'MeshStandardMaterial'
            ) {
                obj.material.map = isSnow ? snowTerrainTexture : terrainTexture;
                obj.material.needsUpdate = true;
            }
        });
    }
}

function setWeather(state, scene, ambientLight, directionalLight, backgroundDay, backgroundNight, backgroundRainy) {
    currentWeather = state; 
    if (rainParticles) scene.remove(rainParticles);
    if (snowParticles) scene.remove(snowParticles);

    switch (state) {
        case 'day':
            isDay = true;
            ambientLight.intensity = 0.5;
            directionalLight.intensity = 1.5;
            directionalLight.color.set(0xffffff);
            directionalLight.castShadow = true;
            scene.background = backgroundDay;
            sun.visible = true;
            moon.visible = false;
            moonShadow.visible = false;
            stars.visible = false;
            setTerrainTexture(false);
            setSnowOnScene(false);
            break;
        case 'night':
            isDay = false;
            ambientLight.intensity = 0.2;
            directionalLight.intensity = 0.3;
            directionalLight.color.set(0x87CEEB);
            directionalLight.castShadow = false;
            scene.background = backgroundNight;
            sun.visible = false;
            moon.visible = true;
            moonShadow.visible = true;
            stars.visible = true;
            setTerrainTexture(false);
            setSnowOnScene(false);
            break;
        case 'rain':
            ambientLight.intensity = 0.2;
            directionalLight.intensity = 0.3;
            directionalLight.color.set(0xffffff);
            directionalLight.castShadow = false;
            scene.background = backgroundRainy;
            sun.visible = false;
            moon.visible = false;
            moonShadow.visible = false;
            stars.visible = false;
            if (!rainParticles) rainParticles = createRainParticles();
            scene.add(rainParticles);
            setTerrainTexture(false);
            setSnowOnScene(false);
            break;
        case 'snow':
            ambientLight.intensity = 0.2;
            directionalLight.intensity = 0.3;
            directionalLight.color.set(0xffffff);
            directionalLight.castShadow = false;
            scene.background = backgroundRainy;
            sun.visible = false;
            moon.visible = false;
            moonShadow.visible = false;
            stars.visible = false;
            if (!snowParticles) snowParticles = createSnowParticles();
            scene.add(snowParticles);
            setTerrainTexture(true);
            setSnowOnScene(true);
            break;
        default:
            setTerrainTexture(false);
            setSnowOnScene(false);
            break;
    }
}

function nextWeather(scene, ambientLight, directionalLight, backgroundDay, backgroundNight, backgroundRainy) {
    weatherIndex = (weatherIndex + 1) % weatherStates.length;
    setWeather(weatherStates[weatherIndex], scene, ambientLight, directionalLight, backgroundDay, backgroundNight, backgroundRainy);
}

function createStars() {
    const starCount = 500;
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1, 
        sizeAttenuation: true, 
    });

    // Gerar posições aleatórias para as estrelas
    const positions = [];
    for (let i = 0; i < starCount; i++) {
        const x = Math.random() * 2000 - 1000; 
        const y = Math.random() * 1000 + 500; 
        const z = Math.random() * 2000 - 1000;
        positions.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.visible = false;
    return stars;
}

function createRainParticles() {
    const rainCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < rainCount; i++) {
        positions.push(
            Math.random() * 1000 - 500,
            Math.random() * 20 + 5,     
            Math.random() * 1000 - 500  
        );
        velocities.push(0, -Math.random() * 2.5 - 2.5, 0); 
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
        color: 0xaaaaee,
        size: 0.8,
        transparent: true,
        opacity: 0.7
    });

    return new THREE.Points(geometry, material);
}

function createCarrot(position) {
    const carrotGroup = new THREE.Group();

    const bodyGeometry = new THREE.ConeGeometry(0.15, 0.5, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI;

    const isBuried = Math.random() < 0.5;

    // Folhas (cilindros verdes)
    const leafGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.y = isBuried ? 0.35 : 0.55;
        leaf.rotation.z = Math.PI / 6 * (i - 1);
        carrotGroup.add(leaf);
    }

    if (isBuried) {
        body.position.y = 0;
        carrotGroup.position.y = 0;
    } else {
        body.position.y = 0.25;
        carrotGroup.rotation.z = Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
        carrotGroup.rotation.x = (Math.random() - 0.5) * 0.3;
        carrotGroup.position.y = 0.05;
    }

    carrotGroup.add(body);
    carrotGroup.position.add(position);
    carrotGroup.name = 'Carrot_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    return carrotGroup;
}


function createSnowParticles() {
    const snowCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < snowCount; i++) {
        positions.push(
            Math.random() * 60 - 30,
            Math.random() * 40 + 10,
            Math.random() * 60 - 30  
        );
        velocities.push(
            (Math.random() - 0.5) * 0.1,
            -Math.random() * 0.5 - 0.2,
            (Math.random() - 0.5) * 0.1
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        transparent: true,
        opacity: 0.8
    });

    return new THREE.Points(geometry, material);
}

function setSnowOnScene(enable) {
    for (const chunkGroup of chunks.values()) {
        chunkGroup.children.forEach(obj => {
            if (obj.type === 'Group') {
                obj.children.forEach(child => {
                    if (
                        child.isMesh &&
                        child.geometry &&
                        child.geometry.type === 'ConeGeometry' &&
                        child.material && child.material.type === 'MeshStandardMaterial'
                    ) {
                        if (enable) {
                            child.material.color.set(0xffffff);
                        } else {
                            child.material.color.set(0x228B22);
                        }
                        child.material.needsUpdate = true;
                    }
                });
            }
        });
    }
}

let terrainTexture;
let snowTerrainTexture;
let treeColliders = []; 
let chunks = new Map();

let pigGLTF = null;
let pigMixers = [];

// Carrega o modelo do porco uma vez
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    pigGLBUrl,
    (gltf) => {
        pigGLTF = gltf;
        for (const chunkGroup of chunks.values()) {
            spawnPigInChunk(chunkGroup);
        }
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar o porco:', error);
    }
);

// Função para spawnar porco num chunk (com animação)
function spawnPigInChunk(chunkGroup) {
    if (pigGLTF && pigGLTF.scene && Math.random() < 0.5) {
        const chunkSize = 50;
        const pig = clone(pigGLTF.scene);
        pig.position.set(
            Math.random() * chunkSize - chunkSize / 2,
            -0.1, 
            Math.random() * chunkSize - chunkSize / 2
        );
        pig.scale.set(0.1, 0.1, 0.1);
        pig.rotation.y = Math.random() * Math.PI * 2;
        pig.name = 'Pig_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        chunkGroup.add(pig);

        if (pigGLTF.animations && pigGLTF.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(pig);
            const action = mixer.clipAction(pigGLTF.animations[0]);
            action.play();
            action.timeScale = 7;
            pigMixers.push(mixer);
        }
    }
}

let rabbitGLTF = null;
let rabbitMixers = [];
let rabbits = []; 

// Carrega o modelo do coelho uma vez
const rabbitLoader = new GLTFLoader();
rabbitLoader.load(
    rabbitGLBUrl,
    (gltf) => {
        rabbitGLTF = gltf;
        // Faz spawn de coelhos em todos os chunks existentes
        for (const chunkGroup of chunks.values()) {
            spawnRabbitInChunk(chunkGroup);
        }
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar o coelho:', error);
    }
);

// Função para spawnar coelho num chunk (com animação)
function spawnRabbitInChunk(chunkGroup) {
    if (rabbitGLTF && rabbitGLTF.scene && Math.random() < 0.5) {
        const chunkSize = 50;
        const rabbit = clone(rabbitGLTF.scene);

        // Dados para movimento circular
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.5 + Math.random() * 10;
        const centerX = Math.random() * chunkSize - chunkSize / 2;
        const centerZ = Math.random() * chunkSize - chunkSize / 2;
        const speed = 0.5 + Math.random() * 0.5;

        // Guardar dados no próprio mesh
        rabbit.userData = {
            angle,
            radius,
            centerX: centerX + chunkGroup.position.x,
            centerZ: centerZ + chunkGroup.position.z,
            speed
        };

        rabbit.position.set(
            rabbit.userData.centerX + Math.cos(angle) * radius - chunkGroup.position.x,
            0,
            rabbit.userData.centerZ + Math.sin(angle) * radius - chunkGroup.position.z
        );
        rabbit.scale.set(0.05, 0.05, 0.05);
        rabbit.rotation.y = Math.random() * Math.PI * 2;
        rabbit.name = 'Rabbit_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        chunkGroup.add(rabbit);

        if (rabbitGLTF.animations && rabbitGLTF.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(rabbit);
            const action = mixer.clipAction(rabbitGLTF.animations[0]);
            action.play();
            action.timeScale = 1.5;
            rabbitMixers.push(mixer);
        }
    }
}

let foxGLTF = null;
let foxMixers = [];

const foxLoader = new GLTFLoader();
foxLoader.load(
    foxGLBUrl,
    (gltf) => {
        foxGLTF = gltf;
        // Faz spawn de raposas em todos os chunks existentes
        for (const chunkGroup of chunks.values()) {
            spawnFoxInChunk(chunkGroup);
        }
    },
    undefined,
    (error) => {
        console.error('Erro ao carregar a raposa:', error);
    }
);

// Função para spawnar raposa num chunk (com animação)
function spawnFoxInChunk(chunkGroup) {
    if (foxGLTF && foxGLTF.scene && Math.random() < 0.5) {
        const chunkSize = 50;
        const fox = clone(foxGLTF.scene);
        fox.position.set(
            Math.random() * chunkSize - chunkSize / 2,
            +0.1,
            Math.random() * chunkSize - chunkSize / 2
        );
        fox.scale.set(3.5, 3.5, 3.5);
        fox.rotation.y = Math.random() * Math.PI * 2;
        fox.name = 'Fox_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        chunkGroup.add(fox);

        if (foxGLTF.animations && foxGLTF.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(fox);
            const action = mixer.clipAction(foxGLTF.animations[0]);
            action.play();
            action.timeScale = 1;
            foxMixers.push(mixer);
        }
    }
}

function createBerry(position) {
    const berryGroup = new THREE.Group();

    const berryGeometry = new THREE.SphereGeometry(0.09, 16, 16);
    const berryMaterial = new THREE.MeshStandardMaterial({ color: 0xb9001f });
    // Cria 3-5 bagas agrupadas
    const berryCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < berryCount; i++) {
        const berry = new THREE.Mesh(berryGeometry, berryMaterial);
        berry.position.set(
            (Math.random() - 0.5) * 0.18,
            0.09 + Math.random() * 0.05,
            (Math.random() - 0.5) * 0.18
        );
        berryGroup.add(berry);
    }

    const stemGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.18;
    berryGroup.add(stem);

    berryGroup.position.add(position);
    berryGroup.name = 'Berry_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    return berryGroup;
}

export function createForestScene() {
    const scene = new THREE.Scene();

    // Loading manager
    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);

    loadingManager.onLoad = () => {
        console.log('All textures loaded');
    };

    // Backgrounds para dia, noite e chuva
    const backgroundDay = textureLoader.load(backgroundTexture);
    const backgroundNight = new THREE.Color(0x000022);
    const backgroundRainy = textureLoader.load(rainyTexture);
    scene.background = backgroundDay;

    terrainTexture = textureLoader.load(grassTexture);
    terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(50, 50);

    
    snowTerrainTexture = textureLoader.load(snowTexture);
    snowTerrainTexture.wrapS = snowTerrainTexture.wrapT = THREE.RepeatWrapping;
    snowTerrainTexture.repeat.set(50, 50);

    // Criar luz ambiente
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Luz ambiente inicial
    scene.add(ambientLight);

    // Criar luz direcional
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(500, 1000, 500); // Posicionar a luz
    directionalLight.castShadow = true; // Habilitar projeção de sombras
    directionalLight.shadow.mapSize.width = 1024; // Aumentar resolução do mapa de sombras
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 2000;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    scene.add(directionalLight);

    // Criar o sol
    const sunGeometry = new THREE.SphereGeometry(50, 32, 32); 
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        depthTest: false,
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(500, 1000, 500); 
    sun.frustumCulled = false;
    scene.add(sun);

    // Criar a lua cheia
    const moonGeometry = new THREE.SphereGeometry(30, 32, 32); 
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, 
        depthTest: false, 
    });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(500, 1000, 500); 
    moon.frustumCulled = false; 
    moon.visible = false; 
    scene.add(moon);

    // Criar a sombra para simular a fase da lua
    const shadowGeometry = new THREE.SphereGeometry(30.5, 32, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, 
        depthTest: false, 
    });
    moonShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    moonShadow.position.set(520, 1040, 500); 
    moonShadow.frustumCulled = false; 
    moonShadow.visible = false;
    scene.add(moonShadow);

    // Criar estrelas
    stars = createStars();
    scene.add(stars);

    // Chunks de terreno
    const chunkSize = 50; 

    const treePositions = new Set(); // Rastrear posições das árvores

    function createChunk(x, z) {
        const chunkKey = `${x},${z}`;
        if (chunks.has(chunkKey)) return; // Não recriar chunks já existentes

        // Criar um grupo para o chunk
        const chunkGroup = new THREE.Group();
        chunkGroup.name = `chunk_${chunkKey}`; 
        chunkGroup.position.set(x * chunkSize, 0, z * chunkSize);

        // Criar o terreno
        const terrainGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 10, 10);
        const terrainMaterial = new THREE.MeshStandardMaterial({
            map: terrainTexture,
            roughness: 1,
            metalness: 0,
        });
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        chunkGroup.add(terrain);

        // Adicionar relva realista ao chunk
        const grassPatch = createRealisticGrassPatch(
            new THREE.Vector3(0, 0, 0), 
            chunkSize,
            100,
            new THREE.TextureLoader().load(grassBladeTexture)
        );
        chunkGroup.add(grassPatch);

        // Adicionar árvores ao chunk
        for (let i = 0; i < 8; i++) {
            let position;
            let attempts = 0;

            do {
                position = new THREE.Vector3(
                    Math.random() * chunkSize - chunkSize / 2,
                    0,
                    Math.random() * chunkSize - chunkSize / 2
                );
                attempts++;
            } while (treePositions.has(`${Math.round(position.x + x * chunkSize)},${Math.round(position.z + z * chunkSize)}`) && attempts < 10);

            if (attempts < 10) {
                treePositions.add(`${Math.round(position.x + x * chunkSize)},${Math.round(position.z + z * chunkSize)}`);
                const tree = createTree(position, Math.random() * 0.5 + 1.5);
                chunkGroup.add(tree);
                // Adiciona collider (posição absoluta, raio aproximado)
                treeColliders.push({
                    position: new THREE.Vector3(
                        position.x + chunkGroup.position.x,
                        0,
                        position.z + chunkGroup.position.z
                    ),
                    radius: 1.2
                });
            }
        }

        // Adicionar pedras ao chunk
        for (let i = 0; i < 5; i++) {
            const position = new THREE.Vector3(
                Math.random() * chunkSize - chunkSize / 2,
                0,
                Math.random() * chunkSize - chunkSize / 2
            );
            const rock = createRock(position, Math.random() * 0.5 + 0.2);
            chunkGroup.add(rock);
        }

        // Adicionar cenouras colecionáveis ao chunk
        for (let i = 0; i < 2; i++) { 
            const pos = new THREE.Vector3(
                Math.random() * chunkSize - chunkSize / 2,
                0,
                Math.random() * chunkSize - chunkSize / 2
            );
            const carrot = createCarrot(pos);
            chunkGroup.add(carrot);
            carrots.push(carrot);
        }

        // Adicionar bagas colecionáveis ao chunk
        for (let i = 0; i < 2; i++) { 
            const pos = new THREE.Vector3(
                Math.random() * chunkSize - chunkSize / 2,
                0,
                Math.random() * chunkSize - chunkSize / 2
            );
            const berry = createBerry(pos);
            chunkGroup.add(berry);
        }

        // Adicionar o grupo do chunk à cena
        scene.add(chunkGroup);
        chunks.set(chunkKey, chunkGroup);

        spawnPigInChunk(chunkGroup);
        spawnRabbitInChunk(chunkGroup);
        spawnFoxInChunk(chunkGroup);

        // Atualizar folhas e chão do chunk se estiver a nevar
        if (currentWeather === 'snow') {
            // Folhas brancas
            chunkGroup.children.forEach(obj => {
                if (obj.type === 'Group') {
                    obj.children.forEach(child => {
                        if (
                            child.isMesh &&
                            child.geometry &&
                            child.geometry.type === 'ConeGeometry' &&
                            child.material && child.material.type === 'MeshStandardMaterial'
                        ) {
                            child.material.color.set(0xffffff);
                            child.material.needsUpdate = true;
                        }
                    });
                }
                // Chão com textura de neve
                if (
                    obj.isMesh &&
                    obj.geometry &&
                    obj.geometry.type === 'PlaneGeometry' &&
                    obj.material && obj.material.type === 'MeshStandardMaterial'
                ) {
                    obj.material.map = snowTerrainTexture;
                    obj.material.needsUpdate = true;
                }
            });
        }
    }

    return {
        scene,
        createChunk,
        chunkSize,
        chunks,
        toggleDayNight: () => toggleDayNight(scene, ambientLight, directionalLight, backgroundDay, backgroundNight),
        toggleWeather: () => nextWeather(scene, ambientLight, directionalLight, backgroundDay, backgroundNight, backgroundRainy),
    };
}

export {
    rabbitMixer, rabbit, rabbitAngle, rainParticles, snowParticles,
    treeColliders, pigMixers, rabbitMixers, rabbits, carrots,
    spawnPigInChunk, spawnRabbitInChunk, rabbitGLTF,
    foxGLTF, foxMixers, spawnFoxInChunk
};