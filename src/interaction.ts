import GraphManager from "./graph_manager";
import {Renderer} from "./renderer";

import {RendererCanvasToLocal} from "./transforms";
import {TempAddEventListener} from "./type_fixes";
import {Vec2} from "./vectors";

enum MouseButtons {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  NONE = 1000
}

class MousePosition {
  screen: Vec2
  canvas: Vec2
  local: Vec2

  static get Zero() : MousePosition {
    let mouse_pos = new MousePosition();
    mouse_pos.screen = Vec2.Zero;
    mouse_pos.canvas = Vec2.Zero;
    mouse_pos.local = Vec2.Zero;
    return mouse_pos;
  }

  static FromRendererEvent(renderer: Renderer, event: any) : MousePosition {
    let mouse_pos = new MousePosition();
    // Screen
    mouse_pos.screen = new Vec2(event.screenX,
                                window.screen.height - event.screenY);
    // Canvas
    let client_pos = new Vec2(event.clientX, event.clientY);
    let bounds = event.target.getBoundingClientRect();
    mouse_pos.canvas = new Vec2(event.clientX - bounds.left,
                                bounds.height - (event.clientY - bounds.top));
    // Local
    mouse_pos.local = RendererCanvasToLocal(renderer, mouse_pos.canvas);
    return mouse_pos;
  }

}

/**
 * Interaction
 * -----------
 *
 * Wraps the interaction with the browser
 * Basically maintains the tracking of how the mouse has changed on top of the
 * canvas.
 **/
class Interaction {

  manager: GraphManager;
  renderer: Renderer;
  state: {
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

  constructor(manager: GraphManager) {
    this.manager = manager;
    this.renderer = manager.renderer;

    this.state = {
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
      }
    }
    this.SetupInteraction();
  }

  get ZoomDragging() : boolean {
    return this.state.mouse.dragging &&
           (this.state.mouse.button == MouseButtons.RIGHT);
  }

  private SetupInteraction() {
    this.renderer.canvas.addEventListener("mousedown", this.MouseDown);
    document.addEventListener("mouseup", this.MouseUp);
    this.renderer.canvas.addEventListener("mousemove", this.MouseMove);

    // Mouse wheel
    (this.renderer.canvas.addEventListener as TempAddEventListener)(
      "mousewheel",
      this.MouseWheel, {
      passive: true     /* chrome warns that this helps with latency */
    });
  }

  private MouseDown = (event: any) => {
    // Mouse Down Specific
    let mouse_pos = MousePosition.FromRendererEvent(this.renderer, event);
    this.state.mouse.down_pos = mouse_pos;
    this.state.mouse.dragging = true;
    this.state.mouse.button = event.button;
    console.log("DOWN: ", this.state.mouse.down_pos);

    this.PostChange();
  }

  private MouseUp = (event: any) => {
    if (!this.state.mouse.dragging) {
      return;
    }
    let old_button = this.state.mouse.button;
    let mouse_pos = MousePosition.FromRendererEvent(this.renderer, event);
    this.state.mouse.dragging = false;
    this.state.mouse.button = MouseButtons.NONE;
    this.state.mouse.up_pos = mouse_pos;

    console.log("UP: ", this.state.mouse.up_pos);
    if (old_button == MouseButtons.RIGHT) {
      this.ProcessZoomDrag(event);
    }

    this.PostChange();
  }

  private MouseMove = (event: any) => {
    this.ProcessMove(event);
    if (this.state.mouse.dragging) {
      this.ProcessDrag(event);
    }
    this.PostChange();
  }

  private MouseWheel = (event: any) => {
    let pin_point = RendererCanvasToLocal(this.renderer,
                                          this.state.mouse.current_pos.canvas);

    // We change the scale
    let delta = -event.deltaY;
    let scale_change = new Vec2(delta * this.state.config.wheel_factor.x,
                                delta * this.state.config.wheel_factor.y);
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
    if (!this.manager.graph_loaded) {
      return;
    }

    this.state.mouse.last_pos = this.state.mouse.current_pos;
    this.state.mouse.current_pos = MousePosition.FromRendererEvent(this.renderer, event);

    this.manager.closest_point = this.SearchForClosestPoint(this.state.mouse.current_pos.local);
  }

  private ProcessDrag(event: any) {
    if (!this.manager.graph_loaded) {
      return;
    }

    if (this.state.mouse.button == MouseButtons.LEFT) {
      this.ProcessMoveDrag(event);
    } else if (this.state.mouse.button == MouseButtons.RIGHT) {
      // Drag is handled at mouse up
    } else {
      throw "unsupported drag event";
    }
  }

  private ProcessMoveDrag(event: any) {
    let prev_pos = this.state.mouse.last_pos;
    let current_pos = this.state.mouse.current_pos;
    let diff = new Vec2(current_pos.screen.x - prev_pos.screen.x,
                        current_pos.screen.y - prev_pos.screen.y);
    let offset = new Vec2(diff.x / this.renderer.width,
                          diff.y / this.renderer.height);
    // We invert the y-axis
    offset.y *= -1;

    this.renderer.offset = Vec2.Sum(this.renderer.offset, offset);
  }

  private ProcessZoomDrag(event: any) {
    // Get the old bounds
    let start = RendererCanvasToLocal(this.renderer, this.state.mouse.down_pos.canvas);
    let end = RendererCanvasToLocal(this.renderer, this.state.mouse.up_pos.canvas);
    console.log("START: ", start, " END: ", end);

    let bounds = this.renderer.bounds;
    if (this.manager.label_manager.VerticalZoom) {
      let min = Math.min(start.x, end.x);
      let max = Math.max(start.x, end.x);
      bounds.x.Set(min, max);
    } else if (this.manager.label_manager.HorizontalZoom) {
      let min = Math.min(start.y, end.y);
      let max = Math.max(start.y, end.y);
      bounds.y.Set(min, max);
    }

    this.renderer.bounds = bounds;
  }

  private SearchForClosestPoint(mouse_pos: Vec2) {
    if (!this.manager.graph_loaded) {
      return;
    }

    var len = this.manager.custom_points.length;
    if (mouse_pos.x <= this.manager.custom_points[0].x) {
      return this.manager.custom_points[0];
    }
    if (mouse_pos.x >= this.manager.custom_points[len-1].x) {
      return this.manager.custom_points[len-1];
    }

    // We do binary search
    var min_index = 0;
    var max_index = len - 1;

    while (min_index < max_index) {
      var half = Math.floor((min_index + max_index) / 2);
      var val = this.manager.custom_points[half].x;

      if (val > mouse_pos.x) {
        if (max_index == half) { break; }
        max_index = half;
      } else {
        if (min_index == half) { break; }
        min_index = half;
      }
    }

    // We now have two points
    var min_point = this.manager.custom_points[min_index];
    var max_point = this.manager.custom_points[max_index];

    // We want to return the closest (x-wise)
    var dist1 = Math.abs(min_point.x - mouse_pos.x);
    var dist2 = Math.abs(max_point.x - mouse_pos.x);

    if (dist1 < dist2) {
      return min_point;
    } else {
      return max_point;
    }
  }

}

export default Interaction;
