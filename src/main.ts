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

    // --- 1. GEOMETRY GENERATION (Space Duplication Trick) ---
    const boxes: any[] = [];
    
    const worldGeometry = [
        { pos: [0, -0.5, 10] as Vec3, scale: [50, 1, 50] as Vec3, mult: [0.2, 1, 0.2, 1] }, // Front Yard
        { pos: [0, 1.5, -15] as Vec3, scale: [2, 4, 2] as Vec3, mult: [0.8, 0.8, 0.2, 1] }, // Yellow Pillar (Behind Tunnel)
        { pos: [0, 1.5, 5] as Vec3, scale: [2, 4, 2] as Vec3, mult: [0.2, 0.2, 0.8, 1] }    // Blue Pillar (In Front)
    ];

    const longExterior = [
        { pos: [2.1, 1.5, -5] as Vec3, scale: [0.2, 3, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1] }, // Right Outer
        { pos: [-2.1, 1.5, -5] as Vec3, scale: [0.2, 3, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1] }, // Left Outer
        { pos: [0, 3.1, -5] as Vec3, scale: [4.4, 0.2, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1] } // Roof Outer
    ];

    const shortInterior = [
        { pos: [100, 3.3, -1.5] as Vec3, scale: [4, 1.2, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1] }, // Floor
        { pos: [101.9, 1, -1.5] as Vec3, scale: [0.2, 3.45, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1] },  // Right Inner
        { pos: [98.1, 1, -1.5] as Vec3, scale: [0.2, 3.45, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1] },   // Left Inner
    ];

    // Build Room A (Main Universe)
    worldGeometry.forEach(b => boxes.push({ ...b, room: 'A' }));
    longExterior.forEach(b => boxes.push({ ...b, room: 'A' }));

    let inRoomB = false; 

    // Build Room B (Pocket Universe)
    shortInterior.forEach(b => boxes.push({ ...b, room: 'B' }));
    worldGeometry.forEach(b => boxes.push({
        // The magic step: Duplicating the world but shifting it to close the physical gap
        // Main tunnel is 10 units long. Short tunnel is 3 units long. Shift = 7 units.
        pos: [b.pos[0] + 100, b.pos[1], inRoomB ? b.pos[2] + 7 : b.pos[2]],
        scale: b.scale,
        mult: b.mult,
        room: 'B'
    }));

    let lastTime = performance.now();
    
    function loop(time: number) {
        const dt = (time - lastTime) / 1000.0;
        lastTime = time;
        prevCamPos = [...camPos] as Vec3;

        const forward: Vec3 = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
        const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
        let moveFwd: Vec3 = [forward[0], 0, forward[2]];
        if (moveFwd[0] !== 0 || moveFwd[2] !== 0) moveFwd = Vec3.normalize(moveFwd);
        
        if (keys.has('w')) camPos = Vec3.sub(camPos, Vec3.mul(moveFwd, dt * 5));
        if (keys.has('s')) camPos = Vec3.add(camPos, Vec3.mul(moveFwd, dt * 5));
        if (keys.has('a')) camPos = Vec3.sub(camPos, Vec3.mul(right, dt * 5));
        if (keys.has('d')) camPos = Vec3.add(camPos, Vec3.mul(right, dt * 5));

        // --- 2. Z-AXIS TELEPORTATION ---
        if (!inRoomB) {
            // Front Entrance (Walk into Z=0)
            if (prevCamPos[2] > 0 && camPos[2] <= 0 && Math.abs(camPos[0]) < 2) {
                camPos[0] += 100;
                inRoomB = true;
            }
            // Back Entrance (Walk into Z=-10)
            else if (prevCamPos[2] < -10 && camPos[2] >= -10 && Math.abs(camPos[0]) < 2) {
                camPos[0] += 100;
                camPos[2] += 7; // Physically skip the 7 unit difference
                inRoomB = true;
            }
        } else {
            // Front Exit (Walk out of Z=0)
            if (prevCamPos[2] < 0 && camPos[2] >= 0 && Math.abs(camPos[0] - 100) < 2) {
                camPos[0] -= 100;
                inRoomB = false;
            }
            // Back Exit (Walk out of Z=-3)
            else if (prevCamPos[2] > -3 && camPos[2] <= -3 && Math.abs(camPos[0] - 100) < 2) {
                camPos[0] -= 100;
                camPos[2] -= 7; // Restore the 7 units to place you at -10
                inRoomB = false;
            }
        }

        // --- 3. DYNAMIC PORTAL TARGETING ---
        // Determine if we should render the front entrance or the back exit
        const distToFront = Math.abs(camPos[2] - 0);
        const distToBack = Math.abs(camPos[2] - (inRoomB ? -3 : -3));
        const isLookingAtFront = distToFront < distToBack;

        const currentPortalA: Vec3 = isLookingAtFront ? [0, 1.5, 0] : [0, 1.5, -10];
        const currentPortalB: Vec3 = isLookingAtFront ? [100, 1.5, 0] : [100, 1.5, -3];

        const currentPortalPos = inRoomB ? currentPortalB : currentPortalA;
        const targetPortalPos = inRoomB ? currentPortalA : currentPortalB;

        const camOffset = Vec3.sub(camPos, currentPortalPos);
        const virtualCamPos = Vec3.add(targetPortalPos, camOffset);

        const projMatrix = Mat4.perspective(Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);
        const mainView = Mat4.lookAt(camPos, Vec3.sub(camPos, forward), [0, 1, 0]);
        const virtualView = Mat4.lookAt(virtualCamPos, Vec3.sub(virtualCamPos, forward), [0, 1, 0]);

        // --- 4. RENDER FILTERING ---
        const virtualModels = boxes
            .filter(b => b.room === (inRoomB ? 'A' : 'B'))
            .map(b => ({ model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)), mult: b.mult }));

        const mainModels = boxes
            .filter(b => b.room === (inRoomB ? 'B' : 'A'))
            .map(b => ({ model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)), mult: b.mult }));
        
        // Add active portal plane (Thickness 0.01 prevents Z-fighting)
        mainModels.push({ 
            model: Mat4.multiply(Mat4.translation(currentPortalPos), Mat4.scaling([4, 3, 0.01])), 
            mult: [1, 1, 1, 1], 
            isPortal: true 
        } as any);

        engine.render(projMatrix, virtualView, virtualModels, portalTarget!.view, undefined);
        engine.render(projMatrix, mainView, mainModels, undefined, portalTarget!.view);

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

main().catch(console.error);