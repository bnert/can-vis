import { Component, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";

import Canvas from './canvas';
import AudioNode from './audio-node';

if ((module as any).hot) {
    // tslint:disable-next-line:no-var-requires
    require("preact/debug");
}


let colors = {
  current: 'aquamarine',
  available: {
    aquamarine: 'aquamarine',
    green: 'green',
    purple: 'purple',
    red: 'red',
  }
}


export default class App extends Component {
    public currentUrl?: string;
    public handleRoute = (e: RouterOnChangeArgs) => {
        this.currentUrl = e.url;
    };

    state = {
      audioNodes: Object.values(colors.available)
        .map((el: any, i: number) => {
          return {
            id: `ch-${1}`,
            data: {
              color: el,
              wavType: 'sine' // For now
            }
          }
      })
    }

    public render(_ : any, { audioNodes }: any) {
        return (
          <div>
            <Canvas 
              id={'can-vis'} 
              canvas={{
                height: 500,
                width: 700,
              }}
            />
            <div
              id="mixer"
              style={{
                display: 'flex',
                flexDirection: 'row'
              }}
            >
              {audioNodes.map((el: any) => {
                return <AudioNode {...el} />
              })}
            </div>
          </div>
        );
    }
}
