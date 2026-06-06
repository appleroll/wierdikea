import { Scene } from './Scene';
import { Tunnel } from '../noneuclideans/Tunnel';
import { Vec3 } from '../math/Vec3';

const ROOM_B_Z_OFFSET = 7;

export function buildWorld1(init: boolean, existingScene?: Scene): Scene {
    const scene = existingScene || new Scene();

    const worldGeometry = [
        // Huge floor (since it's untextured, shifting it causes no visible seams)
        { pos: [0, -0.5, 10] as Vec3, scale: [100, 1, 100] as Vec3, mult: [0.2, 1, 0.2, 1], room: 'Null' },
        // Back reference block
        { pos: [0, 0.5, -15] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' },
        // Front reference block
        { pos: [0, 0.5, 5] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' }
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
        color: [0.1, 0.1, 0.1, 1]
    });

    worldGeometry.forEach(b => scene.addBox({ ...b, room: 'A' }));

    // 2. Build the fake backdrop for Room B (The Fix)
    worldGeometry.forEach(b => {
        const zOffset = b.pos[2] > -5 ? 0 : ROOM_B_Z_OFFSET;

        scene.addBox({
            pos: [b.pos[0] + 100, b.pos[1], b.pos[2] + zOffset] as Vec3,
            scale: b.scale, 
            mult: b.mult, 
            room: 'B'
        });
    });

    secretTunnel.addToScene(scene, init);

    return scene;
}