import { Vec3 } from '../math/Vec3';
import { Camera } from '../world/Camera';

export class Portal {
    public roomA: string;
    public posA: Vec3;
    public roomB: string;
    public posB: Vec3;
    public triggerA: number;
    public triggerB: number;
    public dirAtoB: -1 | 1;
    public width: number;
    public height: number // = 3; the player fits snugly in a 3-unit tunnel, but the ikea door shouldnt be 3 units obv 
    public axis: 'X' | 'Z';

    constructor(
        roomA: string, 
        posA: Vec3, 
        roomB: string, 
        posB: Vec3,
        triggerA: number, 
        triggerB: number, 
        dirAtoB: -1 | 1, 
        width: number = 4, 
        height: number = 3,
        axis: 'X' | 'Z' = 'Z'
    ) {
        this.roomA = roomA;
        this.posA = posA;
        this.roomB = roomB;
        this.posB = posB;
        this.triggerA = triggerA;
        this.triggerB = triggerB;
        this.dirAtoB = dirAtoB;
        this.width = width;
        this.height = height;
        this.axis = axis;
    }

    checkCrossing(camera: Camera, currentRoom: string): string | null {
        // If axis is X, we check index 0. If Z, we check index 2.
        const axisIdx = this.axis === 'X' ? 0 : 2;
        const crossIdx = this.axis === 'X' ? 2 : 0; 

        console.log({
            
            room: currentRoom,
            prev: camera.prevPos[axisIdx],
            curr: camera.pos[axisIdx],
            trigger: currentRoom === this.roomA ? this.triggerA : this.triggerB,
        });

        if (currentRoom === this.roomA) {
            const crossed = this.dirAtoB === -1 
                ? camera.prevPos[axisIdx] > this.triggerA && camera.pos[axisIdx] <= this.triggerA
                : camera.prevPos[axisIdx] < this.triggerA && camera.pos[axisIdx] >= this.triggerA;

            if (crossed && Math.abs(camera.pos[crossIdx] - this.posA[crossIdx]) < this.width / 2) {
                const offset = Vec3.sub(this.posB, this.posA);
                camera.pos = Vec3.add(camera.pos, offset);
                return this.roomB;
            }
        } else if (currentRoom === this.roomB) {
            const dirBtoA = -this.dirAtoB; 
            const crossed = dirBtoA === -1 
                ? camera.prevPos[axisIdx] > this.triggerB && camera.pos[axisIdx] <= this.triggerB
                : camera.prevPos[axisIdx] < this.triggerB && camera.pos[axisIdx] >= this.triggerB;

            if (crossed && Math.abs(camera.pos[crossIdx] - this.posB[crossIdx]) < this.width / 2) {
                const offset = Vec3.sub(this.posA, this.posB);
                camera.pos = Vec3.add(camera.pos, offset);
                return this.roomA;
            }
        }
        return null;
    }
}