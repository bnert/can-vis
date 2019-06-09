import { Component, h } from 'preact';

interface ISelectButtonProps {
  value: string;
  waveType: string;
  active: boolean;
  bgRgba: any;
  clickHandler(event: any): void;
  pubFn(channel: string, payload: any): void;
  subFn(channel: string, payloadFn: any): void;
}

export default class CanvasButton extends Component<ISelectButtonProps> {
  public state = {
    active: this.props.active
  }

  private cName = 'canvas-button';

  public componentDidMount() {
    this.props.subFn('canvasButtons', ({ action }: any) => {
      if(action !== `SET_INACTIVE-${this.props.waveType}`) {
        this.setState({ active: false });
      }
    });
  }

  public render(props: ISelectButtonProps, state: any) {
    const { r, g, b, a }: any = props.bgRgba;
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
        this.props.clickHandler({
          waveType: props.waveType,
          rgba: props.bgRgba
        })
        this.setState({ active: true });
        this.props.pubFn('canvasButtons', { action: `SET_INACTIVE-${this.props.waveType}`});
      }}
    />
  }
}
