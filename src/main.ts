import { Engine } from './core/Engine';
import { Mat4 } from './math/Mat4';
import { InputManager } from './input/InputManager';
import { Camera } from './world/Camera';
import { buildWorld1 } from './world/world1';
import {loadSound, playLoop} from './audio/Audio';

async function main() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new Engine(canvas);
    await engine.init();

    const input = new InputManager(canvas);
    const camera = new Camera();
    
    const scene = buildWorld1(true);

    const ikeaAmbience = await loadSound("IKEATUNE.wav");
    playLoop(ikeaAmbience);


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

        const projMatrix = Mat4.perspective(Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);

        // 1. Get the flat list of rendering jobs (Depth 2 = Portal inside a Portal)
        const { jobs, totalTextures } = scene.getRenderJobs(camera, 4); 

        // 2. Dynamically ensure we have exactly enough textures allocated
        while (portalTargets.length < totalTextures) {
            portalTargets.push(engine.createRenderTarget(canvas.width, canvas.height));
        }
        
        // Pass ALL available textures to the engine so the shader can sample any of them
        const allTextureViews = portalTargets.map(t => t.view);

        // 3. Execute jobs. Because of our recursive function, deepest rooms render first!
        jobs.forEach((job: any) => {
            if (job.isMain) {
                // Render main room directly to canvas
                engine.render(projMatrix, job.view, job.models, undefined, allTextureViews);
            } else {
                // Render virtual room into its dynamically assigned texture
                const targetView = portalTargets[job.targetIndex].view;
                engine.render(projMatrix, job.view, job.models, targetView, allTextureViews);
            }
        });

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

main().catch(console.error);