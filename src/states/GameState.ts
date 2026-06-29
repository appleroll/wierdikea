import {loadSound, playLoop} from '../audio/Audio';
export type GameState = "menu" | "playing";
export let currentGameState: GameState = "menu";

document.getElementById("start")!.onclick = async () => {
    currentGameState = "playing";
    document.getElementById("menu")!.style.display = "none";

    const ikeaAmbience = await loadSound("IKEATUNE.wav");
    playLoop(ikeaAmbience);
};