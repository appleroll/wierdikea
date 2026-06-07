import { Engine } from './core/Engine';
import { Mat4 } from './math/Mat4';
import { InputManager } from './input/InputManager';
import { Camera } from './world/Camera';
import { buildWorld1 } from './world/world1';

async function main() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new Engine(canvas);
    await engine.init();

    const input = new InputManager(canvas);
    const camera = new Camera();
    
    const scene = buildWorld1(true);

    // Keep an array of render targets instead of just one
    let portalTargets: { texture: GPUTexture, view: GPUTextureView }[] = [];

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
        
        // Destroy old textures to prevent memory leaks
        portalTargets.forEach(target => target.texture.destroy());
        portalTargets = []; 
    });

    let lastTime = performance.now();
    
    function loop(time: number) {
        const dt = (time - lastTime) / 1000.0;
        lastTime = time;

        camera.update(dt, input);
        scene.updateTeleportation(camera);

        // NOTE: You will need to update Scene.ts to return an array of portalsData (see step 3 below)
        const { portalsData, mainModels } = scene.getRenderData(camera) as any; 
        
        const projMatrix = Mat4.perspective(Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);
        const mainView = camera.getViewMatrix();

        // Ensure we have enough physical texture targets for the active portals
        while (portalTargets.length < portalsData.length) {
            portalTargets.push(engine.createRenderTarget(canvas.width, canvas.height));
        }

        const activePortalViews: GPUTextureView[] = [];

        // 1. Render each portal's view into its dedicated texture
        portalsData.forEach((pData: any, index: number) => {
            const target = portalTargets[index];
            engine.render(projMatrix, pData.virtualView, pData.virtualModels, target.view, undefined);
            activePortalViews.push(target.view);
        });

        // 2. Render the main room, passing ALL portal textures to the engine
        engine.render(projMatrix, mainView, mainModels, undefined, activePortalViews);

        requestAnimationFrame(loop);
    }
    
    requestAnimationFrame(loop);
}

main().catch(console.error);