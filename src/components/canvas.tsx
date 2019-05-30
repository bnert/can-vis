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
        traingle: 'green',
        square: 'purple',
        sawtooth: 'red',
      }
    }
  }

  private initFreq = 1000;
  private ctx: any;
  // I know this is messy, but I am testing
  audioSchedulerWorker = new Worker('../workers/audioSchedulerWorker.js');

  // Public
  public handleMouseDown = (e: MouseEvent) => {
    this.setState({ ...this.state, mouseDown: true });
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX, e.clientY);
    this.paint(e.clientX, e.clientY);
    this.createAudioNode();
  }

  public handleMouseUp = () => {
    this.setState({ ...this.state, mouseDown: false });
    this.ctx.closePath();
  }

  public handleMouseMove = (e: MouseEvent) => {
    if(this.state.mouseDown){
      this.paint(e.clientX, e.clientY);
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

  private createAudioNode = () => {
    const { current } = this.state.colorsWaveTypeMap;
    // Shim until state can by dynamic
    const waves: any = {
      sine: 'ch-0',
      traingle: 'ch-1',
      square: 'ch-2',
      sawtooth: 'ch-3'
    };

    this.props.publish(waves[current], { action: 'ADD_NODE', data: null })
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
      console.log('Got message from audio worker:', message);
      if(message.data.action === 'GET_CANVAS') {
        let canvasData = this.ctx.getImageData(0, 0, 256, 500).data;
        let canvasDataBuffer = new ArrayBuffer(canvasData.buffer);
        let audioCtxTime = this.props.audioContext.currentTime;
        console.log(canvasData);
        // console.log(canvasData.buffer);
        let cv = new Uint8Array(canvasData);
        // console.log(cv);
        // let bf = cv.buffer;
        // console.log('bf', bf);
        
        let payloadObject = { 
          action: 'RESP_CANVAS',
          payload: {
            buf: canvasData.buffer,
            currentTime: audioCtxTime
          }
        }
        console.log(canvasData.buffer);
        console.log('Sending data to worker');
        // console.log({ ...payloadObject, c: canvasData.buffer });
        console.log(payloadObject);
        console.log(canvasData.buffer);
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
        samplingBufferSize: 32, // Lookahead buffer of 32ms
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
        </div>
      </div>
    )
  }
}
