import { Component, h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";

import Canvas from './canvas';
import AudioNode from './audio-node';

if ((module as any).hot) {
    // tslint:disable-next-line:no-var-requires
    require("preact/debug");
}

export default class App extends Component {
    public currentUrl?: string;
    public handleRoute = (e: RouterOnChangeArgs) => {
        this.currentUrl = e.url;
    };

    public render() {
        return (
          <div>
            <Canvas 
              id={'can-vis'} 
              canvas={{
                height: 500,
                width: 700,
              }}
            />
            <AudioNode id={"ch-1"} />
          </div>
        );
    }
}
