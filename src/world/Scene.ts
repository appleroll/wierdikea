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
        const portalsData: { virtualModels: any[], virtualView: Float32Array }[] = [];
        
        // 1. Get all the standard models for the room we are currently standing in
        const mainModels: any[] = this.boxes
            .filter(b => b.room === this.activeRoom)
            .map(b => ({ 
                model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)), 
                mult: b.mult 
                // portalIndex is naturally undefined here, which the engine handles
            }));

        // 2. Find ALL portals connected to our current active room
        const activePortals = this.portals.filter(p => this.activeRoom === p.roomA || this.activeRoom === p.roomB);

        // 3. Loop through every active portal and generate its specific view data
        activePortals.forEach((portal, index) => {
            const currentPortalPos = this.activeRoom === portal.roomA ? portal.posA : portal.posB;
            const targetPortalPos = this.activeRoom === portal.roomA ? portal.posB : portal.posA;
            const virtualRoom = this.activeRoom === portal.roomA ? portal.roomB : portal.roomA;

            // Calculate where the camera *would* be inside the target room
            const camOffset = Vec3.sub(camera.pos, currentPortalPos);
            const virtualCamPos = Vec3.add(targetPortalPos, camOffset);

            // Get the geometry for the room this specific portal is looking into
            const virtualModels = this.boxes
                .filter(b => b.room === virtualRoom)
                .map(b => ({ 
                    model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)), 
                    mult: b.mult 
                }));

            // Store this portal's specific rendering data
            portalsData.push({ 
                virtualModels, 
                virtualView: camera.getVirtualViewMatrix(virtualCamPos) 
            });

            // 4. Orient the physical portal quad based on the portal's axis
            const scaleX = portal.axis === 'X' ? 0.01 : portal.width;
            const scaleZ = portal.axis === 'X' ? portal.width : 0.01;

            mainModels.push({ 
                model: Mat4.multiply(Mat4.translation(currentPortalPos), Mat4.scaling([scaleX, portal.height, scaleZ])), 
                mult: [1, 1, 1, 1], 
                portalIndex: index
            });
        });

        return { 
            portalsData, 
            mainModels 
        };
    }
}