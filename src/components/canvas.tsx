import { Component, h } from "preact";

import SelectButton from './canvas-button';

let store = {
  canvas: {
    height: 720,
    width: 1080,
    data: {
      // Stuff pertaining lines will be put here?
    }
  },
}

interface CanvasMeta {
  height: number;
  width: number;
}

interface Props{
  id: string;
  canvas: CanvasMeta;
  audioContext: AudioContext;
  colorWaveTypeMap: any;
  pubFn(channel: string, payload: any): void;
}

export default class Canvas extends Component<Props> {

  state = {
    mouseDown: false,
    colorsWaveTypeMap: {
      current: 'sine',
      available: {
        sine: 'aquamarine',
        triangle: 'green',
        square: 'purple',
        sawtooth: 'red',
      }
    }
  }

  samplingFreq = .5;

  colorWaveTypeMap = {
    current: {
      waveType: this.props.colorWaveTypeMap.sine.waveType,
      rgba: this.props.colorWaveTypeMap.sine.rgba
    }, // Corresponds to 
    available: {
      ...this.props.colorWaveTypeMap
    }
  };

  private initFreq = 1000;
  private ctx: any;
  // I know this is messy, but I am testing
  audioSchedulerWorker = new Worker('../workers/audioSchedulerWorker.js');

  firstX = 0;
  firstY = 0;
  lastX = 0;
  lastY = 0;
  // Public
  public handleMouseDown = (e: MouseEvent) => {
    this.setState({ ...this.state, mouseDown: true });
    this.ctx.beginPath();
    this.ctx.moveTo(e.offsetX, e.offsetY);
    this.paint(e.offsetX, e.offsetY);
    this.firstX = e.offsetX;
    this.firstY = e.offsetY;
  }
  
  public handleMouseUp = () => {
    this.setState({ ...this.state, mouseDown: false });
    this.ctx.closePath();
    // Path goes left to right
    if (this.firstX < this.lastX) {
      this.initFreq = 200;
    } else {
      this.initFreq = 700;
    }
    // this.addAudioNodeToMixer(this.initFreq);
  }

  public handleMouseMove = (e: MouseEvent) => {
    if(this.state.mouseDown){
      this.paint(e.offsetX, e.offsetY);
      this.lastX = e.offsetX;
      this.lastY = e.offsetY;
    }
  }

