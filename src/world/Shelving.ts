import { Scene } from './Scene';
import {ikeaColours} from '../colour/ikeaColours';

export function addShelf(
    scene: Scene,
    x: number,
    y: number,
    z: number,
    room: string,
    width = 3,
    depth = 4,
    rotation = 0, // 0, 1, 2, 3 = 0°, 90°, 180°, 270° respectively
    shelfColor = ikeaColours.white
) {
    const T = 0.15;

    const vertical = rotation % 2 === 1;

    // Uprights
    if (!vertical) {
        scene.addBox({
            pos: [x - width/2, y, z],
            scale: [T, 8, depth],
            mult: shelfColor,
            room
        });

        scene.addBox({
            pos: [x + width/2, y, z],
            scale: [T, 8, depth],
            mult: shelfColor,
            room
        });

        for (let i = 0; i < 8; i++) {
            scene.addBox({
                pos: [x, y - 1.5 + i, z],
                scale: [width, T, depth],
                mult: shelfColor,
                room
            });
        }
    } else {
        scene.addBox({
            pos: [x, y, z - width/2],
            scale: [depth, 8, T],
            mult: shelfColor,
            room
        });

        scene.addBox({
            pos: [x, y, z + width/2],
            scale: [depth, 8, T],
            mult: shelfColor,
            room
        });

        for (let i = 0; i < 8; i++) {
            scene.addBox({
                pos: [x, y - 4 + i, z],
                scale: [depth, T, width],
                mult: shelfColor,
                room
            });
        }
    }
}