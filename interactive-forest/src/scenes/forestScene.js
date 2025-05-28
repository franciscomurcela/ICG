import * as THREE from 'three';
import { createTree, createRock, createRealisticGrassPatch } from '../utils/helpers';
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

let isDay = true; // Estado inicial: dia
let sun; // Variável para armazenar o sol
let stars; // Variável para armazenar as estrelas
let moon; // Variável para armazenar a lua
let moonShadow; // Variável para armazenar a sombra da lua
let currentWeather = 'clear'; // Estado inicial do clima
let rabbitMixer = null;
let rabbit = null; // <-- Adiciona esta linha
let rabbitAngle = 0; // Ângulo para o movimento circular
let rainParticles = null;
let snowParticles = null;

// Estados possíveis: 'day', 'night', 'rain', 'snow'
let weatherIndex = 0;
const weatherStates = ['day', 'night', 'rain', 'snow'];

function toggleDayNight(scene, ambientLight, directionalLight, backgroundDay, backgroundNight) {
    isDay = !isDay;

    if (isDay) {
        // Configurações para o dia
        ambientLight.intensity = 0.5;
        directionalLight.intensity = 1.5; // Luz mais intensa para o dia
        directionalLight.color.set(0xffffff); // Luz branca para o dia
        directionalLight.castShadow = true; // Habilitar sombras
        scene.background = backgroundDay; // Fundo diurno
        sun.visible = true; // Mostrar o sol
        moon.visible = false; // Ocultar a lua
        moonShadow.visible = false; // Ocultar a sombra da lua
        stars.visible = false; // Ocultar as estrelas
    } else {
        // Configurações para a noite
        ambientLight.intensity = 0.2;
        directionalLight.intensity = 0.3; // Intensidade mais baixa para a noite
        directionalLight.color.set(0x87CEEB); // Cor azul clara para a luz da lua
        directionalLight.castShadow = false; // Desativar sombras para suavizar o efeito
        scene.background = backgroundNight; // Fundo noturno
        sun.visible = false; // Ocultar o sol
        moon.visible = true; // Mostrar a lua
        moonShadow.visible = true; // Mostrar a sombra da lua
        stars.visible = true; // Mostrar as estrelas
    }
}

