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
    _nodes: []
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

  channels: any = {
    sine: channelFactory(0, 'sine'),
    triangle: channelFactory(1, 'triangle'),
    square: channelFactory(2, 'square'),
    sawtooth: channelFactory(3, 'sawtooth'),
  };

  addNodeToChannel(channel: string, initFreq: number) {
    console.log('Adding to:', channel, initFreq);
    this.channels[channel]._nodes.push(
      AudioNodeInstance(
        defaultAudioNodeSettings(
          this.audioCtx,
          channel as OscillatorType,
          initFreq
        )
      )
    );
    const nodesLength = this.channels[channel]._nodes.length;
    this.channels[channel]._nodes[nodesLength - 1].start();
    this.channels[channel].audioAttrs.muted ?
      this.channels[channel]._nodes[nodesLength - 1].mute() :
      null; // Second option suppressed mute
  }

  muteChannelNodes = (channelName: string) => {
    console.log('Muting...', channelName);
    this.channels[channelName].audioAttrs.muted = true;
    this.channels[channelName]._nodes.forEach((node: any) => {
      node.mute();
    })
  }

  unmuteChannelNodes = (channelName: string) => {
    console.log('UnMuting...', channelName);
    this.channels[channelName].audioAttrs.muted = false;
    this.channels[channelName]._nodes.forEach((node: any) => {
      node.unmute();
    })
  }

  updateChannelVol = (channelName: string, newVolume: number) => {
    this.channels[channelName].audioAttrs.volume = newVolume;
    this.channels[channelName]._nodes.forEach((node: any) => {
      node.updateVolume(newVolume, this.audioCtx.currentTime);
    })
  }

  updateNodeFreq = (channelName: string, newFreqPayload: any) => {
    let channel = this.channels[channelName];
    // Want to iterate over the one with the least
    // length to avoid bounds error
    // let iterable = newFreqs.length > channel._nodes.length ?
    //   channel._nodes :
    //   newFreqs;
    const { newFreq, scheduleAtTime } = newFreqPayload;
    // console.log('New Freq Payload', newFreqPayload);
    channel._nodes[0].updateFreq(newFreq, this.audioCtx.currentTime);
    // iterable.forEach((_: any, i: number) => {
    //   channel._nodes[i].updateFreq(newFreqs[i], this.audioCtx.currentTime);
    // });
  }

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
          // console.log('update', data);
          this.updateNodeFreq(data.channel, data.oscData);
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
        channel: 'sine',
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