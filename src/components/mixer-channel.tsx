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
  handleMute(channelName: string): void;
  handleUnMute(channelName: string): void;
  handleVolumeChange(channelName: string, newVol: number): void;
}

export default class MixerChannel extends Component<IMixerChannelProps> {
  maxNumOfNodes = 4;
  state = {
    muted: true, // Used for re-render upon prop change
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
      muted: this.props.audioAttrs.muted
    });
  }

  render(props: IMixerChannelProps) {
    const {
      id,
      channelName,
      audioAttrs,
      volRangeStep,
      handleMute,
      handleUnMute,
      handleVolumeChange
    } = props;
    return (
      <div
        id={id.toString()}
      >
        <h3>{name}</h3>
        <input 
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
          onClick={() => {
            !audioAttrs.muted ?
              handleMute(channelName) :
              handleUnMute(channelName);
            // Used for re-render
            this.updateState('muted', !audioAttrs.muted);
          }}
        >{
          audioAttrs.muted ?
            'U' : 'M'
        }</button>
      </div>
    )
  }
}