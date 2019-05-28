import { Component, h } from "preact";
import soundScheduler from '../util/scheduler';

let store = {
  canvas: {
    height: 500,
    width: 700,
    data: {
      // Stuff pertaining lines will be put here?
    }
  },
}

const colorsWaveTypeMap = {
  red: [244, 36, 36, 1]
}



interface CanvasMeta {
  height: number;
  width: number;
}

interface Props{
  id: string;
  canvas: CanvasMeta;
  publish(channel: string, payload: any): void;
}

export default class Canvas extends Component<Props> {
  // public height: string = store.canvas.height;
  // public width: string = store.canvas.width;
  public state = {
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
  private ctx: any;
  private scheduling: any;

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

  initFreq = 1000;

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
    this.props.publish('ch-1', { action: 'UPDATE_FREQ', data: this.initFreq})
    this.initFreq -= 100;
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

  // Lifecylce
  componentDidMount() {
    let canvasObj: any = document.getElementById(this.props.id);
    if(canvasObj) {
      canvasObj.width = store.canvas.width;
      canvasObj.height = store.canvas.height;
      this.ctx = canvasObj.getContext('2d');
      this.ctx.translate(0.5, 0.5); // For bit anti-aliasing
    }
    this.scheduling = soundScheduler({
      canvasCtx: canvasObj.getContext('2d'),
      canvasWidth: store.canvas.width,
      canvasHeight: store.canvas.height,
      samplingSliceWidth: 10,
    });

    this.scheduling.start();
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
            this.scheduling.cancel();
          }}>Cancel</button>
        </div>
      </div>
    )
  }
}
