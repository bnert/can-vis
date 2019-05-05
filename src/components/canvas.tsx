import { Component, h } from "preact";

import AudioNode from './audio-node';

let store = {
  canvas: {
    height: 500,
    width: 700,
    data: {
      // Stuff pertaining lines will be put here?
    }
  },
}

const colors = {
  red: [244, 36, 36, 1]
}



interface CanvasMeta {
  height: number;
  width: number;
}

interface Props{
  id: string;
  canvas: CanvasMeta;
}
export default class Canvas extends Component<Props> {
  // public height: string = store.canvas.height;
  // public width: string = store.canvas.width;
  public state = {
    mouseDown: false,
    colors: {
      current: 'aquamarine',
      available: {
        aquamarine: 'aquamarine',
        green: 'green',
        purple: 'purple',
        red: 'red',
      }
    }
  }
  private ctx: any;

  // Public

  public handleMouseDown = (e: MouseEvent) => {
    this.setState({ ...this.state, mouseDown: true });
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX, e.clientY);
    this.paint(e.clientX, e.clientY);
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
    const { current }: { 
      current: string
    } = this.state.colors;

    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = current;
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }


  private handleSelectChange = (e: Event) => {
    const target: any = e.target;
    
    target && target.value ?
      this.setState({ ...this.state, colors: { 
        current: target.value,
        available: this.state.colors.available
      }}):
      null;
  }

  private printCanvas = () => {
    const { height, width } = this.props.canvas;
    const ctx = this.ctx.getImageData(0, 0, height, width);
    let pixelBuff: number[] = [];
    console.log(ctx.data.filter((el: number, i: number): boolean => {
      if (el > 0 ) {
        pixelBuff.push(i);
        return true;
      }
      return false
    }))
    console.log(pixelBuff);
  }

  // Life - cylce

  componentDidMount() {
    let canvasObj: any = document.getElementById(this.props.id);
    if(canvasObj) {
      canvasObj.width = store.canvas.width;
      canvasObj.height = store.canvas.height;
      this.ctx = canvasObj.getContext('2d');
      this.ctx.translate(0.5, 0.5); // For bit anti-aliasing
    }
  }

  // Otherwise canvas will never render
  // an accurate output
  shouldComponentUpdate(){
    return false;
  }

  public render({ id, canvas }: Props) {
    const { available }: {
      available: {}
    } = this.state.colors;
    
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
          {Object.values(available).map((el) => <option value={el.toString()}>{el}</option>)}
        </select>
        <div>
          <button onClick={this.printCanvas}>Show canvas data</button>
        </div>
      </div>
    )
  }
}
