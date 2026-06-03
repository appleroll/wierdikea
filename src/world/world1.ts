import { Scene } from './Scene';
import { Portal } from './Portal';
import { Vec3 } from '../math/Vec3';

export function buildWorld1(): Scene {
    const scene = new Scene();
    scene.activeRoom = 'A'; // Start in the Main Universe

    // --- GEOMETRY ---
    const worldGeometry = [
        { pos: [0, -0.5, 10] as Vec3, scale: [50, 1, 50] as Vec3, mult: [0.2, 1, 0.2, 1] },
        { pos: [0, 1.5, -15] as Vec3, scale: [2, 4, 2] as Vec3, mult: [0.8, 0.8, 0.2, 1] },
        { pos: [0, 1.5, 5] as Vec3, scale: [2, 4, 2] as Vec3, mult: [0.2, 0.2, 0.8, 1] } 
    ];
    const longExterior = [
        { pos: [2.1, 1.5, -5] as Vec3, scale: [0.2, 3, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1] },
        { pos: [-2.1, 1.5, -5] as Vec3, scale: [0.2, 3, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1] },
        { pos: [0, 3.1, -5] as Vec3, scale: [4.4, 0.2, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1] } 
    ];
    const shortInterior = [
        { pos: [100, 3.3, -1.5] as Vec3, scale: [4, 1.2, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1] }, 
        { pos: [101.9, 1, -1.5] as Vec3, scale: [0.2, 3.45, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1] }, 
        { pos: [98.1, 1, -1.5] as Vec3, scale: [0.2, 3.45, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1] },  
    ];

    // Build Room A
    worldGeometry.forEach(b => scene.addBox({ ...b, room: 'A' }));
    longExterior.forEach(b => scene.addBox({ ...b, room: 'A' }));

    // Build Room B (Shifted by X+100)
    shortInterior.forEach(b => scene.addBox({ ...b, room: 'B' }));
    worldGeometry.forEach(b => scene.addBox({
        pos: [b.pos[0] + 100, b.pos[1], b.pos[2]],
        scale: b.scale, mult: b.mult, room: 'B'
    }));

    // --- PORTALS ---
    const frontPortal = new Portal(
        'A', [0, 1.5, 0],   // Portal in Room A
        'B', [100, 1.5, 0], // Target in Room B
        0, 0,               // Trigger at Z=0 for both sides
        -1                  // Requires walking in the negative Z direction to enter B
    );
    scene.addPortal(frontPortal);

    const backPortal = new Portal(
        'A', [0, 1.5, -10], 
        'B', [100, 1.5, -3], // Note the Z shift! The 7-unit physical gap is skipped here.
        -10, -3,             
        1                    // Requires walking in the positive Z direction to enter B
    );
    scene.addPortal(backPortal);

    return scene;
}