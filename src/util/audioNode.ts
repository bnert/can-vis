export interface IAudioNodeInstance {
  audioCtx: AudioContext;
  waveType: OscillatorType;
  currFreq: number;
  maxVolume: number;
  fxChain?: any[];
}

type IAudioNodeInstanceReturn = {
  oscInst(): OscillatorNode;
  start(): void;
  mute(): void;
  unmute(): void;
  updateFreq(newFreq: number, atTime: number): void;
  updateVolume(newVol: number): void;
}

export const AudioNodeInstance = (
  configOpts: IAudioNodeInstance
) => {
  const {
    audioCtx,
    waveType,
    currFreq,
    maxVolume,
    fxChain
  } = configOpts;

  // Oscillator specific config
  let osc = audioCtx.createOscillator();
  let currentFreq = currFreq;
  osc.type = waveType || 'sine';
  osc.frequency.setValueAtTime(currentFreq, audioCtx.currentTime);

  // Create a gain node and attach it to the Oscillator node
  let gainNode = audioCtx.createGain();
  osc.connect(gainNode); // Funnesl oscillator output to the gainNode output
  gainNode.connect(audioCtx.destination);
  gainNode.gain.setValueAtTime(maxVolume * .2, audioCtx.currentTime);

  // Modifiers
  // This'll be used to "smooth" transition between values
  const rampTimeMod = .005; // 10ms

  // Create functions to pass back
  const oscInst = () => {
    return osc;
  }

  const start = () => {
    osc.start();
  }

  const mute = () => {
    osc.disconnect();
  }

  const unmute = () => {
    osc.connect(gainNode);
  }

  const updateFreq = (newFreq: number, currentAudioCtxTime: number) => {
    osc.frequency.linearRampToValueAtTime(newFreq, currentAudioCtxTime + rampTimeMod);
  }

  const updateVolume = (newVol: number, currentAudioCtxTime: number) => {
    gainNode.gain.linearRampToValueAtTime(newVol * maxVolume, currentAudioCtxTime + rampTimeMod);
  }

  return {
    oscInst,
    start,
    mute,
    unmute,
    updateFreq,
    updateVolume
  }
}
