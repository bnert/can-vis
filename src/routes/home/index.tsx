import { Component, h } from "preact";

interface Props {}
export default class Home extends Component<Props> {
    public render() {
        return (
            <div>
                <h1>Home</h1>
                <p>This is the Home component.</p>
            </div>
        );
    }
}
