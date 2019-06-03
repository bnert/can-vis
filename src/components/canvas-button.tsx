import { Component, h } from 'preact';

interface ISelectButtonProps {
  value: string;
  waveType: string;
  bgRgba: {};
  onClick(any: any): void;
}

export default class SelectButton extends Component<ISelectButtonProps> {
  state = {
    active: false
  }

  cName = 'canvas-button';

  render(props: ISelectButtonProps, state: any) {
    const { r, g, b, a }: any = props.bgRgba;
    return <button
      id={`canvas-button__${props.waveType}`}
      className={state.active ? 
        `${this.cName}--ative` : 
        `${this.cName}--inative`
      }

      style={{
        background: `rgba(${r}, ${g}, ${b}, ${a})`,
        border: 'none',
        borderBottom: `3px solid rgba(${r - 20}, ${g - 20}, ${b - 20}, ${a})`,
        margin: `.2rem`,
        minWidth: '9rem'
      }}

      onClick={() => {
        this.props.onClick({
          waveType: props.waveType,
          rgba: props.bgRgba
        })
        this.setState({ active: !state.active });
      }}
    ></button>
  }
}