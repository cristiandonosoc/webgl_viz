/**
 * Interaction
 * -----------
 *
 * Wraps the interaction with the browser for a particular canvas.
 * Basically maintains the tracking of how the mouse has changed on top of the
 * canvas.
 **/

import InternalRendererInterface from "./internal_renderer";

import {RendererCanvasToLocal} from "./transforms";
import {TempAddEventListener} from "./type_fixes";
import {Bounds, Vec2} from "./vectors";

import {MouseButtons, MousePosition} from "./mouse";

import {ZoomType, UIManagerSingleton} from "./ui_manager";

import KeyboardSingleton from "./keyboard";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

enum InteractionEvents {
  CLICK,
  MOVE,
  MOVE_DRAG,
  ZOOM,
  ZOOM_DRAG,
};

interface State {
  config: {
    wheel_factor: Vec2
  };
  mouse: {
    is_down: boolean;
    dragging: boolean,

    button: MouseButtons,

    down_pos: MousePosition,
    up_pos: MousePosition,

    current_pos: MousePosition,
    last_pos: MousePosition,
  };
};

interface InteractionInterface {
  Start() : void;

  ZoomDragging: boolean;

  /* MOUSE */
  MousePos: MousePosition;
  MouseButton: MouseButtons;

  // Last Position mouse was pressed
  DownMousePos: MousePosition;
  // Last Position the mouse was released
  UpMousePos: MousePosition;
}

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class Interaction implements InteractionInterface {

  /*****************************************************************
   * CONSTRUCTOR
   *****************************************************************/

  // TODO(donosoc): Decouple zoom from UIManager (now has local data)
  constructor(renderer: InternalRendererInterface,
              callback: (i: InteractionInterface, e: InteractionEvents) => void) {
    this._renderer = renderer;
    this._callback = callback;
    this._started = false;

    this._state = {
      config: {
        wheel_factor: new Vec2(0.001, 0.001),
      },
      mouse: {
        is_down: false,
        dragging: false,

        button: MouseButtons.NONE,

        current_pos: MousePosition.Zero,
        last_pos: MousePosition.Zero,

        down_pos: MousePosition.Zero,
        up_pos: MousePosition.Zero,
      },
    }
    this._SetupInteraction();
  }

  /*****************************************************************
   * PUBLIC INTERFACE IMPL
   *****************************************************************/

  Start() : void {
    this._started = true;
  }

  get ZoomDragging() : boolean {
    return this.Dragging && (this.MouseButton == MouseButtons.RIGHT);
  }

  get MousePos() : MousePosition { return this.State.mouse.current_pos; }
  set MousePos(p: MousePosition) { this.State.mouse.current_pos = p; }

  get DownMousePos() : MousePosition { return this.State.mouse.down_pos; }
  set DownMousePos(p: MousePosition) { this.State.mouse.down_pos = p; }

  get UpMousePos() : MousePosition { return this.State.mouse.up_pos; }
  set UpMousePos(p: MousePosition) { this.State.mouse.up_pos = p; }

  get MouseButton() : MouseButtons { return this.State.mouse.button; }
  set MouseButton(b: MouseButtons) { this.State.mouse.button = b; }

  /*****************************************************************
   * PRIVATE INTERFACE IMPL
   *****************************************************************/

  private get State() : State { return this._state; }

  private get IsDown() : boolean { return this.State.mouse.is_down; }
  private set IsDown(d: boolean) { this.State.mouse.is_down = d; }

  private get Dragging() : boolean { return this.State.mouse.dragging; }
  private set Dragging(d: boolean) { this.State.mouse.dragging = d; }

  private get CurrentPos() : MousePosition { return this.State.mouse.current_pos; }
  private set CurrentPos(p: MousePosition) { this.State.mouse.current_pos = p; }

  private get LastPos() : MousePosition { return this.State.mouse.last_pos; }
  private set LastPos(p: MousePosition) { this.State.mouse.last_pos = p; }

  /*****************************************************************
   * HANDLERS
   *****************************************************************/

  private _SetupInteraction() {
    this._renderer.Canvas.addEventListener("mousedown", this.MouseDown);
    document.addEventListener("mouseup", this.MouseUp);
    this._renderer.Canvas.addEventListener("mousemove", this.MouseMove);

    // Mouse wheel
    console.info("This app wants to preventDefault scroll Behavior on Canvas.\n" +
                 "This is intended behaviour, but I don't know how to " +
                 "remove the Warning");
    (this._renderer.Canvas.addEventListener as TempAddEventListener)(
      "mousewheel",
      this.MouseWheel, {
      passive: false /* chrome warns that this helps with latency */
    });
  }

  private MouseDown = (event: any) => {
    // Mouse Down Specific
    let mouse_pos = MousePosition.FromRendererEvent(this._renderer, event);
    this.IsDown = true;
    this.DownMousePos = mouse_pos;
    this.MouseButton = event.button;
  }

  private MouseMove = (event: any) => {
    if (this.MouseButton != MouseButtons.NONE) {
      this.Dragging = true;
    }

    this._ProcessMove(event);
    if (this.Dragging) {
      this._ProcessDrag(event);
      return;
    }

    this._PostChange(InteractionEvents.MOVE);
  }

  private MouseUp = (event: any) => {
    if (!this.IsDown) {
      return;
    }
    this.IsDown = false;

    // Save some info
    let old_button = this.MouseButton;
    let old_dragging = this.Dragging;

    // Update the mouse information
    let mouse_pos = MousePosition.FromRendererEvent(this._renderer, event);
    this.Dragging = false;
    this.MouseButton = MouseButtons.NONE;
    this.UpMousePos = mouse_pos;

    if (!old_dragging) {
      this._PostChange(InteractionEvents.CLICK);
      return;
    }

    if (old_button == MouseButtons.RIGHT) {
      this._ProcessZoomDrag(event);
    }
  }

  private MouseWheel = (event: any) => {
    event.preventDefault();
    let mouse_pos = this.CurrentPos.canvas;
    let pin_point = RendererCanvasToLocal(this._renderer, mouse_pos);

    // We change the scale
    let yZoom = KeyboardSingleton.CtrlPressed;
    let delta = Vec2.Zero;
    if (!yZoom) {
      delta.x = -event.deltaY;
    } else {
      // delta.x = -event.deltaY;
      delta.y = -event.deltaY;
    }

    let scale_change = Vec2.Mul(this.State.config.wheel_factor, delta);
    let old_scale = this._renderer.Scale;
    let new_scale = Vec2.Sum(old_scale,
                             Vec2.Mul(old_scale, scale_change));
    if (new_scale.x < 0) { new_scale.x = 0; }
    if (new_scale.y < 0) { new_scale.y = 0; }
    this._renderer.Scale = new_scale;

    // We change the offset
    let old_offset = new Vec2(this._renderer.Offset.x,
                              -this._renderer.Offset.y);
    // new_offset = old_offset + pin_point * (old_scale - new_scale)
    // The Y-axis is inverted
    let scale_diff = Vec2.Sub(old_scale, new_scale);
    if (yZoom) {
      scale_diff.Mul(-1);
    }
    let new_offset = Vec2.Sum(old_offset,
                              Vec2.Mul(pin_point, scale_diff));
    this._renderer.Offset = new Vec2(new_offset.x, -new_offset.y);

    this._PostChange(InteractionEvents.ZOOM);
    // Prevent default browser behaviour
    return false;
  }

  // Method to call after a change has happened
  private _PostChange(e: InteractionEvents) {
    // TODO(donosoc): Mark the view as dirty when that is implemented
    // Call the given callback
    if (this._callback) {
      this._callback(this, e);
    }
  }

  /**************************************************************
   * PRIVATE METHODS
   **************************************************************/

  private _ProcessMove(event: any) {
    if (!this._started) {
      return;
    }

    this.LastPos = this.CurrentPos;
    this.CurrentPos = MousePosition.FromRendererEvent(this._renderer, event);
  }

  private _ProcessDrag(event: any) {
    if (!this._started) {
      return;
    }

    if (this.MouseButton == MouseButtons.LEFT) {
      this._ProcessMoveDrag(event);
    } else if (this.MouseButton == MouseButtons.RIGHT) {
      // Drag is handled at mouse up
    } else {
      throw "unsupported drag event";
    }
  }

  private _ProcessMoveDrag(event: any) {
    let prev_pos = this.LastPos;
    let current_pos = this.CurrentPos;
    let diff = new Vec2(current_pos.screen.x - prev_pos.screen.x,
                        current_pos.screen.y - prev_pos.screen.y);
    let offset = new Vec2(diff.x / this._renderer.Width,
                          diff.y / this._renderer.Height);
    // We invert the y-axis
    // offset.y *= -1;

    this._renderer.Offset = Vec2.Sum(this._renderer.Offset, offset);

    this._PostChange(InteractionEvents.MOVE_DRAG);
  }

  private _ProcessZoomDrag(event: any) {
    // Get the old bounds
    let start = this.DownMousePos.local;
    let end = this.UpMousePos.local;

    let bounds = this._renderer.Bounds;
    let zoom_type = UIManagerSingleton.Zoom;
    if (zoom_type == ZoomType.VERTICAL) {
      let min = Math.min(start.x, end.x);
      let max = Math.max(start.x, end.x);
      bounds.x.Set(min, max);
    } else if (zoom_type == ZoomType.HORIZONTAL) {
      let min = Math.min(start.y, end.y);
      let max = Math.max(start.y, end.y);
      bounds.y.Set(min, max);
    } else if (zoom_type == ZoomType.BOX) {
      let min = Vec2.Min(start, end);
      let max = Vec2.Max(start, end);
      bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);
    } else {
      throw "Unsupported Zoom";
    }

    this._renderer.Bounds = bounds;

    this._PostChange(InteractionEvents.ZOOM_DRAG);
  }

  /**************************************************************************
   * PRIVATE DATA
   **************************************************************************/

  private _renderer: InternalRendererInterface;
  private _callback: (i: InteractionInterface, e: InteractionEvents) => void;
  private _started: boolean;

  private _state: State;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {InteractionEvents}
export {Interaction, InteractionInterface}
export default InteractionInterface;
