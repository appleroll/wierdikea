import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { Camera } from './Camera';
import { Portal } from '../noneuclideans/Portal';

export interface RenderBox {
    pos: Vec3;
    scale: Vec3;
    mult: number[];
    room: string;
}

export class Scene {
    public boxes: RenderBox[] = [];
    public portals: Portal[] = [];
    public activeRoom: string = 'A';

    addBox(box: RenderBox) {
        this.boxes.push(box);
    }

    addPortal(portal: Portal) {
        this.portals.push(portal);
    }

    updateTeleportation(camera: Camera) {
        for (const portal of this.portals) {
            const newRoom = portal.checkCrossing(camera, this.activeRoom);
            if (newRoom) {
                this.activeRoom = newRoom;
                break; // Only allow crossing one portal per frame
            }
        }
    }

    getRenderData(camera: Camera) {
        let closestPortal: Portal | null = null;
        let minDist = Infinity;

        // Find which portal we are currently looking at/closest to
        for (const p of this.portals) {
            if (this.activeRoom === p.roomA || this.activeRoom === p.roomB) {
                const pPos = this.activeRoom === p.roomA ? p.posA : p.posB;
                const dist = Math.abs(camera.pos[2] - pPos[2]);
                if (dist < minDist) {
                    minDist = dist;
                    closestPortal = p;
                }
            }
        }

        if (!closestPortal) return { virtualModels: [], mainModels: [], virtualView: camera.getViewMatrix() };

        const currentPortalPos = this.activeRoom === closestPortal.roomA ? closestPortal.posA : closestPortal.posB;
        const targetPortalPos = this.activeRoom === closestPortal.roomA ? closestPortal.posB : closestPortal.posA;
        const virtualRoom = this.activeRoom === closestPortal.roomA ? closestPortal.roomB : closestPortal.roomA;

        const camOffset = Vec3.sub(camera.pos, currentPortalPos);
        const virtualCamPos = Vec3.add(targetPortalPos, camOffset);

        const virtualModels = this.boxes
            .filter(b => b.room === virtualRoom)
            .map(b => ({ model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)), mult: b.mult }));

        const mainModels = this.boxes
            .filter(b => b.room === this.activeRoom)
            .map(b => ({ model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)), mult: b.mult }));
        
        // Add the active portal quad to punch the hole
        mainModels.push({ 
            model: Mat4.multiply(Mat4.translation(currentPortalPos), Mat4.scaling([4, 3, 0.01])), 
            mult: [1, 1, 1, 1], 
            isPortal: true 
        } as any);

        return { 
            virtualModels, 
            mainModels, 
            virtualView: camera.getVirtualViewMatrix(virtualCamPos) 
        };
    }
}