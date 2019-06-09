export interface IAudioNodeInstance {
  audioCtx: AudioContext;
  waveType: OscillatorType;
  currFreq: number;
  maxVolume: number;
  fxChain?: any[];
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
  const osc = audioCtx.createOscillator();
  const currentFreq = currFreq;
  let startedStatus = false;
  osc.type = waveType || 'sine';
  osc.frequency.setValueAtTime(currentFreq, audioCtx.currentTime);

  // Create a gain node and attach it to the Oscillator node
  const gainNode = audioCtx.createGain();
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
    startedStatus = true;
    osc.start();
  }

  const started = () => {
    return startedStatus;
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
    started,
    mute,
    unmute,
    updateFreq,
    updateVolume
  }
}
