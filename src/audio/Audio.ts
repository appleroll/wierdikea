const audioContext = new AudioContext();

export async function loadSound(url: string) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}

export function playLoop(buffer: AudioBuffer, volume = 0.1) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    volume = parseInt((document.getElementById('volume-slider') as HTMLInputElement).value) / 100;

    const gain = audioContext.createGain();
    gain.gain.value = volume; 

    source.connect(gain);
    gain.connect(audioContext.destination);

    source.start();

    return { source, gain };
}