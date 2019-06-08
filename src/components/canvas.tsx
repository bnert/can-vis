import { Component, h } from "preact";

import CanvasButton from './canvas-button';

const store = {
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
  public audioSchedulerWorker = new Worker('../workers/audioSchedulerWorker.js');
  public state = {
    mouseDown: false
  }
  public samplingFreq = .5; // the number of seconds to sample by

  // Used to set the color needed to paint to the canvas
  public colorWaveTypeMap = {
    current: {
      waveType: this.props.colorWaveTypeMap.sine.waveType,
      rgba: this.props.colorWaveTypeMap.sine.rgba
    }, 
    available: {
      ...this.props.colorWaveTypeMap
    }
  };

  private ctx: any;

  /** ~ Event Handlers ~ **/

  public handleColorChange = (newCurrent: any) => {
    this.colorWaveTypeMap.current = newCurrent;
  }

  public handleMouseDown = (e: MouseEvent) => {
    this.setState({ ...this.state, mouseDown: true });
    this.ctx.beginPath();
    this.ctx.moveTo(e.offsetX, e.offsetY);
    this.paint(e.offsetX, e.offsetY);
  }
  
  public handleMouseUp = () => {
    this.setState({ ...this.state, mouseDown: false });
    this.ctx.closePath(); // Stops the paint
  }

  public handleMouseMove = (e: MouseEvent) => {
    if(this.state.mouseDown){
      this.paint(e.offsetX, e.offsetY);
    }
  }

  /** ~ Utilities ~ **/

  rgba(rgbaObject: any) {
    const { r, g, b, a }: any = rgbaObject;
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  paint = (x: number, y: number) => {
    if(!this.ctx) { return; }

    const { current }: any = this.colorWaveTypeMap;
    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = this.rgba(current.rgba);
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  startAudioWorker = () => {
    // Tells the web worker to poll
    // the canvas for data and start
    // scheduling bits to send to mixer
    this.audioSchedulerWorker.postMessage({
      action: 'START_WORKER',
      data: null
    })
  }

  stopAudioWorker = () => {
    // Need to send the signal to
    // cancel current scheduled timeouts
    this.audioSchedulerWorker.postMessage({
      action: 'STOP_WORKER',
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

  updateAudioFreq = (payload: any) => {
    // Payload is of the format:
    // { 'color-fmt-string': newFreqValue, ... }
    this.props.pubFn('mixerEvent', { 
      action: 'UPDATE_OSCFRQ', 
      data: payload
    })
  }

  /** ~ Lifecycle methods ~ **/

  public componentDidMount() {

    const canvasObj: any = document.getElementById(this.props.id);
    if(canvasObj) {
      canvasObj.width = store.canvas.width;
      canvasObj.height = store.canvas.height;
      this.ctx = canvasObj.getContext('2d');
      this.ctx.translate(0.5, 0.5); // For bit anti-aliasing
    }

    this.audioSchedulerWorker.onmessage = (message: any) => {

      const { action, payload } = message.data;
      if(action === 'GET_CANVAS') {

        const canvasData = this.ctx.getImageData(parseInt(payload.sliceStart), 0, 4, this.props.canvas.height).data;
        const audioCtxTime = this.props.audioContext.currentTime;
        const payloadObject = { 
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
  public shouldComponentUpdate(){
    return false;
  }

  public render({ id, canvas, colorWaveTypeMap }: Props) {
    return (
      <div
        className={`app-canvas`}
      >
        <div
          className={`canvas-button__container`}
        >
          {Object.values(colorWaveTypeMap).map((el: any, index: number) => {
            return <CanvasButton
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
          className={`app-canvas__canvas`}
          id={id}
          style={{
            height: canvas.height,
            width: canvas.width
          }}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          onMouseMove={this.handleMouseMove}
        ></canvas>
        <div
          className={`canvas-controls`}
          // style={{
          //   display: 'grid',
          //   gridTemplateRows: '75% 25%'
          // }}
        >
          <input
            className={`canvas-controls__tempo-slider`}
            orient="vertical" // Only for Firefox, gives error
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
          <div 
            className={`canvas-controls__play-pause`}
          >
            <button 
              className={`play-pause__btn play-pause__play`}
              onClick={() => {
                this.props.pubFn('mixerEvent', { action: 'INIT_OSC' });
                this.startAudioWorker();
              }}
            ></button>
            <button 
              className={`play-pause__btn play-pause__stop`}
              onClick={() => {
                // Send event to mixer to stop the audio context
                this.props.pubFn('mixerEvent', { action: 'CTX_SUSPEND' });
                this.stopAudioWorker();
              }}
            ></button>
          </div>
        </div>
      </div>
    )
  }
}
