import { Component, h } from "preact";
import soundScheduler from '../util/scheduler';

let store = {
  canvas: {
    height: 500,
    width: 800,
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
  publish(channel: string, payload: any): void;
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
    this.addAudioNodeToMixer(this.initFreq);
  }

  public handleMouseMove = (e: MouseEvent) => {
    if(this.state.mouseDown){
      this.paint(e.offsetX, e.offsetY);
      this.lastX = e.offsetX;
      this.lastY = e.offsetY;
    }
  }

  // Private
  private paint = (x: number, y: number) => {
    if(!this.ctx) return;
    const { current, available }: any = this.state.colorsWaveTypeMap;

    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = available[current];
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  private handleSelectChange = (e: Event) => {
    const target: any = e.target;
    target && target.value ?
      this.setState({ ...this.state, colorsWaveTypeMap: { 
        current: target.value,
        available: this.state.colorsWaveTypeMap.available
      }}):
      null;
  }

  private printCanvas = () => {
    // const { height, width } = this.props.canvas;
    // const ctx = this.ctx.getImageData(0, 0, height, width);
    // let pixelBuff: number[] = [];
    // console.log(ctx.data.filter((el: number, i: number): boolean => {
    //   if (el > 0 ) {
    //     pixelBuff.push(i);
    //     return true;
    //   }
    //   return false
    // }))
    // console.log(pixelBuff);

    // this.props.publish('ch-1', { action: 'UPDATE_FREQ', data: this.initFreq})
    // this.initFreq -= 100;
    console.log("Starting Audio Scheduler Worker");
    this.audioSchedulerWorker.postMessage({
      action: 'START_WORKER',
      data: null
    })

  }

  private addAudioNodeToMixer = (initFreq: number) => {
    const { current } = this.state.colorsWaveTypeMap;
    // Shim until state can by dynamic
    const waves: any = {
      sine: 'sine',
      triangle: 'triangle',
      square: 'square',
      sawtooth: 'sawtooth'
    };

    this.props.publish('mixerEvent', { 
      action: 'ADD_OSC', 
      data: {
        channel: waves[current],
        initFreq
      } 
    })
    // this.props.publish(waves[current], { action: 'ADD_NODE', data: null })
  }

  freqVal = 440;
  private updateAudioFreq = (freqs: number) => {
    const { current } = this.state.colorsWaveTypeMap;
    // Shim until state can by dynamic
    const waves: any = {
      sine: 'sine',
      triangle: 'triangle',
      square: 'square',
      sawtooth: 'sawtooth'
    };

    this.props.publish('mixerEvent', { 
      action: 'UPDATE_OSCFRQ', 
      data: {
        channel: waves[current],
        newFreqs: [freqs, freqs * 4, freqs * 5, freqs * 6]
      } 
    })
    // this.props.publish(waves[current], { action: 'ADD_NODE', data: null })
  }

  private pushComputedFrequenciesToNodes = () => {

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
      if(test){
        this.ctx.fillStyle = 'aquamarine'
        this.ctx.fillRect(0, 0, 20, 4);
      }
    }
    
    const pub = this.props.publish;

    this.audioSchedulerWorker.onmessage = (message: any) => {
      // console.log('Got message from audio worker:', message);
      if(message.data.action === 'GET_CANVAS') {
        let canvasData = this.ctx.getImageData(0, 0, 256, 500).data;
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
        this.audioSchedulerWorker.postMessage(payloadObject, [payloadObject.payload.buf]);
      }
    }

    /**
     * What we want to do, is buffer X audio sample slices,
     * that way we do not choke the canvas rendering context
     */
    this.audioSchedulerWorker.postMessage({
      action: 'INIT_WORKER',
      payload: {
        // canvasCtx: canvasObj.getContext('2d'),
        canvasWidth: store.canvas.width,
        canvasHeight: store.canvas.height,
        samplingBufferLookahead: 32, // Lookahead buffer of 32ms
        samplingSliceWidth: 8,
        samplingFreq: 4410, // This will be the frequency of sampling
        // samplingFreq: 44100, // This will be the frequency of sampling
      }
    })

  }

  // Otherwise canvas will never render
  // an accurate output
  shouldComponentUpdate(){
    return false;
  }

  public render({ id, canvas }: Props) {
    const { available }: {
      available: {}
    } = this.state.colorsWaveTypeMap;
    
    return (
      <div>
        <canvas
          id={id}
          style={{
            background: 'lightgrey',
            height: canvas.height,
            width: canvas.width
          }}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          onMouseMove={this.handleMouseMove}
        ></canvas>
        <select onChange={this.handleSelectChange}>
          {Object.entries(available).map(([ waveType, color ]) => <option value={waveType}>{color}</option>)}
        </select>
        <div>
          <button onClick={this.printCanvas}>Show canvas data</button>
          <button onClick={() => {
            console.log('Cancel');
          }}>Cancel</button>
          <input 
            type="range" 
             min="0" 
             max="1" 
             step="0.01"
             value={this.freqVal}
             onChange={(e) => {
               const val: number = parseFloat(e.target.value);
               this.freqVal = val;
               this.updateAudioFreq(this.freqVal * 1000);
             }}
            />
        </div>
      </div>
    )
  }
}
