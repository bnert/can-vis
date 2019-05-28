import { Component, h } from "preact";

interface IData {
  color: string;
  waveType?: string;
}

interface IProps {
  id: string;
  startingHz?: number;
  data: IData;
  mountFn(obj: any): void;
  subscription(channel: string, pubFn: (payload: any) => void): void;
}


interface IState {
  volume: number;
  currHz: number;
  mousedown: boolean;
  muted: boolean;
}

interface IOsc {
  inst: OscillatorNode[];
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
    inst: [],
    controls: {},
    fxChain: {
      gain: {
        initValue: this.state.volume,
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
      this.osc.inst.forEach(el => {
        el.connect(this.osc.fxChain.gain.fx);
      })
    } else {
      console.log("disconnecting: ", this.props.data.waveType)
      this.osc.inst.forEach(el => {
        console.log(el)
        try {
          el.disconnect(this.osc.fxChain.gain.fx);
        } catch(err) {
          console.log('disconnect error', err);
        }
      })
    }
    this.setState({ ...this.state, muted: !muted });
  }

  handleVolumeChange = (event: any) => {
    const newVolume = parseFloat(event.target.value);
    const { gain } = this.osc.fxChain;
    gain.fx.gain.setValueAtTime(newVolume, this.audioCtx.currentTime);
    this.setState({ ...this.state, volume: newVolume });
  }

  // Initializer functions
  initNewOsc(props: any) {
    let { inst, fxChain } = this.osc;
    
    inst.push(this.audioCtx.createOscillator());
    const newOscInstIndex = inst.length - 1;
    inst[newOscInstIndex].type = (props.waveType) as OscillatorType;
    inst[newOscInstIndex].frequency.value = props.initFreq;

    let fx = Object.values(fxChain);
    fx.forEach((fxValue: any, i: number) => {
      
      inst[newOscInstIndex].connect(fxValue.fx);
      if( i === fx.length - 1 ) {
        fxValue.fx.connect(this.audioCtx.destination);
      }

    });
    
    inst[newOscInstIndex].start();
    inst[newOscInstIndex].disconnect();
  }

  // Audio updates
  handleFreqUpdate = (newFreq: number) => {
    const { inst } = this.osc;
    inst[0].frequency.value = newFreq;
  }

  handleAddNode = (newNodeInitData: any) => {
    console.log('Creating', this.props.data.waveType, 'node');
    this.initNewOsc(newNodeInitData);
  }

  // Channel behavior
  decideAction = (payload: any) => {
    const { action, data }: 
      { 
        action: string, 
        data: any
      } = payload;

    switch(action) {
      case 'UPDATE_FREQ':
        this.handleFreqUpdate(data);
      case 'ADD_NODE':
        this.handleAddNode({ 
           ...data, 
           waveType: this.props.data.waveType,
           initFreq: 440
        });
      default:
        return;
    }
  }

   // Lifecylce methods
  componentDidMount() {
    // this.initNewOsc(this.props)

    const { id, subscription } = this.props;

    subscription(id, (payload) => {
      console.log(`Recv >>> ${id}:`, payload);
      this.decideAction(payload);
    })
    this.props.mountFn({ childId: this.props.id, ready: true });
  }

  public render({ id, data: { color, waveType } }: IProps, state: any) {
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
        >{waveType}</h3>
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
