import GraphRenderer from "./graph_renderer";

/**
 * Interaction
 * -----------
 *
 * Wraps the interaction with the browser
 * Basically maintains the tracking of how the mouse has changed on top of the
 * canvas.
 **/
class Interaction {

  renderer: GraphRenderer;
  state: {
    temp: {
      last_pos: number[],
      current_pos: number[]
    },
    mouse: {
      local: number[],
      canvas: number[],
      screen: number[]
    }
    dragging: boolean
  };

  constructor(renderer: GraphRenderer) {
    this.renderer = renderer;

    this.state = {
      temp: {
        last_pos: [0, 0],
        current_pos: [0, 0]
      },
      mouse: {
        local: [0, 0],
        canvas: [0, 0],
        screen: [0, 0]
      },
      dragging: false
    };

    this.SetupInteraction();
  }


  private SetupInteraction() {
    this.renderer.canvas.addEventListener("mousedown", this.MouseDown);
    document.addEventListener("mouseup", this.MouseUp);
    this.renderer.canvas.addEventListener("mousemove", this.MouseMove);
  }

  private MouseDown = (event: any) => {
    this.state.dragging = true;
    this.state.mouse.screen = [event.screenX, event.screenY];
    this.state.mouse.canvas = [event.clientX, event.clientY];
  }

  private MouseUp = (event: any) => {
    this.state.dragging = false;
  }

  private MouseMove = (event: any) => {
    this.ProcessMove(event);
    if (!this.state.dragging) {
      return;
    }
    this.ProcessDrag(event);
  }

  private ProcessMove(event: any) {
    // We log the variables
    // Screen
    var last_pos = this.state.mouse.screen;
    var current_pos = [event.screenX, event.screenY];
    this.state.mouse.screen = current_pos;

    this.state.temp.last_pos = last_pos;
    this.state.temp.current_pos = current_pos;

    // Canvas relative
    var bounds = this.renderer.canvas.getBoundingClientRect();
    var canvas_pos = [event.clientX - bounds.left,
                      event.clientY - bounds.top];
    this.state.mouse.canvas = canvas_pos;

    // Local (variable space)
    // Convert from pixels to 0.0 -> 1.0
    var temp = [canvas_pos[0] / this.renderer.gl.canvas.width,
               canvas_pos[1] / this.renderer.gl.canvas.height];
    var local = temp.map(i => (i * 2.0) - 1.0);
    this.state.mouse.local = local;

    this.renderer.closest_point = this.SearchForClosestPoint(local);

  }

  private ProcessDrag(event: any) {
    var last_pos = this.state.temp.last_pos;
    var current_pos = this.state.temp.current_pos;
    var diff = [current_pos[0] - last_pos[0],
                current_pos[1] - last_pos[1]];
    var offset = [diff[0] / this.renderer.gl.canvas.width,
                  diff[1] / this.renderer.gl.canvas.height];
    // We invert the y-axis
    offset[1] *= -1;

    // We updathe the date
    this.renderer.state.graph_info.offset[0] += offset[0];
    this.renderer.state.graph_info.offset[1] += offset[1];
  }

  private SearchForClosestPoint(mouse_pos: number[]) {
    var len = this.renderer.custom_points.length;
    if (mouse_pos[0] <= this.renderer.custom_points[0][0]) {
      return this.renderer.custom_points[0];
    }
    if (mouse_pos[0] >= this.renderer.custom_points[len-1][0]) {
      return this.renderer.custom_points[len-1];
    }

    // We do binary search
    var min_index = 0;
    var max_index = len - 1;

    while (min_index < max_index) {
      var half = Math.floor((min_index + max_index) / 2);
      var val = this.renderer.custom_points[half][0];

      if (val > mouse_pos[0]) {
        if (max_index == half) { break; }
        max_index = half;
      } else {
        if (min_index == half) { break; }
        min_index = half;
      }
    }

    // We now have two points
    var min_point = this.renderer.custom_points[min_index];
    var max_point = this.renderer.custom_points[max_index];

    // We want to return the closest (x-wise)
    var dist1 = Math.abs(min_point[0] - mouse_pos[0]);
    var dist2 = Math.abs(max_point[0] - mouse_pos[0]);

    if (dist1 < dist2) {
      return min_point;
    } else {
      return max_point;
    }
  }




}

export default Interaction;

