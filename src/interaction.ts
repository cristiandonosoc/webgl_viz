import GraphManager from "./graph_manager";
import {Renderer} from "./renderer";

import {RendererCanvasToLocal} from "./transforms";
import {TempAddEventListener} from "./type_fixes";
import {Vec2} from "./vectors";

enum MouseButtons {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2
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
    internal: {
      prev_pos: Vec2,
      current_pos: Vec2,
    }
    temp: {
      last_down: Vec2,
      last_up: Vec2,
    },
    mouse: {
      local: Vec2,
      canvas: Vec2,
      screen: Vec2,
      wheel_factor: Vec2,
      dragging: boolean
      button: number;
    }
  };

  constructor(manager: GraphManager) {
    this.manager = manager;
    this.renderer = manager.renderer;

    this.state = {
      internal: {
        prev_pos: new Vec2(0, 0),
        current_pos: new Vec2(0, 0),
      },
      temp: {
        last_down: new Vec2(0, 0),
        last_up: new Vec2(0, 0),
      },
      mouse: {
        local: new Vec2(0, 0),
        canvas: new Vec2(0, 0),
        screen: new Vec2(0, 0),
        wheel_factor: new Vec2(0.001, 0.001),
        dragging: false,
        button: -1,
      },
    };

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
    this.SetPointsFromEvent(event);

    // Mouse Down Specific
    this.state.mouse.dragging = true;
    this.state.mouse.button = event.button;
    this.state.temp.last_down = this.state.mouse.canvas;

    console.log("DOWN: ", this.state.mouse.canvas);
    this.PostChange();
  }

  private MouseUp = (event: any) => {
    if (!this.state.mouse.dragging) {
      return;
    }
    this.SetPointsFromEvent(event);

    // Mouse Up Specific
    let button = this.state.mouse.button;
    this.state.mouse.dragging = false;
    this.state.mouse.button = -1;
    this.state.temp.last_up = this.state.mouse.canvas;

    console.log("UP: ", this.state.mouse.canvas);
    if (button == MouseButtons.RIGHT) {
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
    let pin_point = RendererCanvasToLocal(this.renderer, this.state.mouse.canvas);

    // We change the scale
    let delta = -event.deltaY;
    let scale_change = new Vec2(delta * this.state.mouse.wheel_factor.x,
                                delta * this.state.mouse.wheel_factor.y);
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

    this.SetPointsFromEvent(event);
    this.manager.closest_point = this.SearchForClosestPoint(this.state.mouse.local);
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
    let prev_pos = this.state.internal.prev_pos;
    let current_pos = this.state.internal.current_pos;
    let diff = new Vec2(current_pos.x - prev_pos.x,
                        current_pos.y - prev_pos.y);
    let offset = new Vec2(diff.x / this.renderer.width,
                           diff.y / this.renderer.height);
    // We invert the y-axis
    offset.y *= -1;

    this.renderer.offset = Vec2.Sum(this.renderer.offset, offset);
  }

  private ProcessZoomDrag(event: any) {
    // Get the old bounds
    let start = RendererCanvasToLocal(this.renderer, this.state.temp.last_down);
    let end = RendererCanvasToLocal(this.renderer, this.state.temp.last_up);
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

  private SetPointsFromEvent(event: any) {
    // Screen
    let current_pos = this.GetScreenPosFromEvent(event);
    this.state.mouse.screen = current_pos;
    this.state.internal.prev_pos = this.state.internal.current_pos;
    this.state.internal.current_pos = current_pos;

    // Canvas relative
    let canvas_pos = this.GetCanvasPosFromEvent(event);
    this.state.mouse.canvas = canvas_pos;

    // var local = this.CanvasToLocal(canvas_pos);
    var local = RendererCanvasToLocal(this.renderer, canvas_pos);
    this.state.mouse.local = local;
  }

  private GetScreenPosFromEvent(event: any) {
    let screen_pos = new Vec2(event.screenX,
                              window.screen.height - event.screenY);
    return screen_pos;
  }

  private GetCanvasPosFromEvent(event: any) {
    let client_pos = new Vec2(event.clientX, event.clientY);
    let bounds = event.target.getBoundingClientRect();
    let canvas_pos = new Vec2(event.clientX - bounds.left,
                           bounds.height - (event.clientY - bounds.top));
    return canvas_pos;
  }

}

export default Interaction;
