import { Component, h } from "preact";

interface IData {
  color: string;
  wavType?: string;
}

interface IProps {
  id: string | number;
  startingHz?: number;
  data: IData;
}


interface IState {
  volume: number;
  currHz: number;
  mousedown: boolean;
  muted: boolean;
}

interface IOsc {
  inst: OscillatorNode;
  controls: any;
  fxChain: any;
}

const keys = {
  c: 261.63,
  cSharp: 277.18,
  d: 293.66,
  dSharp: 311.13,
  e: 329.63,
  f: 349.23
}

export default class AudioNode extends Component<IProps> {

  private audioCtx: AudioContext = new (window.AudioContext || window.webkitAudioContext)()
  
  // Need to segregate numerical/volatile
  // state from other state variables
  // state => volatile state
  // audioCtx => audioNode specific interaction
  state: IState = {
    volume: 0.2,
    currHz: this.props.startingHz || 440,
    mousedown: false,
    muted: true
  }

  osc: IOsc = {
    inst: this.audioCtx.createOscillator(),
    controls: {},
    fxChain: {
      gain: {
        fx: this.audioCtx.createGain()
      }
    }
  }


  handleMuteUnmute = () => {
    const { muted } = this.state;
    // Need to mute/unmute upon future
    // state of muted-ness (don't know how else to say it)

    // If muted is true, future value is false, so connect
    // else ... you know the rest
    if(muted) {
      this.osc.inst.connect(this.osc.fxChain.gain.fx);
    } else {
      this.osc.inst.disconnect();
    }
    this.setState({ ...this.state, muted: !muted });
  }

  handleVolumeChange = (event: any) => {
    const newVolume = parseFloat(event.target.value);
    const { gain } = this.osc.fxChain;
    console.log(this.osc.fxChain.gain)
    console.log(gain, newVolume);
    gain.fx.gain.setValueAtTime(newVolume, this.audioCtx.currentTime);
    this.setState({ ...this.state, volume: newVolume });
  }

  // Initializer functions
  initOsc(props: IProps) {
    let { inst, fxChain } = this.osc;
    inst.type = (props.data.wavType) as OscillatorType;

    let fx = Object.values(fxChain);
    fx.forEach((fxValue: any, i: number) => {
      inst.connect(fxValue.fx);

      if( i === fx.length - 1 ) {
        fxValue.fx.connect(this.audioCtx.destination);
      }
    });
    inst.start();
    inst.disconnect();
  }

  // Lifecylce methods
  componentDidMount() {
    this.initOsc(this.props)
  }


  public render({ id, data: { color, wavType } }: IProps, state: any) {

    return (
      <div id={id.toString()} 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '150px',
          width: '100px'
        }}
      >
        <h3
          style={{
            background: color
          }}
        >{wavType}</h3>
        <h2>{state.volume}</h2>
        <button
          // Weird, but throws a scope error
          onClick={this.handleMuteUnmute}
        >
          {state.muted ? 'unmute' : 'mute'}
        </button>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          style={{
            transform: 'rotate(-90deg)',
            marginTop: '80px'
          }}
          value={state.volume} 

          onMouseDown={() => {
            this.setState({ ...this.state, mousedown: true })
          }}
          onMouseUp={() => {
            this.setState({ ...this.state, mousedown: false })
          }}
          onMouseMove={(ev: MouseEvent) => {
            this.state.mousedown ?
              this.handleVolumeChange(ev) :
              null;
          }}
        />
      </div>
    )
  }
}
