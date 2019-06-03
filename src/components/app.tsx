import { Component, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";
import pubsub from '../util/pubsub';

import Canvas from './canvas';
import Mixer from './mixer';

if ((module as any).hot) {
    // tslint:disable-next-line:no-var-requires
    require("preact/debug");
}


let colors = {
  current: 'sine',
  available: {
    sine: 'aquamarine',
    traingle: 'green',
    square: 'purple',
    sawtooth: 'red',
  }
}


let colorWaveTypeMap = {
  sine: {
    waveType: 'sine',
    rgba: {
      r: 2,
      g: 165,
      b: 219,
      a: 204
    }
  },
  triangle: {
    waveType: 'triangle',
    rgba: {
      r: 2,
      g: 165,
      b: 78,
      a: 204
    }
  },
  square: {
    waveType: 'square',
    rgba: {
      r: 219,
      g: 2,
      b: 2,
      a: 204
    }
  },
  sawtooth: {
    waveType: 'sawtooth',
    rgba: {
      r: 183,
      g: 9,
      b: 171,
      a: 204
    }
  }
}


export default class App extends Component {
    public currentUrl?: string;
    public handleRoute = (e: RouterOnChangeArgs) => {
        this.currentUrl = e.url;
    };

    // Application constants
    maxFreq: number = 6000;
    // Kind of arbitrary sizes... for now
    canvasWidth: number = 1080;
    canvasHeight: number = 720;

    // General state object
    state = {
      audioNodes: Object.entries(colors.available)
        .map(([ waveType, color ], i: number) => {
          return {
            id: `ch-${i}`,
            data: {
              color,
              waveType
            }
          }
      })
    }

    /** 
     * One thing that needs to be made available to both
     * the canvas and the audio worker, is the audio context
     */
    audioCtx: AudioContext = new (window.AudioContext || window.webkitAudioContext)();

    /** 
     * Instantiate a new pubsub for updates 
     * across components
    */
    ps = pubsub();

    /**   
     * For making sure each child node is available
     * before pusing any data to each of them
     */
    allNodesStatus: Array<any> = [];

    pushReadyNode = (nodeData: any) => {
      this.allNodesStatus.push(nodeData);
    }

    checkAllNodesMounted = () => {
      if(this.allNodesStatus.length === this.state.audioNodes.length) {
        return true;
      }
      return false;
    }

    pollChildMounted = ({ childId, ready }: { childId: string, ready: boolean }) => {
      this.pushReadyNode({ childId, ready });
      let allNodesStat = this.checkAllNodesMounted()
      
      allNodesStat ?
        console.log("All nodes mounted") :
        console.log("All nodes not mounted");
    } 

    /************************************* */
    componentDidMount() {

    }

    public render() {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row'
          }}
        >
          <Mixer 
            audioContext={this.audioCtx}
            subFn={this.ps.sub}
          />
          <Canvas 
            id={'can-vis'} 
            audioContext={this.audioCtx}
            colorWaveTypeMap={colorWaveTypeMap}
            canvas={{
              height: 720,
              width: 1080,
            }}
            pubFn={this.ps.pub}
          />
        </div>
      );
    }
}
