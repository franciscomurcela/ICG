import * as THREE from 'three';
import { createTree, createRock, createRealisticGrassPatch } from '../utils/helpers';

// Importar texturas diretamente
import grassTexture from '../assets/textures/grass.jpg';
import backgroundTexture from '../assets/textures/background.jpg'; // Importar a imagem de fundo
import grassBladeTexture from '../assets/textures/grass-blade.png'; // Textura de relva com transparência

let isDay = true; // Estado inicial: dia
let sun; // Variável para armazenar o sol
let stars; // Variável para armazenar as estrelas
let moon; // Variável para armazenar a lua
let moonShadow; // Variável para armazenar a sombra da lua

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

    // Backgrounds para dia e noite
    const backgroundDay = textureLoader.load(backgroundTexture); // Céu diurno
    const backgroundNight = new THREE.Color(0x000022); // Céu noturno (azul escuro)
    scene.background = backgroundDay; // Define o fundo inicial como diurno

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

        const terrainGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 10, 10);
        const terrainMaterial = new THREE.MeshStandardMaterial({
            map: terrainTexture, // Textura do terreno
            roughness: 1, // Configurar rugosidade para evitar reflexos
            metalness: 0, // Configurar metalicidade para evitar brilho
        });
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.set(x * chunkSize, 0, z * chunkSize);
        terrain.receiveShadow = true;

        scene.add(terrain);
        chunks.set(chunkKey, terrain);

        // Adicionar relva realista ao chunk
        const grassPatch = createRealisticGrassPatch(
            new THREE.Vector3(x * chunkSize, 0, z * chunkSize),
            chunkSize,
            100, // Reduzir densidade da relva
            new THREE.TextureLoader().load(grassBladeTexture)
        );
        scene.add(grassPatch);

        // Adicionar árvores ao chunk
        for (let i = 0; i < 8; i++) {
            let position;
            let attempts = 0;

            // Garantir que a posição da árvore não se sobreponha
            do {
                position = new THREE.Vector3(
                    Math.random() * chunkSize - chunkSize / 2 + x * chunkSize,
                    0,
                    Math.random() * chunkSize - chunkSize / 2 + z * chunkSize
                );
                attempts++;
            } while (treePositions.has(`${Math.round(position.x)},${Math.round(position.z)}`) && attempts < 10);

            if (attempts < 10) {
                treePositions.add(`${Math.round(position.x)},${Math.round(position.z)}`);
                const tree = createTree(position, Math.random() * 0.5 + 1.5, Array.from(treePositions).map(pos => {
                    const [px, pz] = pos.split(',').map(Number);
                    return new THREE.Vector3(px, 0, pz);
                }));
                scene.add(tree);
            }
        }

        // Usar InstancedMesh para pedras
        const rockGeometry = new THREE.DodecahedronGeometry(0.5); // Simplificar geometria
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const rockMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, 10);

        for (let i = 0; i < 10; i++) {
            const position = new THREE.Vector3(
                Math.random() * chunkSize - chunkSize / 2 + x * chunkSize,
                0,
                Math.random() * chunkSize - chunkSize / 2 + z * chunkSize
            );
            const matrix = new THREE.Matrix4();
            matrix.setPosition(position);
            rockMesh.setMatrixAt(i, matrix);
        }
        scene.add(rockMesh);

        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                const position = new THREE.Vector3(
                    Math.random() * chunkSize - chunkSize / 2 + x * chunkSize,
                    0,
                    Math.random() * chunkSize - chunkSize / 2 + z * chunkSize
                );
                const rock = createRock(position, Math.random() * 0.5 + 0.2);
                scene.add(rock);
            }
        }, 0);
    }

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft light
    scene.add(ambientLight);

    // Directional light
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

    return {
        scene,
        createChunk,
        chunkSize,
        chunks,
        toggleDayNight: () => toggleDayNight(scene, ambientLight, directionalLight, backgroundDay, backgroundNight),
    };
}