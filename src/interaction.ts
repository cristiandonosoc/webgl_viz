import GraphRenderer from "./graph_renderer";

class Interaction {

  renderer: GraphRenderer;
  state: {
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
    // We log the variables
    // Screen
    var last_pos = this.state.mouse.screen;
    var current_pos = [event.screenX, event.screenY];
    this.state.mouse.screen = current_pos;

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


    if (!this.state.dragging) {
      return;
    }


    var diff = [current_pos[0] - last_pos[0],
                current_pos[1] - last_pos[1]];
    var offset = [diff[0] / this.renderer.gl.canvas.width,
                  diff[1] / this.renderer.gl.canvas.height];
    // We invert the y-axis
    offset[1] *= -1;

    // We call the callback
    this.renderer.state.graph_info.offset[0] += offset[0];
    this.renderer.state.graph_info.offset[1] += offset[1];
  }

}

export default Interaction;

