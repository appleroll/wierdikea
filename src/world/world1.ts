import { Scene } from './Scene';
import { Tunnel } from '../noneuclideans/Tunnel';
import { Vec3 } from '../math/Vec3';

const ROOM_B_Z_OFFSET = 7;

export function buildWorld1(init: boolean, existingScene?: Scene, room?: string): Scene {
    const scene = existingScene || new Scene();

    const worldGeometry = [
        { pos: [0, -0.5, 10] as Vec3, scale: [100, 1, 100] as Vec3, mult: [0.2, 1, 0.2, 1], room: 'Null' }
    ];

    const secretTunnel = new Tunnel({
        mainRoom: 'A',
        tunnelRoom: 'B',
        startPos: [0, 1.5, 0],         
        endPos: [0, 1.5, -10],         // Exterior length is automatically calculated as 10
        hiddenOffset: [100, 1.5, 0],   
        width: 4,                      
        height: 3,                  
        length: 3,                     // Interior space remains short (3 units)
        wallThickness: 0.2,
        color: [0.1, 0.1, 0.1, 1]
    });

    if (init) {
        scene.activeRoom = 'A'; 
        // room for a
        worldGeometry.forEach(b => scene.addBox({ ...b, room: 'A' }));

        // room for b
        worldGeometry.forEach(b => scene.addBox({
            pos: [b.pos[0] + 100, b.pos[1], b.pos[2] + ROOM_B_Z_OFFSET] as Vec3,
            scale: b.scale, 
            mult: b.mult, 
            room: 'B'
        }));
    }

    // This single call now builds the interior, exterior, and portals
    secretTunnel.addToScene(scene, init);

    return scene;
}