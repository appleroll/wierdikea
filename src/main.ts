import { Engine } from './engine';
import { Mat4, Vec3 } from './math';

async function main() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new Engine(canvas);
    await engine.init();

    // Camera/Player state
    let camPos: Vec3 = [0, 1.5, 5];
    let yaw = 0;
    let pitch = 0;

    // Input tracking
    const keys = new Set<string>();
    window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

    // Pointer lock for first-person look
    canvas.addEventListener('click', () => canvas.requestPointerLock());
    const ui = document.getElementById('ui')!;
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            ui.style.display = 'none';
        } else {
            ui.style.display = 'block';
        }
    });

    document.addEventListener('mousemove', e => {
        if (document.pointerLockElement === canvas) {
            yaw -= e.movementX * 0.002;
            pitch -= e.movementY * 0.002;
            
            // Clamp pitch to not flip over
            pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));
        }
    });

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
    });

    // Scene data
    const boxes = [
        { pos: [0, 0.5, 0] as Vec3, scale: [1, 1, 1] as Vec3 },
        { pos: [2, 1, -2] as Vec3, scale: [2, 2, 2] as Vec3 },
        { pos: [-3, 0.5, 0] as Vec3, scale: [1, 1, 1] as Vec3 },
    ];

    let lastTime = performance.now();

    function loop(time: number) {
        const dt = (time - lastTime) / 1000.0;
        lastTime = time;

        // Movement calculations
        const forward: Vec3 = [
            Math.cos(pitch) * Math.sin(yaw),
            Math.sin(pitch),
            Math.cos(pitch) * Math.cos(yaw)
        ];
        const right: Vec3 = [
            Math.cos(yaw),
            0,
            -Math.sin(yaw)
        ];

        // Restrict movement to the XZ plane for standard walking
        let moveForward: Vec3 = [forward[0], 0, forward[2]];
        if (moveForward[0] !== 0 || moveForward[2] !== 0) {
            moveForward = Vec3.normalize(moveForward);
        }
        
        let speed = 5.0;
        if (keys.has('w')) camPos = Vec3.sub(camPos, Vec3.mul(moveForward, dt * speed));
        if (keys.has('s')) camPos = Vec3.add(camPos, Vec3.mul(moveForward, dt * speed));
        if (keys.has('a')) camPos = Vec3.sub(camPos, Vec3.mul(right, dt * speed));
        if (keys.has('d')) camPos = Vec3.add(camPos, Vec3.mul(right, dt * speed));

        // Calculate matrices
        const target = Vec3.sub(camPos, forward);
        const up: Vec3 = [0, 1, 0];

        const viewMatrix = Mat4.lookAt(camPos, target, up);
        // fov, aspect, near, far
        const projMatrix = Mat4.perspective(Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);

        const models = [];
        
        // 1. Green Ground (Scale a flat box, apply green tint multiplier)
        const groundModel = Mat4.multiply(
            Mat4.translation([0, -0.5, 0]), 
            Mat4.scaling([50, 1, 50])
        );
        models.push({ model: groundModel, mult: [0.2, 0.8, 0.2, 1] });

        // 2. Add scene boxes (normal colors multiplier = 1,1,1,1)
        for (const b of boxes) {
            const m = Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale));
            models.push({ model: m, mult: [1, 1, 1, 1] });
        }

        // Draw
        engine.render(projMatrix, viewMatrix, models);

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

main().catch(console.error);
