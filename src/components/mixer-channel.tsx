import { Component, h } from 'preact';

interface IMixerChannelProps {
  id: string;
  channelName: string;
  name: string | OscillatorType;
  volume: number;
  audioAttrs: any;
  volRangeStep: number;
  pubFn: any;
  subFn: any;
  bgRgba?: any;
  handleMute(channelName: string): void;
  handleUnMute(channelName: string): void;
  handleVolumeChange(channelName: string, newVol: number): void;
}

export default class MixerChannel extends Component<IMixerChannelProps> {
  maxNumOfNodes = 4;
  state = {
    unmuted: true, // Used for re-render upon prop change
    mouseDown: false, // For use with dragging the slider
    volume: 0.2 // Default value
  }

  /**
   * Little wrapper to setState and trigger re-render
   * @param key string value
   * @param value any
   */
  updateState(key: string, value: any) {
    this.setState({
      ...this.state,
      [key]: value
    });
  }

  componentDidMount() {
    this.setState({
      ...this.state,
      volume: this.props.audioAttrs.volume,
      unmuted: this.props.audioAttrs.muted
    });
  }

  render(props: IMixerChannelProps) {
    const {
      id,
      channelName,
      audioAttrs,
      volRangeStep,
      bgRgba,
      handleMute,
      handleUnMute,
      handleVolumeChange
    } = props;
    const { r, g, b, a }: any = bgRgba;
    return (
      <div
        id={id.toString()}
        className={`app-mixer__channel`}
      >
        <input 
          className={`mixer-channel__slider`}
          // Values
          type="range"
          min="0"
          max="1"
          value={this.state.volume}
          step={volRangeStep}
          // Functions
          onMouseDown={() => this.updateState('mouseDown', true)}
          onMouseUp={() => this.updateState('mouseDown', false)}
          onMouseMove={(ev: any) => {
            if(this.state.mouseDown) {
              // Want to make sure the volume is a float
              // before passing it up to the mixer
              let newVolume = parseFloat(ev.target.value);
              handleVolumeChange(channelName, newVolume);
              this.updateState('volume', newVolume);
            }
          }}
        />
        <button
          className={
            (this.state.unmuted ? 
              `led-btn--inactive` : 
              `led-btn--active`) + 
              ` led-btn mixer-channel__mute-btn`
          }
          style={{
            background: `radial-gradient(closest-side, rgba(${r + 50}, ${g + 50}, ${b + 50}, ${a}), rgba(${r}, ${g}, ${b}, ${a}))`,
            borderBottom: `3px solid rgba(${r - 20}, ${g - 20}, ${b - 20}, ${a})`,
            boxShadow: !this.state.unmuted ? `0px 2px 20px 1px rgba(${r}, ${g}, ${b}, .7)` : `0px 2px 11px 0px rgba(${r}, ${g}, ${b}, .5)`
          }}
          onClick={() => {
            // Muted is when LED is off,
            // unmuted is when it is on
            // this corresponds to that state
            // if not unmuted we then want to mute/ vice versa 
            !this.state.unmuted ?
              handleMute(channelName) :
              handleUnMute(channelName);
            // Used for re-render
            this.updateState('unmuted', !this.state.unmuted);
          }}
        ></button>
      </div>
    )
  }
}