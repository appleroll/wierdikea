import {currentGameState} from "../states/GameState";
export class InputManager {
    private keys = new Set<string>();
    private movementX = 0;
    private movementY = 0;
    private canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        
        window.addEventListener('keydown', e => this.keys.add(e.key.toLowerCase()));
        window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
        
        canvas.addEventListener('click', () => {
            if (currentGameState === "playing" && document.pointerLockElement !== this.canvas) {
                this.canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === this.canvas) {
                this.movementX += e.movementX;
                this.movementY += e.movementY;
            }
        });
    }

    isKeyDown(key: string): boolean {
        return this.keys.has(key);
    }

    getMouseDelta() {
        const mx = this.movementX;
        const my = this.movementY;
        this.movementX = 0;
        this.movementY = 0;
        return { mx, my };
    }
}