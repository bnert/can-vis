import { Component, h } from "preact";

// Imports
import { AudioNodeInstance, IAudioNodeInstance } from '../util/audioNode';
import MixerChannel from './mixer-channel';

/**
 * Initializes an object which will hold values for interfacing
 * with an audio node.
 * 
 * @param channelNumber -> what to call a channel (used for html)
 * @param name -> this will be how we call the channel in code
 */
const channelFactory = (channelNumber: number, name: string) => {
  return {
    id: `ch-${channelNumber}`,
    name,
    audioAttrs: {
      volume: .2,
      muted: true
    },
    node: null
  }
}

/**
 * 
 * @param audioContext -> current audion context, hosted as class attribute
 * @param waveType -> one of four (sine, triangle, square, saw)
 * @param initFreq -> initial frequency
 */
const defaultAudioNodeSettings = (
  audioContext: AudioContext, 
  waveType: OscillatorType,
  initFreq: number
): IAudioNodeInstance => {
  return {
    audioCtx: audioContext,
    waveType,
    maxVolume: 0.2 * 0.2, // Used for initial value as well
    currFreq: initFreq
  }
}

export default class AudioMixer extends Component<any, any> {
  
  // We don't want this to be in the typical 'state'
  // due to we don't want it to be mutated after it's assigned
  audioCtx: any; 

  channelDefaults: any = {
    volRangeStep: 0.01
  }

  // Transfer to inherit from parent component?
  sinKey = '0-160-210';
  triKey = '0-160-70';
  squKey = '210-0-0';
  sawKey = '240-70-130';

  channels: any = {
    [this.sinKey]: channelFactory(0, 'sine'),
    [this.triKey]: channelFactory(1, 'triangle'),
    [this.squKey]: channelFactory(2, 'square'),
    [this.sawKey]: channelFactory(3, 'sawtooth'),
  };

  addNodeToChannel(channel: string, initFreq: number) {
    let ch = this.channels[channel];
    console.log('Adding:', ch.name);
    ch.node = AudioNodeInstance(
      defaultAudioNodeSettings(
        this.audioCtx,
        ch.name as OscillatorType,
        initFreq
      )
    );

    ch.node.start();
    ch.audioAttrs.muted ?
      ch.node.mute():
      null; // Second option suppressed mute
  }

  muteChannelNodes = (channel: string) => {
    // Audio attrs is for reference
    this.channels[channel].audioAttrs.muted = true;
    this.channels[channel].node.mute();
  }

  unmuteChannelNodes = (channel: string) => {
    // Audio attrs is for reference
    this.channels[channel].audioAttrs.muted = false;
    this.channels[channel].node.unmute();
  }

  updateChannelVol = (channel: string, newVolume: number) => {
    this.channels[channel].audioAttrs.volume = newVolume;
    this.channels[channel].node.updateVolume(newVolume, this.audioCtx.currentTime);
  }

  updateNodeFreq = (freqData: any) => {
    // Grab the sent color from each frequency and funnel into
    // updating the oscillator node
    Object.entries(freqData).forEach(([ color, freq ]) => {
      if(this.channels[color].node){
        if(freq && typeof freq === 'number'){
          this.channels[color].node.updateFreq(freq, this.audioCtx.currentTime);
        }
      }
    })
  }

  // This fuction is mainly implemented as a
  // 'message broker' for incoming event messages
  decideAction = (ev: any) => {
    const { action, data }: 
      { 
        action: string, 
        data: any
      } = ev;
      switch(action) {
        case 'ADD_OSC':
          // Duck type as a backup
          this.addNodeToChannel(data.channel || 'sine', data.initFreq || 440);
          break;
        case 'UPDATE_OSCFRQ':
          this.updateNodeFreq(data);
          break;
        default:
          console.log(`Mixer: ${action} action not specified`);
          console.log(ev);
          return;
      }

  }

  componentDidMount() {
    const { subFn, audioContext }: any = this.props;
    this.audioCtx = audioContext;

    this.decideAction({
      action: 'ADD_OSC',
      data: {
        channel: this.sinKey,
        initFreq: 200
      }
    })
    this.decideAction({
      action: 'ADD_OSC',
      data: {
        channel: this.triKey,
        initFreq: 200
      }
    })
    this.decideAction({
      action: 'ADD_OSC',
      data: {
        channel: this.squKey,
        initFreq: 200
      }
    })
    this.decideAction({
      action: 'ADD_OSC',
      data: {
        channel: this.sawKey,
        initFreq: 200
      }
    })

    /**
     * Setup Subscription receiver
     * on channel: mixerEvent
     * 
     * The data being passed here is from the Canvas Element.
     */
    subFn('mixerEvent', (evData: any) => {
      this.decideAction(evData);
    });
  }

  render() {
    return (
      <div
        className={`site-mixer`}
        style={{
          alignItems: 'center',
          display: 'grid',
          gridTemplateRows: 'repeat(4, 1fr)'
        }}
      >
        {Object.entries(this.channels).map(channel => {
          return <MixerChannel 
            // Values  
            channelName={channel[0]}
            {...channel[1]} 
            {...this.channelDefaults}
            // Functions
            handleMute={this.muteChannelNodes}
            handleUnMute={this.unmuteChannelNodes}
            handleVolumeChange={this.updateChannelVol}
          />
        })}
      </div>
    )
  }
}