import { Engine} from './engine';
import type { ModelData } from './engine';
import { Mat4, Vec3 } from './math';

async function main() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new Engine(canvas);
    await engine.init();

    // Start in living room
    let camPos: Vec3 = [0, 1.5, 2];
    let yaw = 0;
    let pitch = 0;

    const keys = new Set<string>();
    window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

    canvas.addEventListener('click', (e) => {
       if (e.target === canvas) canvas.requestPointerLock();
    });
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
            pitch -= e.movementY * -0.002;
            pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));
        }
    });

    let portalOffscreen: { texture: GPUTexture, view: GPUTextureView } | null = null;
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
        if (portalOffscreen) portalOffscreen.texture.destroy();
        portalOffscreen = engine.createRenderTarget(canvas.width, canvas.height);
    });
    portalOffscreen = engine.createRenderTarget(canvas.width, canvas.height);

    const boxes = [
        // --- SEC 1: LIVING ROOM (Normal Euclidean, Type 0) ---
        { pos: [0, -0.1, 0] as Vec3, scale: [10, 0.2, 10] as Vec3, type: 0, color: [0.3, 0.3, 0.35, 1] }, // Floor
        { pos: [0, 4.1, 0] as Vec3, scale: [10, 0.2, 10] as Vec3, type: 0, color: [0.8, 0.8, 0.8, 1] }, // Ceiling
        { pos: [5.1, 2, 0] as Vec3, scale: [0.2, 4, 10] as Vec3, type: 0, color: [0.6, 0.3, 0.3, 1] }, // Right Wall 
        // Left Wall (has gap to see Ames room)
        { pos: [-5.1, 2, 3] as Vec3, scale: [0.2, 4, 4] as Vec3, type: 0, color: [0.3, 0.5, 0.5, 1] },
        { pos: [-5.1, 2, -3] as Vec3, scale: [0.2, 4, 4] as Vec3, type: 0, color: [0.3, 0.5, 0.5, 1] },
        // Back Wall
        { pos: [0, 2, -5.1] as Vec3, scale: [10, 4, 0.2] as Vec3, type: 0, color: [0.3, 0.3, 0.6, 1] },
        // Front Wall (has gap for curved hallway)
        { pos: [3.5, 2, 5.1] as Vec3, scale: [3, 4, 0.2] as Vec3, type: 0, color: [0.5, 0.5, 0.3, 1] },
        { pos: [-3.5, 2, 5.1] as Vec3, scale: [3, 4, 0.2] as Vec3, type: 0, color: [0.5, 0.5, 0.3, 1] },
        // Furniture
        { pos: [2, 0.5, -2] as Vec3, scale: [1.5, 1, 1.5] as Vec3, type: 0, color: [0.5, 0.3, 0.1, 1] }, 

        // --- SEC 2: AMES ROOM (Perspective Warp, Type 2) --- Left side (-x)
        { pos: [-10, -0.1, 0] as Vec3, scale: [10, 0.2, 10] as Vec3, type: 2, color: [0.8, 0.8, 0.2, 1] }, // Ames Floor
        { pos: [-10, 4.1, 0] as Vec3, scale: [10, 0.2, 10] as Vec3, type: 2, color: [0.9, 0.9, 0.9, 1] },
        { pos: [-15.1, 2, 0] as Vec3, scale: [0.2, 4, 10] as Vec3, type: 2, color: [0.7, 0.7, 0.2, 1] }, // Far wall
        { pos: [-10, 2, 5.1] as Vec3, scale: [10, 4, 0.2] as Vec3, type: 2, color: [0.6, 0.6, 0.1, 1] }, 
        { pos: [-10, 2, -5.1] as Vec3, scale: [10, 4, 0.2] as Vec3, type: 2, color: [0.6, 0.6, 0.1, 1] }, 
        { pos: [-7, 0.5, 3] as Vec3, scale: [1, 1, 1] as Vec3, type: 2, color: [0.1, 0.8, 0.8, 1] }, // Object 1
        { pos: [-13, 0.5, -3] as Vec3, scale: [1, 1, 1] as Vec3, type: 2, color: [0.8, 0.1, 0.8, 1] }, // Object 2 

        // --- SEC 3: CURVED HALLWAY (Curved Space, Type 1) --- Front (+z)
        { pos: [0, -0.1, 30] as Vec3, scale: [4, 0.2, 50] as Vec3, type: 1, color: [0.2, 0.6, 0.6, 1] }, 
        { pos: [0, 4.1, 30] as Vec3, scale: [4, 0.2, 50] as Vec3, type: 1, color: [0.6, 0.8, 0.8, 1] }, 
        { pos: [2.1, 2, 30] as Vec3, scale: [0.2, 4, 50] as Vec3, type: 1, color: [0.3, 0.7, 0.7, 1] }, 
        { pos: [-2.1, 2, 30] as Vec3, scale: [0.2, 4, 50] as Vec3, type: 1, color: [0.3, 0.7, 0.7, 1] }, 
        ...[10, 20, 30, 40, 50].map(z => ({ pos: [0, 2, z] as Vec3, scale: [0.5, 4, 0.5] as Vec3, type: 1, color: [1, 0.5, 0, 1] })), // Pillars

        // --- PORTAL SURFACE ---
        // Attached to the back wall of living room
        { pos: [0, 2, -4.9] as Vec3, scale: [3, 4, 0.1] as Vec3, type: 0, color: [1, 1, 1, 1], isPortal: true },

        // --- IMPOSSIBLE GARDEN (Portal Exit Destination, Type 0) ---
        { pos: [100, -0.1, 100] as Vec3, scale: [20, 0.2, 20] as Vec3, type: 0, color: [0.1, 0.8, 0.1, 1] }, 
        { pos: [100, 2, 105] as Vec3, scale: [2, 4, 2] as Vec3, type: 0, color: [0.4, 0.2, 0.1, 1] }, 
        { pos: [100, 5, 105] as Vec3, scale: [6, 4, 6] as Vec3, type: 0, color: [0.1, 0.9, 0.3, 1] }, 
        { pos: [105, 1, 95] as Vec3, scale: [2, 2, 2] as Vec3, type: 0, color: [0.5, 0.5, 0.5, 1] }, 
    ];

    let lastTime = performance.now();

    function loop(time: number) {
        const dt = (time - lastTime) / 1000.0;
        lastTime = time;

        const forward: Vec3 = [
            Math.cos(pitch) * Math.sin(yaw),
            Math.sin(pitch),
            Math.cos(pitch) * Math.cos(yaw)
        ];
        const right: Vec3 = [
            Math.cos(yaw), 0, -Math.sin(yaw)
        ];
        const down: Vec3 = Vec3.cross(right, forward);

        let moveForward: Vec3 = [forward[0], 0, forward[2]];
        if (moveForward[0] !== 0 || moveForward[2] !== 0) moveForward = Vec3.normalize(moveForward);
        
        let speed = 5.0;
        if (keys.has('w')) camPos = Vec3.sub(camPos, Vec3.mul(moveForward, dt * speed));
        if (keys.has('s')) camPos = Vec3.add(camPos, Vec3.mul(moveForward, dt * speed));
        if (keys.has('a')) camPos = Vec3.sub(camPos, Vec3.mul(right, dt * speed));
        if (keys.has('d')) camPos = Vec3.add(camPos, Vec3.mul(right, dt * speed));
        if (keys.has(' ')) camPos = Vec3.sub(camPos, Vec3.mul(down, dt * speed));
        if (keys.has('shift')) camPos = Vec3.add(camPos, Vec3.mul(down, dt * speed));

        const target = Vec3.sub(camPos, forward);
        const up: Vec3 = [0, 1, 0];

        const viewMatrix = Mat4.lookAt(camPos, target, up);
        const projMatrix = Mat4.perspective(Math.PI/3, canvas.width / canvas.height, 0.1, 150.0);

        const models: ModelData[] = boxes.map(b => {
             return {
                 modelMatrix: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)),
                 color: b.color,
                 effectType: b.type,
                 isPortal: !!b.isPortal,
                 portalTextureView: b.isPortal ? portalOffscreen!.view : undefined
             };
        });

        // ----------------- PORTAL PASS -----------------
        const portalAPos: Vec3 = [0, 2, -4.9];
        const portalBPos: Vec3 = [100, 2, 100]; 
        
        // Exact seamless translation offset mapping for the portal camera
        const camOffsetA = Vec3.sub(camPos, portalAPos);
        const portalCamPos = Vec3.add(portalBPos, camOffsetA); 
        const portalVirtualForward: Vec3 = forward; 
        const pTarget = Vec3.sub(portalCamPos, portalVirtualForward);
        const pView = Mat4.lookAt(portalCamPos, pTarget, [0,1,0]);

        engine.renderScene(projMatrix, pView, portalCamPos, models, portalOffscreen!.view, true);

        // ----------------- MAIN PASS -----------------
        engine.renderScene(projMatrix, viewMatrix, camPos, models, null, false);

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

main().catch(console.error);
