import { Component, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";
import pubsub from '../util/pubsub';

import Canvas from './canvas';
import Mixer from './mixer';

if ((module as any).hot) {
    // tslint:disable-next-line:no-var-requires
    require("preact/debug");
}

// To get freq by value,
// from the data sent back by the worker,
// compare the keys of object against each
// color value (rgb) rounded to the tenth
let colorWaveTypeMap = {
  sine: {
    waveType: 'sine',
    rgba: {
      r: 2,
      g: 165,
      b: 219,
      a: 255
    }
  },
  triangle: {
    waveType: 'triangle',
    rgba: {
      r: 2,
      g: 165,
      b: 78,
      a: 255
    }
  },
  square: {
    waveType: 'square',
    rgba: {
      r: 215,
      g: 2,
      b: 2,
      a: 255
    }
  },
  sawtooth: {
    waveType: 'sawtooth',
    rgba: {
      r: 247,
      g: 75,
      b: 138,
      a: 255
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

    /** 
     * One thing that needs to be made available to both
     * the canvas and the audio worker, is the audio context
     */
    audioCtx: AudioContext = new (window.AudioContext || window.webkitAudioContext)();

    /** 
     * Instantiate a new pubsub buss for updates 
     * across components
    */
    ps = pubsub();

    public render() {
      return (
        <div
          className={`app app-container`}
          style={{
            display: 'flex',
            flexDirection: 'row'
          }}
        >
          <Mixer 
            audioContext={this.audioCtx}
            colorWaveTypeMap={colorWaveTypeMap}
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
            subFn={this.ps.sub}
          />
        </div>
      );
    }
}
