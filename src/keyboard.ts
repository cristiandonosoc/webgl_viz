/**
 * Keyboard
 *
 * Maintains keyboard state
 **/


interface KeyboardInterface {
  CtrlPressed: boolean;
  AltPressed: boolean;
  ShiftPressed: boolean;
}

/***************************************************
 * IMPLEMENTATION
 ***************************************************/

class Keyboard implements KeyboardInterface {

  /*************************************************
   * INTERFACE IMPL
   *************************************************/

  get CtrlPressed() : boolean {
    return this._ctrl;
  }

  get AltPressed() : boolean {
    return this._alt;
  }

  get ShiftPressed() : boolean {
    return this._shift;
  }

  /*************************************************
   * CONSTRUCTOR
   *************************************************/

  constructor() {
    let ctx = this;
    document.addEventListener("keydown", (event) => {
      ctx._UpdateKeys(event);
    });
    document.addEventListener("keyup", (event) => {
      ctx._UpdateKeys(event);
    });
  }

  /*************************************************
   * PRIVATE FUNCS
   *************************************************/

  private _UpdateKeys(event: any) : void {
    this._ctrl = event.ctrlKey;
    this._alt = event.altKey;
    this._shift = event.shiftKey;
  }

  /*************************************************
   * PRIVATE VARS
   *************************************************/
  private _ctrl: boolean;
  private _alt: boolean;
  private _shift: boolean;
}

/*************************************************
 * SINGLETON
 *************************************************/

let KeyboardSingleton = new Keyboard();

/*************************************************
 * EXPORTS
 *************************************************/

export {Keyboard}
export {KeyboardInterface}
export {KeyboardSingleton}
export default KeyboardSingleton;
