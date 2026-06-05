import { Engine } from './core/Engine';
import { Mat4 } from './math/Mat4';
import { InputManager } from './input/InputManager';
import { Camera } from './world/Camera';
import { buildWorld1 } from './world/world1';

async function main() {
    let currentLoopRoom = "A";
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new Engine(canvas);
    await engine.init();

    const input = new InputManager(canvas);
    const camera = new Camera();
    
    const scene = buildWorld1(true);

    let portalTarget = engine.createRenderTarget(canvas.width, canvas.height);

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
        portalTarget.texture.destroy();
        portalTarget = engine.createRenderTarget(canvas.width, canvas.height);
    });

    let lastTime = performance.now();
    
    function loop(time: number) {
        const dt = (time - lastTime) / 1000.0;
        lastTime = time;

        camera.update(dt, input);
        scene.updateTeleportation(camera);
        
        if (camera.pos[2] < -10 && currentLoopRoom == "A") {
            console.log("crossed into room B, rebuilding world")
            currentLoopRoom = "B";
        } else if (camera.pos[2] > 0 && currentLoopRoom == "B") {
            console.log("crossed back into room A, rebuilding world")
            currentLoopRoom = "A";
        } 


        const { virtualModels, mainModels, virtualView } = scene.getRenderData(camera);
        const projMatrix = Mat4.perspective(Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);
        const mainView = camera.getViewMatrix();

        engine.render(projMatrix, virtualView, virtualModels, portalTarget.view, undefined);
        engine.render(projMatrix, mainView, mainModels, undefined, portalTarget.view);

        requestAnimationFrame(loop);
    }
    
    requestAnimationFrame(loop);
}

main().catch(console.error);