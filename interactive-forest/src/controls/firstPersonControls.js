import { Vector3, Object3D } from 'three';
import { treeColliders } from '../scenes/forestScene';

let camera, cameraParent;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new Vector3();
const direction = new Vector3();
let rotation = { x: 0, y: 0 }; // Armazena a rotação da câmera
let isJumping = false; // Indica se o jogador está no ar
let jumpTime = 0; // Tempo acumulado para o salto
const jumpDuration = 0.6; // Duração total do salto (em segundos)
const jumpHeight = 2; // Altura máxima do salto
const baseHeight = 0.5; // Altura inicial da câmera (base no solo)

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
        getCameraParent: () => cameraParent, // Retorna o objeto pai para ser adicionado à cena
    };
}

function onPointerLockChange() {
    if (document.pointerLockElement !== document.querySelector('canvas')) {
        // Liberar o bloqueio do mouse
        document.removeEventListener('mousemove', onMouseMove);
    } else {
        // Reativar o movimento do mouse
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
        case 'Space': // Salto
            if (!isJumping) {
                isJumping = true;
                jumpTime = 0; // Reiniciar o tempo do salto
            }
            break;
        case 'Escape': // Liberar o Pointer Lock ao pressionar Esc
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
        const sensitivity = 0.002; // Sensibilidade do mouse
        rotation.y -= event.movementX * sensitivity;
        rotation.x -= event.movementY * sensitivity;

        // Limitar a rotação vertical para evitar inclinação
        rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.x));
    }
}

function updateControls(delta) {
    const speed = 25; // Velocidade de movimento

    // Atualizar a rotação
    camera.rotation.x = rotation.x; // Rotação vertical
    cameraParent.rotation.y = rotation.y; // Rotação horizontal

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

    // Simular salto usando função sin
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
        // Garantir que a altura base seja mantida quando não estiver saltando
        cameraParent.position.y = baseHeight;
    }
}