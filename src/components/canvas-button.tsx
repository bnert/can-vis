import { Component, h } from 'preact';

interface ISelectButtonProps {
  value: string;
  waveType: string;
  active: boolean;
  bgRgba: {};
  onClick(any: any): void;
  pubFn: any;
  subFn: any;
}

export default class CanvasButton extends Component<ISelectButtonProps> {
  state = {
    active: this.props.active
  }

  cName = 'canvas-button';

  componentDidMount() {
    this.props.subFn('canvasButtons', ({ action }: any) => {
      if(action !== `SET_INACTIVE-${this.props.waveType}`) {
        this.setState({ active: false });
      }
    });
  }

  render(props: ISelectButtonProps, state: any) {
    const { r, g, b, a }: any = props.bgRgba;
    // const { active }: any = props.active;
    return <button
      id={`canvas-button__${props.waveType}`}
      className={
        (state.active ? 
        `led-btn--active` : 
        `led-btn--inactive`) +
        ` led-btn canvas-button canvas-button__${props.waveType}`
      }

      style={{
        background: `radial-gradient(closest-side, rgba(${r + 100}, ${g + 100}, ${b + 100}, ${a}), rgba(${r}, ${g}, ${b}, ${a}))`,
        borderBottom: `3px solid rgba(${r - 20}, ${g - 20}, ${b - 20}, ${a})`,
        boxShadow: state.active ? `0px 2px 20px 1px rgba(${r}, ${g}, ${b}, .7)` : `0px 2px 11px 0px rgba(${r}, ${g}, ${b}, .5)`
      }}

      onClick={() => {
        this.props.onClick({
          waveType: props.waveType,
          rgba: props.bgRgba
        })
        this.setState({ active: true });
        this.props.pubFn('canvasButtons', { action: `SET_INACTIVE-${this.props.waveType}`});
      }}
    ></button>
  }
}