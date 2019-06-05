import { Component, h } from "preact";


// Imports
import { AudioNodeInstance, IAudioNodeInstance } from '../util/audioNode';
import MixerChannel from './mixer-channel';

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

const defaultAudioNodeSettings = (
  audioContext: AudioContext, 
  waveType: OscillatorType,
  initFreq: number
): IAudioNodeInstance => {
  return {
    audioCtx: audioContext,
    waveType,
    maxVolume: 0.2 * 0.2,
    currFreq: initFreq
  }
}

export default class AudioMixer extends Component<any, any> {
  
  audioCtx: any;
  
  channelDefaults: any = {
    volRangeStep: 0.01
  }

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
    // console.log('Adding to:', channel, initFreq);
    // this.channels[channel]._nodes.push(
      
    // );
    let ch = this.channels[channel];
    console.log('Adding:', ch.name);
    ch.node = AudioNodeInstance(
      defaultAudioNodeSettings(
        this.audioCtx,
        ch.name as OscillatorType,
        initFreq
      )
    );
    // const nodesLength = this.channels[channel]._nodes.length;
    ch.node.start();
    ch.audioAttrs.muted ?
      ch.node.mute():
      null; // Second option suppressed mute
  }

  muteChannelNodes = (channel: string) => {
    console.log('Muting...', channel);
    this.channels[channel].audioAttrs.muted = true;
    this.channels[channel].node.mute();
  }

  unmuteChannelNodes = (channel: string) => {
    console.log('UnMuting...', channel);
    this.channels[channel].audioAttrs.muted = false;
    this.channels[channel].node.unmute();
  }

  updateChannelVol = (channel: string, newVolume: number) => {
    this.channels[channel].audioAttrs.volume = newVolume;
    this.channels[channel].node.updateVolume(newVolume, this.audioCtx.currentTime);
  }

  updateNodeFreq = (freqData: any) => {
    // let channel = this.channels[channelName];
    // const { newFreq, scheduleAtTime } = newFreqPayload;
    // channel._nodes[0].updateFreq(newFreq, this.audioCtx.currentTime + scheduleAtTime);
    // iterable.forEach((_: any, i: number) => {
    //   channel._nodes[i].updateFreq(newFreqs[i], this.audioCtx.currentTime);
    // });
    if(freqData) {
      // console.log('Freq Data', freqData);
    }
    Object.entries(freqData).forEach(([ color, freq ]) => {
      if(this.channels[color].node){
        if(freq && typeof freq === 'number'){
          console.log('Freq', freq);
          this.channels[color].node.updateFreq(freq, this.audioCtx.currentTime);
          if(this.channels[color].audioAttrs.muted) {
            // this.channels[color].node.unmute();
            // this.channels[color].node.audioAttrs.muted = false;
          }
        } else {
          // this.channels[color].node.mute();
          // this.channels[color].node.audioAttrs.muted = true;
        }
      }
    })
  }

  counter = 0;
  // This fuction is mainly implemented to provide an
  // interface event 'parser' between the canvas and mixer
  decideAction = (ev: any) => {
    const { action, data }: 
      { 
        action: string, 
        data: any
      } = ev;
      switch(action) {
        case 'ADD_OSC':
          console.log('add');
          this.addNodeToChannel(data.channel || 'sine', data.initFreq || 440);
          break;
        case 'UPDATE_OSCFRQ':
          // console.log('counter: ', this.counter)
          if(data[this.sinKey] || data[this.triKey] || data[this.squKey] || data[this.sawKey]) {
            // console.log('Update:', data);
          }
          this.counter += 1;
          this.updateNodeFreq(data);
          // console.log('update');
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
     */
    subFn('mixerEvent', (ev: any) => {
      this.decideAction(ev);
    })
  }

  render() {
    return (
      <div
        style={{
          alignItems: 'center',
          display: 'grid',
          gridTemplateRows: 'repeat(4, 1fr)'
        }}
      >
        {/* <h3>MIXER</h3>
        <button onClick={() => {
          console.log(this.channels);
        }}>show</button> */}
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