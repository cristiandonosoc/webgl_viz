import GraphManagerInterface from "./graph_manager";
import RendererInterface from "./renderer_interface";

import {RendererCanvasToLocal} from "./transforms";
import {TempAddEventListener} from "./type_fixes";
import {Bounds, Vec2} from "./vectors";

import {MouseButtons, MousePosition} from "./mouse";

import InteractionInterface from "./interaction_interface";
import {ZoomType} from "./ui_manager_interface";

/**
 * Interaction
 * -----------
 *
 * Wraps the interaction with the browser
 * Basically maintains the tracking of how the mouse has changed on top of the
 * canvas.
 **/
class Interaction implements InteractionInterface {
  private _manager: GraphManagerInterface;
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
    this._manager = manager;

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
    this._manager.Renderer.Canvas.addEventListener("mousedown", this.MouseDown);
    document.addEventListener("mouseup", this.MouseUp);
    this._manager.Renderer.Canvas.addEventListener("mousemove", this.MouseMove);
    document.addEventListener("keydown", (event) => {
      this._state.keys.ctrl = event.ctrlKey;
      // We only change on control for now
      if (event.key == "Control") {
        this.PostChange();
      }
    });
    document.addEventListener("keyup", (event) => {
      this._state.keys.ctrl = event.ctrlKey;
      if (event.key == "Control") {
        this.PostChange();
      }
    });

    // Mouse wheel
    console.info("This app wants to preventDefault scroll Behavior on Canvas.\n" +
                 "This is intended behaviour, but I don't know how to " +
                 "remove the Warning");
    (this._manager.Renderer.Canvas.addEventListener as TempAddEventListener)(
      "mousewheel",
      this.MouseWheel, {
      passive: false /* chrome warns that this helps with latency */
    });
  }

  private MouseDown = (event: any) => {
    // Mouse Down Specific
    let mouse_pos = MousePosition.FromRendererEvent(this._manager.Renderer, event);
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
    let mouse_pos = MousePosition.FromRendererEvent(this._manager.Renderer, event);
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
    let mouse_pos = this._state.mouse.current_pos.canvas;
    let pin_point = RendererCanvasToLocal(this._manager.Renderer, mouse_pos);

    // We change the scale
    let yZoom = this.CtrlPressed;
    let delta = Vec2.Zero;
    if (!yZoom) {
      delta.x = -event.deltaY;
    } else {
      // delta.x = -event.deltaY;
      delta.y = -event.deltaY;
    }

    let scale_change = Vec2.Mul(this._state.config.wheel_factor, delta);
    let old_scale = this._manager.Renderer.Scale;
    let new_scale = Vec2.Sum(old_scale,
                             Vec2.Mul(old_scale, scale_change));
    if (new_scale.x < 0) { new_scale.x = 0; }
    if (new_scale.y < 0) { new_scale.y = 0; }
    this._manager.Renderer.Scale = new_scale;

    // We change the offset
    let old_offset = new Vec2(this._manager.Renderer.Offset.x,
                              -this._manager.Renderer.Offset.y);
    // new_offset = old_offset + pin_point * (old_scale - new_scale)
    // The Y-axis is inverted
    let scale_diff = Vec2.Sub(old_scale, new_scale);
    if (yZoom) {
      scale_diff.Mul(-1);
    }
    let new_offset = Vec2.Sum(old_offset,
                              Vec2.Mul(pin_point, scale_diff));
    this._manager.Renderer.Offset = new Vec2(new_offset.x, -new_offset.y);

    this.PostChange();
    // Prevent default browser behaviour
    return false;
  }

  // Method to call after a change has happened
  private PostChange() {
    this._manager.FrameLoop();
  }


  /**************************************************************
   * PRIVATE UTILITY METHODS
   **************************************************************/

  private ProcessMove(event: any) {
    if (!this._manager.Valid) {
      return;
    }

    this._state.mouse.last_pos = this._state.mouse.current_pos;
    this._state.mouse.current_pos = MousePosition.FromRendererEvent(this._manager.Renderer, event);

    this._manager.SetClosestPoint(this.CurrentMousePos.local);
  }

  private ProcessDrag(event: any) {
    if (!this._manager.Valid) {
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
    let offset = new Vec2(diff.x / this._manager.Renderer.Width,
                          diff.y / this._manager.Renderer.Height);
    // We invert the y-axis
    // offset.y *= -1;

    this._manager.Renderer.Offset = Vec2.Sum(this._manager.Renderer.Offset, offset);
  }

  private ProcessZoomDrag(event: any) {
    // Get the old bounds
    let start = this.DownMousePos.local;
    let end = this.UpMousePos.local;

    let bounds = this._manager.Renderer.Bounds;
    let zoom_type = this._manager.UIManager.Zoom;
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

    this._manager.Renderer.Bounds = bounds;
  }
}

export default Interaction;
