import * as THREE from 'three';
import { createTree, createRock, createRealisticGrassPatch } from '../utils/helpers';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Importar texturas diretamente
import grassTexture from '../assets/textures/grass.jpg';
import backgroundTexture from '../assets/textures/background.jpg'; // Importar a imagem de fundo
import grassBladeTexture from '../assets/textures/grass-blade.png'; // Textura de relva com transparência
import rainyTexture from '../assets/textures/rainy.jpg'; // Importar o background para chuva
import pigGLBUrl from '../assets/models/pig.glb';
import rabbitGLBUrl from '../assets/models/rabbit.glb';

let isDay = true; // Estado inicial: dia
let sun; // Variável para armazenar o sol
let stars; // Variável para armazenar as estrelas
let moon; // Variável para armazenar a lua
let moonShadow; // Variável para armazenar a sombra da lua
let currentWeather = 'clear'; // Estado inicial do clima
let pigMixer = null;
let rabbitMixer = null;
let rabbit = null; // <-- Adiciona esta linha
let rabbitAngle = 0; // Ângulo para o movimento circular

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

function toggleWeather(scene, ambientLight, directionalLight, backgroundDay, backgroundNight, backgroundRainy) {
    if (currentWeather === 'clear') {
        // Ativar chuva
        scene.background = backgroundRainy; // Alterar o background para chuva
        ambientLight.intensity = 0.2; // Intensidade baixa como à noite
        directionalLight.intensity = 0.3; // Intensidade baixa como à noite
        directionalLight.color.set(0xffffff); // Cor branca como à luz do dia
        directionalLight.castShadow = false; // Desativar sombras
        sun.visible = false; // Ocultar o sol
        moon.visible = false; // Ocultar a lua
        moonShadow.visible = false; // Ocultar a sombra da lua
        stars.visible = false; // Ocultar as estrelas
        currentWeather = 'rain';
        console.log('Clima: Chuva');
    } else if (currentWeather === 'rain') {
        // Ativar neve
        scene.background = backgroundRainy; // Usar o mesmo background para neve
        ambientLight.intensity = 0.2; // Intensidade baixa como à noite
        directionalLight.intensity = 0.3; // Intensidade baixa como à noite
        directionalLight.color.set(0xffffff); // Cor branca como à luz do dia
        directionalLight.castShadow = false; // Desativar sombras
        sun.visible = false; // Ocultar o sol
        moon.visible = false; // Ocultar a lua
        moonShadow.visible = false; // Ocultar a sombra da lua
        stars.visible = false; // Ocultar as estrelas
        currentWeather = 'snow';
        console.log('Clima: Neve');
    } else if (currentWeather === 'snow') {
        // Limpar o clima
        scene.background = isDay ? backgroundDay : backgroundNight; // Voltar ao background de dia ou noite
        ambientLight.intensity = isDay ? 0.5 : 0.2; // Restaurar intensidade da luz ambiente
        directionalLight.intensity = isDay ? 1.5 : 0.3; // Restaurar intensidade da luz direcional
        directionalLight.color.set(isDay ? 0xffffff : 0x87CEEB); // Restaurar cor da luz
        directionalLight.castShadow = isDay; // Restaurar sombras apenas durante o dia
        sun.visible = isDay; // Mostrar o sol apenas durante o dia
        moon.visible = !isDay; // Mostrar a lua apenas durante a noite
        moonShadow.visible = !isDay; // Mostrar a sombra da lua apenas durante a noite
        stars.visible = !isDay; // Mostrar as estrelas apenas durante a noite
        currentWeather = 'clear';
        console.log('Clima: Limpo');
    }
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

export function createForestScene() {
    const scene = new THREE.Scene();

    // Loading manager
    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);

    loadingManager.onLoad = () => {
        console.log('All textures loaded');
    };

    // Backgrounds para dia, noite e chuva
    const backgroundDay = textureLoader.load(backgroundTexture); // Céu diurno
    const backgroundNight = new THREE.Color(0x000022); // Céu noturno (azul escuro)
    const backgroundRainy = textureLoader.load(rainyTexture); // Céu chuvoso
    scene.background = backgroundDay; // Define o fundo inicial como diurno

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

    // Terrain texture
    const terrainTexture = textureLoader.load(grassTexture);
    terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(50, 50);

    // Chunks de terreno
    const chunkSize = 50; // Reduzir o tamanho do chunk para testar geração dinâmica
    const chunks = new Map(); // Armazena os chunks gerados

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
        chunks.set(chunkKey, chunkGroup); // Armazenar o grupo no mapa de chunks
    }

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
        pigGLBUrl,
        (gltf) => {
            const pig = gltf.scene;
            pig.position.set(0, 0, 0);
            pig.scale.set(0.1, 0.1, 0.1);
            scene.add(pig);

            // Se houver animações, ativa a primeira
            if (gltf.animations && gltf.animations.length > 0) {
                pigMixer = new THREE.AnimationMixer(pig);
                const action = pigMixer.clipAction(gltf.animations[0]);
                action.play();
                action.timeScale = 7.0; // 2x mais rápido (ajusta este valor como quiseres)
                console.log('Animação do porco ativada');
            }

            console.log('Porco 3D carregado');
        },
        undefined,
        (error) => {
            console.error('Erro ao carregar o porco:', error);
        }
    );

    const rabbitLoader = new GLTFLoader();
    rabbitLoader.load(
        rabbitGLBUrl,
        (gltf) => {
            rabbit = gltf.scene; // <-- Guarda referência global
            rabbit.position.set(2, 0, 0);
            rabbit.scale.set(0.05, 0.05, 0.05);
            scene.add(rabbit);

            if (gltf.animations && gltf.animations.length > 0) {
                rabbitMixer = new THREE.AnimationMixer(rabbit);
                const action = rabbitMixer.clipAction(gltf.animations[0]);
                action.play();
                action.timeScale = 1.5;
                console.log('Animação do coelho ativada');
            }

            console.log('Coelho 3D carregado');
        },
        undefined,
        (error) => {
            console.error('Erro ao carregar o coelho:', error);
        }
    );

    return {
        scene,
        createChunk,
        chunkSize,
        chunks,
        toggleDayNight: () => toggleDayNight(scene, ambientLight, directionalLight, backgroundDay, backgroundNight),
        toggleWeather: () => toggleWeather(scene, ambientLight, directionalLight, backgroundDay, backgroundNight, backgroundRainy), // Passar luzes e backgrounds
    };
}

export { pigMixer, rabbitMixer, rabbit, rabbitAngle };