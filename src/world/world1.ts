import { Scene } from './Scene';
import { Tunnel } from '../noneuclideans/Tunnel';
import { Vec3 } from '../math/Vec3';

const ROOM_B_Z_OFFSET = 7; 
const ROOM_C_Z_OFFSET = -10; // Room C expands space, so we push blocks further back

export function buildWorld1(init: boolean, existingScene?: Scene): Scene {
    const scene = existingScene || new Scene();

    const worldGeometry = [
        // Huge floor
        { pos: [0, -0.5, 10] as Vec3, scale: [500, 1, 500] as Vec3, mult: [0.2, 1, 0.2, 1], room: 'Null' },

        /// TUNNEL 1 REFERENCE BLOCKS
        { pos: [0, 0.5, -15] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' },
        { pos: [0, 0.5, 5] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' },

        /// TUNNEL 2 REFERENCE BLOCKS
        { pos: [15, 0.5, -15] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' },
        { pos: [15, 0.5, 5] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' }        
    ];

    const secretTunnel = new Tunnel({
        mainRoom: 'A',
        tunnelRoom: 'B',
        startPos: [0, 1.5, 0],         
        endPos: [0, 1.5, -10],         
        hiddenOffset: [100, 1.5, 0],   
        width: 4,                      
        height: 3,                  
        length: 3,                     
        wallThickness: 0.2,
        color: [0.2, 0.1, 0.1, 1] // Slight red tint
    });

    const secretTunnel2 = new Tunnel({
        mainRoom: 'A',
        tunnelRoom: 'C',
        startPos: [15, 1.5, 0],         
        endPos: [15, 1.5, -10],         
        hiddenOffset: [115, 1.5, 0],   
        width: 4,                      
        height: 3,                  
        length: 20,                     
        wallThickness: 0.2,
        color: [0.2, 0.1, 0.1, 1] // Slight red tint
    });

    if (init) {
        // 1. Build Room A
        worldGeometry.forEach(b => scene.addBox({ ...b, room: 'A' }));

        // 2. Build Room B (Compresses space)
        worldGeometry.forEach(b => {
            const zOffset = b.pos[2] > -5 ? 0 : ROOM_B_Z_OFFSET;
            scene.addBox({
                pos: [b.pos[0] + 100, b.pos[1], b.pos[2] + zOffset] as Vec3,
                scale: b.scale, 
                mult: b.mult, 
                room: 'B'
            });
        });

        worldGeometry.forEach(b => {
            const zOffset = b.pos[2] > -5 ? 0 : ROOM_C_Z_OFFSET;
            scene.addBox({
                pos: [b.pos[0] + 115, b.pos[1], b.pos[2] + zOffset] as Vec3,
                scale: b.scale, 
                mult: b.mult, 
                room: 'C'
            });
        });

    }

    secretTunnel.addToScene(scene, init);
    secretTunnel2.addToScene(scene, init);
    return scene;
}