import { Vec3 } from '../math/Vec3';
import { Camera } from './Camera';

export class Portal {
    public roomA: string;
    public posA: Vec3;
    public roomB: string;
    public posB: Vec3;
    public triggerZA: number;
    public triggerZB: number;
    public dirAtoB: -1 | 1;
    public width: number;
    constructor(
        roomA: string,
        posA: Vec3,
        roomB: string,
        posB: Vec3,
        triggerZA: number,
        triggerZB: number,
        dirAtoB: -1 | 1,
        width: number = 4
    ) {
        this.roomA = roomA;
        this.posA = posA;
        this.roomB = roomB;
        this.posB = posB;
        this.triggerZA = triggerZA;
        this.triggerZB = triggerZB;
        this.dirAtoB = dirAtoB;
        this.width = width;
    }

    checkCrossing(camera: Camera, currentRoom: string): string | null {
        if (currentRoom === this.roomA) {
            // Did we cross from A into B?
            const crossed = this.dirAtoB === -1 
                ? camera.prevPos[2] > this.triggerZA && camera.pos[2] <= this.triggerZA
                : camera.prevPos[2] < this.triggerZA && camera.pos[2] >= this.triggerZA;

            if (crossed && Math.abs(camera.pos[0] - this.posA[0]) < this.width / 2) {
                const offset = Vec3.sub(this.posB, this.posA);
                camera.pos = Vec3.add(camera.pos, offset);
                return this.roomB;
            }
        } else if (currentRoom === this.roomB) {
            // Did we cross from B back into A? (Invert the direction)
            const dirBtoA = -this.dirAtoB; 
            const crossed = dirBtoA === -1 
                ? camera.prevPos[2] > this.triggerZB && camera.pos[2] <= this.triggerZB
                : camera.prevPos[2] < this.triggerZB && camera.pos[2] >= this.triggerZB;

            if (crossed && Math.abs(camera.pos[0] - this.posB[0]) < this.width / 2) {
                const offset = Vec3.sub(this.posA, this.posB);
                camera.pos = Vec3.add(camera.pos, offset);
                return this.roomA;
            }
        }
        return null;
    }
}