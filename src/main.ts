import { Engine } from './engine';
import { Mat4, Vec3 } from './math';

async function main() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new Engine(canvas);
    await engine.init();

    let camPos: Vec3 = [0, 1.5, 5];
    let prevCamPos: Vec3 = [0, 1.5, 5];
    let yaw = 0;
    let pitch = 0;

    const keys = new Set<string>();
    window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

    canvas.addEventListener('click', () => canvas.requestPointerLock());
    document.addEventListener('mousemove', e => {
        if (document.pointerLockElement === canvas) {
            yaw -= e.movementX * 0.002;
            pitch -= e.movementY * -0.002;
            pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));
        }
    });

    let portalTarget: { texture: GPUTexture, view: GPUTextureView } | null = null;
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
        if (portalTarget) portalTarget.texture.destroy();
        portalTarget = engine.createRenderTarget(canvas.width, canvas.height);
    });
    portalTarget = engine.createRenderTarget(canvas.width, canvas.height);

    // --- PORTAL DATA STRUCTURE ---
    // Portal A is in your starting room. Portal B is far away in the tunnel.
    // They both face the +Z direction (parallel portals).
    const portalA = { pos: [0, 1.5, -2] as Vec3, normal: [0, 0, 1] as Vec3 };
    const portalB = { pos: [50, 1.5, 50] as Vec3, normal: [0, 0, 1] as Vec3 };

    const boxes = [
        // Room A (Main)
        { pos: [0, -0.5, 0] as Vec3, scale: [10, 1, 10] as Vec3, mult: [0.2, 0.2, 0.8, 1] }, // Floor
        { pos: [-3, 1, 0] as Vec3, scale: [1, 2, 1] as Vec3, mult: [1, 1, 1, 1] },
        { pos: [3, 1, 0] as Vec3, scale: [1, 2, 1] as Vec3, mult: [1, 1, 1, 1] },
        
        // Room B (The Distant Tunnel)
        { pos: [50, -0.5, 45] as Vec3, scale: [4, 1, 30] as Vec3, mult: [0.8, 0.2, 0.2, 1] }, // Red Tunnel Floor
        { pos: [51.5, 1, 45] as Vec3, scale: [1, 2, 30] as Vec3, mult: [0.4, 0.1, 0.1, 1] }, // Right Wall
        { pos: [48.5, 1, 45] as Vec3, scale: [1, 2, 30] as Vec3, mult: [0.4, 0.1, 0.1, 1] }, // Left Wall
        { pos: [50, 1, 30] as Vec3, scale: [4, 2, 1] as Vec3, mult: [0.2, 0.2, 0.2, 1] }, // Back Wall
    ];

    let lastTime = performance.now();

    function loop(time: number) {
        const dt = (time - lastTime) / 1000.0;
        lastTime = time;

        prevCamPos = [...camPos] as Vec3;

        const forward: Vec3 = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
        const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
        
        let moveFwd: Vec3 = [forward[0], 0, forward[2]];
        if (moveFwd[0] !== 0 || moveFwd[2] !== 0) moveFwd = Vec3.normalize(moveFwd);
        
        let speed = 5.0;
        if (keys.has('w')) camPos = Vec3.sub(camPos, Vec3.mul(moveFwd, dt * speed));
        if (keys.has('s')) camPos = Vec3.add(camPos, Vec3.mul(moveFwd, dt * speed));
        if (keys.has('a')) camPos = Vec3.sub(camPos, Vec3.mul(right, dt * speed));
        if (keys.has('d')) camPos = Vec3.add(camPos, Vec3.mul(right, dt * speed));

        // --- 1. TELEPORTATION (Plane Crossing) ---
        // Dot product checks if you are "in front" (>0) or "behind" (<0) the portal surface
        const prevDistA = Vec3.dot(Vec3.sub(prevCamPos, portalA.pos), portalA.normal);
        const currDistA = Vec3.dot(Vec3.sub(camPos, portalA.pos), portalA.normal);
        
        const prevDistB = Vec3.dot(Vec3.sub(prevCamPos, portalB.pos), portalB.normal);
        const currDistB = Vec3.dot(Vec3.sub(camPos, portalB.pos), portalB.normal);

        // If you cross Portal A front-to-back, teleport to Portal B
        if (prevDistA > 0 && currDistA <= 0 && Math.abs(camPos[0] - portalA.pos[0]) < 1.5) {
            const offset = Vec3.sub(camPos, portalA.pos);
            camPos = Vec3.add(portalB.pos, offset);
        }
        // If you cross Portal B back-to-front, teleport to Portal A
        else if (prevDistB <= 0 && currDistB > 0 && Math.abs(camPos[0] - portalB.pos[0]) < 1.5) {
            const offset = Vec3.sub(camPos, portalB.pos);
            camPos = Vec3.add(portalA.pos, offset);
        }

        // --- 2. VIRTUAL CAMERA MATH ---
        // Find which room the player is in right now
        const inRoomB = camPos[0] > 25;
        const currentPortal = inRoomB ? portalB : portalA;
        const targetPortal = inRoomB ? portalA : portalB;

        // Offset relative to the entrance portal
        const camOffset = Vec3.sub(camPos, currentPortal.pos);
        // Apply offset to the destination portal
        const virtualCamPos = Vec3.add(targetPortal.pos, camOffset);

        const projMatrix = Mat4.perspective(Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);
        
        // Virtual View Matrix
        const vTarget = Vec3.sub(virtualCamPos, forward);
        const virtualViewMatrix = Mat4.lookAt(virtualCamPos, vTarget, [0, 1, 0]);

        // Main View Matrix
        const target = Vec3.sub(camPos, forward);
        const mainViewMatrix = Mat4.lookAt(camPos, target, [0, 1, 0]);

        // Build models array
    const models: { model: Float32Array, mult: number[], isPortal?: boolean }[] = boxes.map(b => ({
                model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)),
                mult: b.mult
            }));

        // 1. FLATTEN THE PORTAL TO 0.0 THICKNESS
        // This crushes the 3D box into a perfectly flat 2D plane
        const portalModel = Mat4.multiply(Mat4.translation(currentPortal.pos), Mat4.scaling([2, 3, 0.0]));
        models.push({ model: portalModel, mult: [1, 1, 1, 1], isPortal: true });

        // --- 3. RENDER PIPELINE ORDER ---
        // 2. CHANGE 'null' TO 'undefined' 
        // Pass 1: Render the scene from the Virtual Camera to the Offscreen Texture
        engine.render(projMatrix, virtualViewMatrix, models, portalTarget!.view, undefined);

        // Pass 2: Render the scene from the Main Camera to the Canvas, applying the texture
        engine.render(projMatrix, mainViewMatrix, models, undefined, portalTarget!.view);

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

main().catch(console.error);