  rgba(rgbaObject: any) {
    const { r, g, b, a }: any = rgbaObject;
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  // Private
  private paint = (x: number, y: number) => {
    if(!this.ctx) return;
    const { current }: any = this.colorWaveTypeMap;

    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = this.rgba(current.rgba);
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  private handleColorChange = (newCurrent: any) => {
    this.colorWaveTypeMap.current = newCurrent;
    console.log(this.colorWaveTypeMap)
  }

  private startAudioWorker = () => {
    console.log("Starting Audio Scheduler Worker");
    this.audioSchedulerWorker.postMessage({
      action: 'START_WORKER',
      data: null
    })

  }

  updateSamplingFrequency = (newSamplingFreq: number) => {
    this.audioSchedulerWorker.postMessage({
      action: 'UPDATE_SAMPFREQ',
      payload: {
        newSamplingFreq
      }
    })
  }

  private updateAudioFreq = (payload: any) => {
    const { current } = this.state.colorsWaveTypeMap;
    // Shim until state can by dynamic
    const waves: any = {
      sine: 'sine',
      triangle: 'triangle',
      square: 'square',
      sawtooth: 'sawtooth'
    };

    this.props.pubFn('mixerEvent', { 
      action: 'UPDATE_OSCFRQ', 
      data: {
        channel: 'sine',
        // channel: waves[current],
        oscData: {
          scheduleAtTime: payload.scheduleAtTime,
          newFreq: payload.freqToPlay
        }
      } 
    })
    // this.props.pubFn(waves[current], { action: 'ADD_NODE', data: null })
  }


  // Lifecylce
  componentDidMount() {
    let test = true;
    let canvasObj: any = document.getElementById(this.props.id);
    if(canvasObj) {
      canvasObj.width = store.canvas.width;
      canvasObj.height = store.canvas.height;
      this.ctx = canvasObj.getContext('2d');
      this.ctx.translate(0.5, 0.5); // For bit anti-aliasing

      // So that way we have some sore of baseline for
      // what to expect from the UI
      // if(test){
      //   this.ctx.fillStyle = 'aquamarine'
      //   this.ctx.fillRect(0, 490, 20, 4);
      // }
    }
    
    const pub = this.props.pubFn;

    this.audioSchedulerWorker.onmessage = (message: any) => {
      // console.log('Got message from audio worker:', message);
      let { action, payload } = message.data;
      if(action === 'GET_CANVAS') {
        // console.log("Sampling Frame: ", parseInt(payload.sliceStart), 0, 4, 500);
        let canvasData = this.ctx.getImageData(parseInt(payload.sliceStart), 0, 4, 500).data;
        let audioCtxTime = this.props.audioContext.currentTime;
        let payloadObject = { 
          action: 'RESP_CANVAS',
          payload: {
            buf: canvasData.buffer,
            currentTime: audioCtxTime
          }
        }

        // Use transferrable feature, which is essentially pass by reference
        // helps with keeping this transaction/handoff efficient
        this.audioSchedulerWorker
          .postMessage(payloadObject, [payloadObject.payload.buf]);
      } else if( action === 'UPDATE_OSCFREQ') {
        // console.log('Updated freq to', payload.freqToPlay);
        this.updateAudioFreq(payload);
      }
    }

    /**
     * What we want to do, is buffer X audio sample slices,
     * that way we do not choke the canvas rendering context
     */
    this.audioSchedulerWorker.postMessage({
      action: 'INIT_WORKER',
      payload: {
        canvasWidth: this.props.canvas.width,
        canvasHeight: this.props.canvas.height,
        samplingBufferLookahead: 32, // Lookahead buffer of pixels
        samplingSliceWidth: 4, // 2 Pixels
        samplingFreq: 441, // This will be the frequency of sampling
      }
    })

  }

  // Otherwise canvas will never render
  // an accurate output
  shouldComponentUpdate(){
    return false;
  }

  public render({ id, canvas, colorWaveTypeMap }: Props) {
    const { available }: {
      available: {}
    } = this.state.colorsWaveTypeMap;
    
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(4, 1fr)'
          }}
        >
          {Object.values(colorWaveTypeMap).map((el: any) => {
            return <SelectButton 
              value={el.waveType}
              waveType={el.waveType}
              bgRgba={el.rgba}
              onClick={this.handleColorChange}
            />
          })}
        </div>
        <canvas
          id={id}
          style={{
            background: 'rgb(91, 91, 91)',
            height: canvas.height,
            width: canvas.width
          }}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          onMouseMove={this.handleMouseMove}
        ></canvas>
        <div
          style={{
            display: 'grid',
            gridTemplateRows: '75% 25%'
          }}
        >
          <input 
            style={{
              // transform: 'rotate(90deg)',
              height: '90%',
              WebkitAppearance: 'slider-vertical'
            }}
            orient="vertical"
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={this.samplingFreq}
            onChange={(e: any) => {
              const val: number = parseFloat(e.target.value);
              this.samplingFreq = val;
              // this.updateAudioFreq(this.samplingFreq * 1000);
              console.log('New Samp', this.samplingFreq * 44100);
              this.updateSamplingFrequency(this.samplingFreq * 44100);
            }}
          />
            <div>
              <button onClick={this.startAudioWorker}>Play</button>
              <button onClick={() => {console.log('Cancel');}}>Pause</button>
            </div>
        </div>
      </div>
    )
  }
}
