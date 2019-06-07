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
  subFn(channel: string, payload: any): void;
}

export default class Canvas extends Component<Props> {
  audioSchedulerWorker = new Worker('../workers/audioSchedulerWorker.js');
  state = {
    mouseDown: false
  }
  samplingFreq = .5; // the number of seconds to sample by

  colorWaveTypeMap = {
    current: {
      waveType: this.props.colorWaveTypeMap.sine.waveType,
      rgba: this.props.colorWaveTypeMap.sine.rgba
    }, // Corresponds to 
    available: {
      ...this.props.colorWaveTypeMap
    }
  };

  private ctx: any;

  // firstX = 0;
  // firstY = 0;
  // lastX = 0;
  // lastY = 0;

  // Event 
  /** ~ Event Handlers ~ **/

  handleColorChange = (newCurrent: any) => {
    this.colorWaveTypeMap.current = newCurrent;
  }

  handleMouseDown = (e: MouseEvent) => {
    this.setState({ ...this.state, mouseDown: true });
    this.ctx.beginPath();
    this.ctx.moveTo(e.offsetX, e.offsetY);
    this.paint(e.offsetX, e.offsetY);
  }
  
  handleMouseUp = () => {
    this.setState({ ...this.state, mouseDown: false });
    this.ctx.closePath(); // Stops the paint
  }

  handleMouseMove = (e: MouseEvent) => {
    if(this.state.mouseDown){
      this.paint(e.offsetX, e.offsetY);
    }
  }

  /** ~ Utilities ~ **/

  rgba(rgbaObject: any) {
    const { r, g, b, a }: any = rgbaObject;
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  private paint = (x: number, y: number) => {
    if(!this.ctx) return;

    const { current }: any = this.colorWaveTypeMap;
    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = this.rgba(current.rgba);
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  private startAudioWorker = () => {
    // Tells the web worker to poll
    // the canvas for data and start
    // scheduling bits to send to mixer
    this.audioSchedulerWorker.postMessage({
      action: 'START_WORKER',
      data: null
    })
  }

  private updateSamplingFrequency = (newSamplingFreq: number) => {
    this.audioSchedulerWorker.postMessage({
      action: 'UPDATE_SAMPFREQ',
      payload: {
        newSamplingFreq
      }
    })
  }

  private updateAudioFreq = (payload: any) => {
    // Payload is of the format:
    // { 'color-fmt-string': newFreqValue, ... }
    this.props.pubFn('mixerEvent', { 
      action: 'UPDATE_OSCFRQ', 
      data: payload
    })
  }


  /** ~ Lifecycle methods ~ **/

  componentDidMount() {

    let canvasObj: any = document.getElementById(this.props.id);
    if(canvasObj) {
      canvasObj.width = store.canvas.width;
      canvasObj.height = store.canvas.height;
      this.ctx = canvasObj.getContext('2d');
      this.ctx.translate(0.5, 0.5); // For bit anti-aliasing
    }

    this.audioSchedulerWorker.onmessage = (message: any) => {

      let { action, payload } = message.data;
      if(action === 'GET_CANVAS') {

        let canvasData = this.ctx.getImageData(parseInt(payload.sliceStart), 0, 4, this.props.canvas.height).data;
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

      } else if( action === 'UPDATE_OSCFRQ') {

        this.updateAudioFreq(payload);
      }
      // At this point, nothing to do
      // the command given is not valid
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
        samplingBufferLookahead: 32, // Lookahead buffer of pixels -> not used at the moment
        samplingSliceWidth: 4, // 1 Pixel, due to a pixel being composed of a 4x4 pixel area
        samplingFreq: 4410, // This will be the initial frequency of sampling the canvas
      }
    })

  }

  // Keeps component from re-rendering, otherwise canvas will never render
  // an accurate output
  shouldComponentUpdate(){
    return false;
  }

  public render({ id, canvas, colorWaveTypeMap }: Props) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row'
        }}
      >
        <div
          className={`canvas-button__container`}
        >
          {Object.values(colorWaveTypeMap).map((el: any, index: number) => {
            return <SelectButton
              value={el.waveType}
              waveType={el.waveType}
              bgRgba={el.rgba}
              active={index === 0 ? true : false}
              onClick={this.handleColorChange}
              pubFn={this.props.pubFn}
              subFn={this.props.subFn}
            />
          })}
        </div>
        <canvas
          className={`app-canvas`}
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
              height: '90%',
              WebkitAppearance: 'slider-vertical'
            }}
            orient="vertical" // Only for Firefox
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={this.samplingFreq}
            onChange={(e: any) => {
              const val: number = parseFloat(e.target.value);
              this.samplingFreq = val;
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
