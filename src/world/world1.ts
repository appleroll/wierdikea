import { Scene } from './Scene';
import { Portal } from './Portal';
import { Vec3 } from '../math/Vec3';

const ROOM_B_Z_OFFSET = 7;

// Pass the existing scene if init is false
export function buildWorld1(init: boolean, existingScene?: Scene, room?: string): Scene {
    // If we have an existing scene, use it. Otherwise, create a new one.
    const scene = existingScene || new Scene();

    // --- GEOMETRY ---
    const worldGeometry = [
        { pos: [0, -0.5, 10] as Vec3, scale: [100, 1, 100] as Vec3, mult: [0.2, 1, 0.2, 1], room: 'Null' }, 
        // { pos: [0, 1.5, -15] as Vec3, scale: [2, 4, 2] as Vec3, mult: [0.8, 0.8, 0.2, 1], room: 'Null' },
        // { pos: [0, 1.5, 5] as Vec3, scale: [2, 4, 2] as Vec3, mult: [0.2, 0.2, 0.8, 1], room: 'Null' } 
    ];
    const longExterior = [
        { pos: [2.1, 1.5, -5] as Vec3, scale: [0.2, 3, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1], room: 'Null' },
        { pos: [-2.1, 1.5, -5] as Vec3, scale: [0.2, 3, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1], room: 'Null' },
        { pos: [0, 3.1, -5] as Vec3, scale: [4.4, 0.2, 10] as Vec3, mult: [0.1, 0.1, 0.1, 1], room: 'Null' } 
    ];
    const shortInterior = [
        { pos: [100, 3.3, -1.5] as Vec3, scale: [4, 1.2, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1], room: 'Null' }, 
        { pos: [101.9, 1, -1.5] as Vec3, scale: [0.2, 3.45, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1], room: 'Null' }, 
        { pos: [98.1, 1, -1.5] as Vec3, scale: [0.2, 3.45, 3] as Vec3, mult: [0.1, 0.1, 0.1, 1], room: 'Null' },  
    ];

    if (init) {
        scene.activeRoom = 'A'; // Start in the Main Universe
        
        // Build Room A
        worldGeometry.forEach(b => scene.addBox({ ...b, room: 'A' }));
        longExterior.forEach(b => scene.addBox({ ...b, room: 'A' }));
        
        // Build Room B (Shifted by X+100)
        shortInterior.forEach(b => scene.addBox({ ...b, room: 'B' }));
    
        worldGeometry.forEach(b => scene.addBox({
            pos: [b.pos[0] + 100, b.pos[1], b.pos[2] + ROOM_B_Z_OFFSET] as Vec3,
            scale: b.scale, 
            mult: b.mult, 
            room: 'B'
        }));

        // --- PORTALS ---
        const frontPortal = new Portal(
            'A', [0, 1.5, 0],   
            'B', [100, 1.5, 0], 
            0, 0,               
            -1                  
        );
        scene.addPortal(frontPortal);

        const backPortal = new Portal(
            'A', [0, 1.5, -10], 
            'B', [100, 1.5, -3], 
            -10, -3,             
            1                    
        );
        scene.addPortal(backPortal);
        
    } else {
        console.log("Rebuilding world geometry for room " + room);
        
        worldGeometry.forEach(b => scene.addBox({
            pos: [b.pos[0] + 100, b.pos[1], b.pos[2]] as Vec3,
            scale: b.scale, 
            mult: b.mult, 
            room: 'B'
        }));
        
    }

    return scene;
}