function setTerrainTexture(isSnow) {
    for (const chunkGroup of chunks.values()) {
        chunkGroup.children.forEach(obj => {
            // Terreno (PlaneGeometry)
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
    currentWeather = state; // <-- Adiciona isto!
    // Remove partículas de chuva/neve sempre que muda de clima
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
    const starCount = 500; // Número de estrelas
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff, // Cor branca para as estrelas
        size: 1, // Tamanho das estrelas
        sizeAttenuation: true, // Permitir que o tamanho diminua com a distância
    });

    // Gerar posições aleatórias para as estrelas
    const positions = [];
    for (let i = 0; i < starCount; i++) {
        const x = Math.random() * 2000 - 1000; // Posição aleatória no eixo X
        const y = Math.random() * 1000 + 500; // Posição aleatória no eixo Y (acima do horizonte)
        const z = Math.random() * 2000 - 1000; // Posição aleatória no eixo Z
        positions.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.visible = false; // Inicialmente invisível (apenas visível à noite)
    return stars;
}

function createRainParticles() {
    const rainCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    // Área ampla (como antes), mas mais baixa (Y: 5 a 25)
    for (let i = 0; i < rainCount; i++) {
        positions.push(
            Math.random() * 1000 - 500, // X: -500 a 500 (área grande)
            Math.random() * 20 + 5,     // Y: 5 a 25 (mais baixo)
            Math.random() * 1000 - 500  // Z: -500 a 500 (área grande)
        );
        velocities.push(0, -Math.random() * 2.5 - 2.5, 0); // velocidade Y negativa, mais rápida
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

function createSnowParticles() {
    const snowCount = 100; // Menos partículas para neve menos condensada
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    // Área menor e mais baixa (centrada no utilizador)
    for (let i = 0; i < snowCount; i++) {
        positions.push(
            Math.random() * 60 - 30, // X: -30 a 30
            Math.random() * 40 + 10, // Y: 10 a 50 (mais baixo)
            Math.random() * 60 - 30  // Z: -30 a 30
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
            // Árvores (Group com cones)
            if (obj.type === 'Group') {
                obj.children.forEach(child => {
                    // Folhas das árvores (ConeGeometry)
                    if (
                        child.isMesh &&
                        child.geometry &&
                        child.geometry.type === 'ConeGeometry' &&
                        child.material && child.material.type === 'MeshStandardMaterial'
                    ) {
                        if (enable) {
                            child.material.color.set(0xffffff); // branco neve
                        } else {
                            child.material.color.set(0x228B22); // verde original
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
let treeColliders = []; // Adiciona no topo do ficheiro
let chunks = new Map(); // Torna global

// Guarda o GLTF carregado
let pigGLTF = null;
let pigMixers = []; // <-- Adicione isto

// Carrega o modelo do porco uma vez
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    pigGLBUrl,
    (gltf) => {
        pigGLTF = gltf;
        // SPAWN retroativo em todos os chunks já criados
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
            -0.1, // <-- Ajuste aqui para garantir que os pés tocam o solo
            Math.random() * chunkSize - chunkSize / 2
        );
        pig.scale.set(0.1, 0.1, 0.1);
        pig.rotation.y = Math.random() * Math.PI * 2;
        pig.name = 'Pig_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        chunkGroup.add(pig);

        // Adicionar animação se houver
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
let rabbits = []; // <-- Array para guardar os coelhos e seus dados de movimento

// Carrega o modelo do coelho uma vez
const rabbitLoader = new GLTFLoader();
rabbitLoader.load(
    rabbitGLBUrl,
    (gltf) => {
        rabbitGLTF = gltf;
        // SPAWN retroativo em todos os chunks já criados
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
        const rabbitInstance = clone(rabbitGLTF.scene);
        // Parâmetros de movimento aleatórios
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 10;
        const centerX = Math.random() * chunkSize - chunkSize / 2;
        const centerZ = Math.random() * chunkSize - chunkSize / 2;

        // Posição inicial
        rabbitInstance.position.set(
            centerX + Math.cos(angle) * radius,
            0,
            centerZ + Math.sin(angle) * radius
        );
        rabbitInstance.scale.set(0.05, 0.05, 0.05);
        rabbitInstance.rotation.y = Math.random() * Math.PI * 2;
        rabbitInstance.name = 'Rabbit_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        chunkGroup.add(rabbitInstance);

        // Adicionar animação se houver
        if (rabbitGLTF.animations && rabbitGLTF.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(rabbitInstance);
            const action = mixer.clipAction(rabbitGLTF.animations[0]);
            action.play();
            action.timeScale = 1.5;
            rabbitMixers.push(mixer);
        }

        // Guardar referência para movimento
        rabbits.push({
            mesh: rabbitInstance,
            angle,
            radius,
            centerX: centerX + chunkGroup.position.x,
            centerZ: centerZ + chunkGroup.position.z,
            speed: 0.5 + Math.random() * 0.5 // velocidade aleatória
        });
    }
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

    // Terrain texture (agora global)
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
    const sunGeometry = new THREE.SphereGeometry(50, 32, 32); // Esfera para o sol
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00, // Cor amarela
        depthTest: false, // Ignorar o teste de profundidade para sempre renderizar o sol
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(500, 1000, 500); // Posicionar o sol no céu
    sun.frustumCulled = false; // Desativar frustum culling para o sol
    scene.add(sun);

    // Criar a lua cheia
    const moonGeometry = new THREE.SphereGeometry(30, 32, 32); // Esfera para a lua
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // Cor cinza claro
        depthTest: false, // Ignorar o teste de profundidade para sempre renderizar a lua
    });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(500, 1000, 500); // Posicionar a lua no céu
    moon.frustumCulled = false; // Desativar frustum culling para a lua
    moon.visible = false; // Inicialmente invisível (apenas visível à noite)
    scene.add(moon);

    // Criar a sombra para simular a fase da lua
    const shadowGeometry = new THREE.SphereGeometry(30.5, 32, 32); // Esfera ligeiramente maior para a sombra
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, // Cor preta para a sombra
        depthTest: false, // Ignorar o teste de profundidade para sempre renderizar a sombra
    });
    moonShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    moonShadow.position.set(520, 1040, 500); // Ajustar a posição da sombra para criar a fase minguante
    moonShadow.frustumCulled = false; // Desativar frustum culling para a sombra
    moonShadow.visible = false; // Inicialmente invisível (apenas visível à noite)
    scene.add(moonShadow);

    // Criar estrelas
    stars = createStars();
    scene.add(stars);

    // Chunks de terreno
    const chunkSize = 50; // Reduzir o tamanho do chunk para testar geração dinâmica

    const treePositions = new Set(); // Rastrear posições das árvores

    function createChunk(x, z) {
        const chunkKey = `${x},${z}`;
        if (chunks.has(chunkKey)) return; // Não recriar chunks já existentes

        // Criar um grupo para o chunk
        const chunkGroup = new THREE.Group();
        chunkGroup.name = `chunk_${chunkKey}`; // Nome para facilitar o debug
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
            new THREE.Vector3(0, 0, 0), // Relativo ao grupo
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
                    radius: 1.2 // Ajusta conforme o tamanho do tronco
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

        // Adicionar o grupo do chunk à cena
        scene.add(chunkGroup);
        chunks.set(chunkKey, chunkGroup);

        // SPAWN DO PORCO: só se o modelo já estiver carregado
        spawnPigInChunk(chunkGroup);
        spawnRabbitInChunk(chunkGroup);

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

// Exporte apenas o necessário, sem mixers ou animações do porco
export { rabbitMixer, rabbit, rabbitAngle, rainParticles, snowParticles, treeColliders, pigMixers, rabbitMixers, rabbits };