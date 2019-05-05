import { Component, h } from "preact";


interface State {
  volumn: number;
  ctx: {},
  osc: {}
}

interface Props{
  id: string | number;
  sampleRate?: number;
}


export default class AudioNode extends Component<Props> {

  private state = {
    volume: 0.75,
    ctx: null,
    osc: null
  }

  private handleInputChange = (e: Event) => {
    const target: any = e.target;
    const newVolume = parseFloat(target.value);
    console.log('newVolume:', newVolume);
    if( typeof newVolume === 'number' && newVolume < 1.0 ) {
      console.log("Setting new Volume", newVolume);
      // this.setState({ volume: newVolume })
      console.log(this)
      this.state.gain.gain.setValueAtTime(newVolume, this.state.ctx.currentTime);
      
      
    }
  }

  private regisetListeners = () => {
    window.addEventListener('keydown', (e: any) => {

      if(e.keyCode === 65){
        this.state.osc.start();
      } else if( e.keyCode === 66 ) {
        this.state.osc.disconnect();
      } else if ( e.keyCode === 67 ) {
        this.state.osc.connect(this.state.gain);
      }
    })
  }

  componentDidMount() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let osc = audioContext.createOscillator();
    let gainEffect = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, audioContext.currentTime); // value in hertz
    osc.connect(gainEffect);
    gainEffect.connect(audioContext.destination);



    this.setState({ 
      volume: 0.75,
      ctx: audioContext,
      osc,
      gain: gainEffect
    });

    this.regisetListeners();
  }

  public render({id}: Props, state: any) {
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
        <h3>{state.volume}</h3>
        <audio id={id.toString() + '-anode'}></audio>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          style={{
            transform: 'rotate(-90deg)',
            marginTop: '40px'
          }}
          value={state.volume} 
          onChange={this.handleInputChange}
        />
      </div>
    )
  }
}