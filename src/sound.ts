// Key sounds synthesized with Web Audio, so there are no audio files to ship.

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function init(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
  }
  return ctx;
}

export function playKey(kind: "click" | "soft"): void {
  const c = init();
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.85 + Math.random() * 0.3;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = kind === "click" ? 3200 : 1100;
  filter.Q.value = kind === "click" ? 1.2 : 0.7;
  const gain = c.createGain();
  gain.gain.value = kind === "click" ? 0.55 : 0.8;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}
