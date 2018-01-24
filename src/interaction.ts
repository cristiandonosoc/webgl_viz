/**
 * Interaction
 * -----------
 *
 * Wraps the interaction with the browser for a particular canvas.
 * Basically maintains the tracking of how the mouse has changed on top of the
 * canvas.
 **/

import RendererInterface from "./renderer";

import {RendererCanvasToLocal} from "./transforms";
import {TempAddEventListener} from "./type_fixes";
import {Bounds, Vec2} from "./vectors";

import {MouseButtons, MousePosition} from "./mouse";

import {ZoomType, UIManagerSingleton} from "./ui_manager";

import KeyboardSingleton from "./keyboard";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface InteractionInterface {
  Start() : void;

  ZoomDragging: boolean;

  /* MOUSE */
  CurrentMousePos: MousePosition;
  CurrentMouseButton: MouseButtons;

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
  constructor(renderer: RendererInterface,
              callback: (i: InteractionInterface) => void) {
    this._renderer = renderer;
    this._callback = callback;
    this._started = false;

    this._state = {
      config: {
        wheel_factor: new Vec2(0.001, 0.001),
      },
      mouse: {
        button: MouseButtons.NONE,
        current_pos: MousePosition.Zero,
        down_pos: MousePosition.Zero,
        dragging: false,
        last_pos: MousePosition.Zero,
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
    return this._state.mouse.dragging &&
           (this._state.mouse.button == MouseButtons.RIGHT);
  }

  get CurrentMousePos() : MousePosition {
    return this._state.mouse.current_pos;
  }

  get DownMousePos() : MousePosition {
    return this._state.mouse.down_pos;
  }

  get UpMousePos() : MousePosition {
    return this._state.mouse.up_pos;
  }

  get CurrentMouseButton() : MouseButtons {
    return this._state.mouse.button;
  }

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
    this._state.mouse.down_pos = mouse_pos;
    this._state.mouse.dragging = true;
    this._state.mouse.button = event.button;

    this.PostChange();
  }

  private MouseUp = (event: any) => {
    if (!this._state.mouse.dragging) {
      return;
    }
    let old_button = this._state.mouse.button;
    let mouse_pos = MousePosition.FromRendererEvent(this._renderer, event);
    this._state.mouse.dragging = false;
    this._state.mouse.button = MouseButtons.NONE;
    this._state.mouse.up_pos = mouse_pos;

    if (old_button == MouseButtons.RIGHT) {
      this._ProcessZoomDrag(event);
    }

    this.PostChange();
  }

  private MouseMove = (event: any) => {
    this._ProcessMove(event);
    if (this._state.mouse.dragging) {
      this._ProcessDrag(event);
    }
    this.PostChange();
  }

  private MouseWheel = (event: any) => {
    event.preventDefault();
    let mouse_pos = this._state.mouse.current_pos.canvas;
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

    let scale_change = Vec2.Mul(this._state.config.wheel_factor, delta);
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

    this.PostChange();
    // Prevent default browser behaviour
    return false;
  }

  // Method to call after a change has happened
  private PostChange() {
    // TODO(donosoc): Mark the view as dirty when that is implemented
  }

  /**************************************************************
   * PRIVATE METHODS
   **************************************************************/

  private _ProcessMove(event: any) {
    if (!this._started) {
      return;
    }

    this._state.mouse.last_pos = this._state.mouse.current_pos;
    this._state.mouse.current_pos = MousePosition.FromRendererEvent(this._renderer, event);

    // Call the given callback
    this._callback(this);
  }

  private _ProcessDrag(event: any) {
    if (!this._started) {
      return;
    }

    if (this._state.mouse.button == MouseButtons.LEFT) {
      this._ProcessMoveDrag(event);
    } else if (this._state.mouse.button == MouseButtons.RIGHT) {
      // Drag is handled at mouse up
    } else {
      throw "unsupported drag event";
    }
  }

  private _ProcessMoveDrag(event: any) {
    let prev_pos = this._state.mouse.last_pos;
    let current_pos = this._state.mouse.current_pos;
    let diff = new Vec2(current_pos.screen.x - prev_pos.screen.x,
                        current_pos.screen.y - prev_pos.screen.y);
    let offset = new Vec2(diff.x / this._renderer.Width,
                          diff.y / this._renderer.Height);
    // We invert the y-axis
    // offset.y *= -1;

    this._renderer.Offset = Vec2.Sum(this._renderer.Offset, offset);
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
  }


  /**************************************************************************
   * PRIVATE DATA
   **************************************************************************/

  private _renderer: RendererInterface;
  private _callback: (i: InteractionInterface) => void;
  private _started: boolean;
  private _state: {
    config: {
      wheel_factor: Vec2,
    },
    mouse: {
      button: MouseButtons,
      current_pos: MousePosition,
      down_pos: MousePosition,
      dragging: boolean,
      last_pos: MousePosition,
      up_pos: MousePosition,
    },
  };
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {Interaction, InteractionInterface}
export default InteractionInterface;
