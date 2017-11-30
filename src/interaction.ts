import GraphManagerInterface from "./graph_manager";
import RendererInterface from "./renderer_interface";

import {RendererCanvasToLocal} from "./transforms";
import {TempAddEventListener} from "./type_fixes";
import {Bounds, Vec2} from "./vectors";

import {MouseButtons, MousePosition} from "./mouse";

import InteractionInterface from "./interaction_interface";

/**
 * Interaction
 * -----------
 *
 * Wraps the interaction with the browser
 * Basically maintains the tracking of how the mouse has changed on top of the
 * canvas.
 **/
class Interaction implements InteractionInterface {

  manager: GraphManagerInterface;
  renderer: RendererInterface;
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
    keys: {
      ctrl: boolean,
    }
  };

  constructor(manager: GraphManagerInterface) {
    this.manager = manager;
    this.renderer = manager.renderer;

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
      keys: {
        ctrl: false,
      }
    }
    this.SetupInteraction();
  }

  /*****************************************************************
   * GETTERS / SETTERS
   *****************************************************************/

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

  get CtrlPressed() : boolean {
    return this._state.keys.ctrl;
  }

  get CurrentMouseButton() : MouseButtons {
    return this._state.mouse.button;
  }

  /*****************************************************************
   * HANDLERS
   *****************************************************************/

  private SetupInteraction() {
    this.renderer.canvas.addEventListener("mousedown", this.MouseDown);
    document.addEventListener("mouseup", this.MouseUp);
    this.renderer.canvas.addEventListener("mousemove", this.MouseMove);
    document.addEventListener("keydown", (event) => {
      this._state.keys.ctrl = event.ctrlKey;
      this.PostChange();
    });
    document.addEventListener("keyup", (event) => {
      this._state.keys.ctrl = event.ctrlKey;
      this.PostChange();
    });

    // Mouse wheel
    console.info("This app wants to preventDefault scroll Behavior on Canvas.\n" +
                 "This is intended behaviour, but I don't know how to " +
                 "remove the Warning");
    (this.renderer.canvas.addEventListener as TempAddEventListener)(
      "mousewheel",
      this.MouseWheel, {
      passive: false /* chrome warns that this helps with latency */
    });
  }

  private MouseDown = (event: any) => {
    // Mouse Down Specific
    let mouse_pos = MousePosition.FromRendererEvent(this.renderer, event);
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
    let mouse_pos = MousePosition.FromRendererEvent(this.renderer, event);
    this._state.mouse.dragging = false;
    this._state.mouse.button = MouseButtons.NONE;
    this._state.mouse.up_pos = mouse_pos;

    if (old_button == MouseButtons.RIGHT) {
      this.ProcessZoomDrag(event);
    }

    this.PostChange();
  }

  private MouseMove = (event: any) => {
    this.ProcessMove(event);
    if (this._state.mouse.dragging) {
      this.ProcessDrag(event);
    }
    this.PostChange();
  }

  private MouseWheel = (event: any) => {
    event.preventDefault();
    let pin_point = RendererCanvasToLocal(this.renderer,
                                          this._state.mouse.current_pos.canvas);

    // let delta = -event.deltaY;
    // let scale_change = new Vec2(delta * this._state.config.wheel_factor.x,
    //                             delta * this._state.config.wheel_factor.y);

    // We change the scale
    let delta = Vec2.Zero;
    if (!this.CtrlPressed) {
      delta.x = -event.deltaY;
    } else {
      delta.y = -event.deltaY;
    }

    let scale_change = Vec2.Mul(this._state.config.wheel_factor, delta);
    let old_scale = this.renderer.scale;
    let new_scale = Vec2.Sum(this.renderer.scale, scale_change);
    if (new_scale.x < 0) { new_scale.x = 0; }
    if (new_scale.y < 0) { new_scale.y = 0; }
    this.renderer.scale = new_scale;

    // We change the offset
    let old_offset = new Vec2(this.renderer.offset.x, -this.renderer.offset.y);
    // new_offset = old_offset + pin_point * (old_scale - new_scale)
    let new_offset = Vec2.Sum(old_offset,
                              Vec2.Mul(pin_point,
                                       Vec2.Sub(old_scale,
                                                new_scale)));
    this.renderer.offset = new Vec2(new_offset.x, -new_offset.y);

    this.PostChange();
    // Prevent default browser behaviour
    return false;
  }

  // Method to call after a change has happened
  private PostChange() {
    this.manager.Draw();
  }


  /**************************************************************
   * PRIVATE UTILITY METHODS
   **************************************************************/

  private ProcessMove(event: any) {
    if (!this.manager.Valid) {
      return;
    }

    this._state.mouse.last_pos = this._state.mouse.current_pos;
    this._state.mouse.current_pos = MousePosition.FromRendererEvent(this.renderer, event);

    this.manager.SetClosestPoint(this.CurrentMousePos.local);
  }

  private ProcessDrag(event: any) {
    if (!this.manager.Valid) {
      return;
    }

    if (this._state.mouse.button == MouseButtons.LEFT) {
      this.ProcessMoveDrag(event);
    } else if (this._state.mouse.button == MouseButtons.RIGHT) {
      // Drag is handled at mouse up
    } else {
      throw "unsupported drag event";
    }
  }

  private ProcessMoveDrag(event: any) {
    let prev_pos = this._state.mouse.last_pos;
    let current_pos = this._state.mouse.current_pos;
    let diff = new Vec2(current_pos.screen.x - prev_pos.screen.x,
                        current_pos.screen.y - prev_pos.screen.y);
    let offset = new Vec2(diff.x / this.renderer.width,
                          diff.y / this.renderer.height);
    // We invert the y-axis
    // offset.y *= -1;

    this.renderer.offset = Vec2.Sum(this.renderer.offset, offset);
  }

  private ProcessZoomDrag(event: any) {
    // Get the old bounds
    let start = this.DownMousePos.local;
    let end = this.UpMousePos.local;

    let bounds = this.renderer.bounds;
    if (this.manager.label_manager.VerticalZoom) {
      let min = Math.min(start.x, end.x);
      let max = Math.max(start.x, end.x);
      bounds.x.Set(min, max);
    } else if (this.manager.label_manager.HorizontalZoom) {
      let min = Math.min(start.y, end.y);
      let max = Math.max(start.y, end.y);
      bounds.y.Set(min, max);
    } else if (this.manager.label_manager.BoxZoom) {
      let min = Vec2.Min(start, end);
      let max = Vec2.Max(start, end);
      bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);
    } else {
      throw "Unsupported Zoom";
    }

    this.renderer.bounds = bounds;
  }

}

export default Interaction;
