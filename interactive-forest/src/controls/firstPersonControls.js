import { Vector3, Object3D } from 'three';
import { treeColliders } from '../scenes/forestScene';

let camera, cameraParent;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new Vector3();
const direction = new Vector3();
let rotation = { x: 0, y: 0 };
let isJumping = false;
let jumpTime = 0;
const jumpDuration = 0.6; 
const jumpHeight = 2; 
const baseHeight = 0.5;

export function initControls(cam) {
    camera = cam;

    // Criar um objeto pai para a câmera
    cameraParent = new Object3D();
    cameraParent.add(camera);

    // Configurar Pointer Lock
    const canvas = document.querySelector('canvas');
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);

    return {
        update: updateControls,
        getCameraParent: () => cameraParent, 
    };
}

function onPointerLockChange() {
    if (document.pointerLockElement !== document.querySelector('canvas')) {
        document.removeEventListener('mousemove', onMouseMove);
    } else {
        document.addEventListener('mousemove', onMouseMove);
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (!isJumping) {
                isJumping = true;
                jumpTime = 0; 
            }
            break;
        case 'Escape':
            document.exitPointerLock();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

function onMouseMove(event) {
    if (document.pointerLockElement === document.querySelector('canvas')) {
        const sensitivity = 0.002; 
        rotation.y -= event.movementX * sensitivity;
        rotation.x -= event.movementY * sensitivity;

        rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.x));
    }
}

function updateControls(delta) {
    const speed = 25;

    camera.rotation.x = rotation.x; 
    cameraParent.rotation.y = rotation.y; 

    // Calcular direção do movimento
    direction.z = Number(moveBackward) - Number(moveForward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    // Atualizar a velocidade
    velocity.z = direction.z * speed * delta;
    velocity.x = direction.x * speed * delta;

    // Converter a direção para o espaço local do objeto pai
    const move = new Vector3(velocity.x, 0, velocity.z).applyEuler(cameraParent.rotation);

    // Atualizar a posição horizontal do objeto pai
    const nextPosition = cameraParent.position.clone().add(move);

    // Verificar colisão com árvores
    let collides = false;
    for (const collider of treeColliders) {
        const dist = nextPosition.clone().setY(0).distanceTo(collider.position.clone().setY(0));
        if (dist < collider.radius + 0.5) { // 0.5 é o "raio" do jogador
            collides = true;
            break;
        }
    }

    if (!collides) {
        cameraParent.position.copy(nextPosition);
    }

    if (isJumping) {
        jumpTime += delta; // Incrementar o tempo do salto
        const progress = jumpTime / jumpDuration; // Progresso do salto (0 a 1)

        if (progress <= 1) {
            // Calcular altura do salto usando função sin
            const height = Math.sin(progress * Math.PI) * jumpHeight;
            cameraParent.position.y = baseHeight + height; // Altura base + altura do salto
        } else {
            // Finalizar o salto
            cameraParent.position.y = baseHeight; // Resetar para a altura inicial
            isJumping = false; // Parar o salto
            jumpTime = 0; // Resetar o tempo do salto
        }
    } else {
        cameraParent.position.y = baseHeight;
    }
}