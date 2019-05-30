import { Component, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";
import pubsub from '../util/pubsub';

import Canvas from './canvas';
import AudioNode from './audio-node';

if ((module as any).hot) {
    // tslint:disable-next-line:no-var-requires
    require("preact/debug");
}


let colors = {
  current: 'sine',
  available: {
    sine: 'aquamarine',
    traingle: 'green',
    square: 'purple',
    sawtooth: 'red',
  }
}


export default class App extends Component {
    public currentUrl?: string;
    public handleRoute = (e: RouterOnChangeArgs) => {
        this.currentUrl = e.url;
    };

    // Application constants
    maxFreq: number = 6000;
    // Kind of arbitrary sizes... for now
    canvasWidth: number = 1080;
    canvasHeight: number = 720;

    // General state object
    state = {
      audioNodes: Object.entries(colors.available)
        .map(([ waveType, color ], i: number) => {
          return {
            id: `ch-${i}`,
            data: {
              color,
              waveType
            }
          }
      })
    }

    /** 
     * One thing that needs to be made available to both
     * the canvas and the audio worker, is the audio context
     */
    audioCtx: AudioContext = new (window.AudioContext || window.webkitAudioContext)();

    /** Instantiate a new pubsub for updates */
    ps = pubsub();

    /**   
     * For making sure each child node is available
     * before pusing any data to each of them
     */
    allNodesStatus: Array<any> = [];

    pushReadyNode = (nodeData: any) => {
      this.allNodesStatus.push(nodeData);
    }

    checkAllNodesMounted = () => {
      if(this.allNodesStatus.length === this.state.audioNodes.length) {
        return true;
      }
      return false;
    }

    pollChildMounted = ({ childId, ready }: { childId: string, ready: boolean }) => {
      this.pushReadyNode({ childId, ready });
      let allNodesStat = this.checkAllNodesMounted()
      
      allNodesStat ?
        console.log("All nodes mounted") :
        console.log("All nodes not mounted");

      console.log('channles');
      this.ps.chs();
      if(allNodesStat) {
        this.allNodesStatus.forEach(el => {
          console.log("Element ready", el);
          this.ps.pub(el.childId, {msg: `Ready msg for ${el.childId}`});
        });
      }
    }

    // This is to update a child audio node with
    // latest data for what frequency to play
    pollToUpdateChild = () => {

    }

    /************************************* */
    componentDidMount() {
      console.log('All', this.checkAllNodesMounted());
      this.ps.chs().forEach(ch => {
        this.ps.pub(ch, { msg: "Hello from comp did mount app"})
      })

    }

    public render(_ : any, { audioNodes }: any) {
        return (
          <div>
            <Canvas 
              id={'can-vis'} 
              audioContext={this.audioCtx}
              canvas={{
                height: 500,
                width: 700,
              }}
              publish={this.ps.pub}
            />
            <div
              id="mixer"
              style={{
                display: 'flex',
                flexDirection: 'row'
              }}
            >
              {audioNodes.map((el: any) => {
                return <AudioNode 
                  {...el}
                  audioContext={this.audioCtx}
                  mountFn={this.pollChildMounted} 
                  subscription={this.ps.sub}
                />
              })}
            </div>
          </div>
        );
    }
}
