///<reference path="resources/webgl2.d.ts" />

import AllShaders from "./shaders";
// We mark twgl as a global
declare var twgl: any;

class GraphRenderer {

  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program_info: any;
  buffer_info: any;

  state: {
    graph_info: {
      offset: number[],                 /* size = 2 */
      scale: number[],                  /* size = 2 */
      background_color: number[],       /* size = 2 */
      line_color: number[],             /* size = 2 */
      line_width: number
    },
    interaction: {
      mouse_pos: number[],
      dragging: boolean,
    }
  };

  points: number[];

  constructor(graph_canvas: HTMLCanvasElement) {
    this.canvas = graph_canvas;
    this.CreateDefaults();
    this.SetupInteraction();
    this.gl = graph_canvas.getContext("webgl2");
    this.program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("graph_line"),
      AllShaders.GetFragmentShader("graph_line")]);

  }

  private CreateDefaults() {
    var graph_info = {
      offset: [0, 0],
      scale: [0, 0],
      background_color: [1, 1, 1, 1],
      line_color: [0, 0, 0, 1],
      line_width: 1
    };

    var interaction = {
      mouse_pos: [0, 0],
      dragging: false
    };

    this.state = {
      graph_info: graph_info,
      interaction: interaction
    };
  }


  private SetupInteraction() {
    this.canvas.addEventListener("mousedown", this.MouseDown);
    document.addEventListener("mouseup", this.MouseUp);
    document.addEventListener("mousemove", this.MouseMove);
  }

  private MouseDown = (event: any) => {
    this.state.interaction.dragging = true;
    this.state.interaction.mouse_pos = [event.screenX, event.screenY];
  }

  private MouseUp = (event: any) => {
    this.state.interaction.dragging = false;
  }

  private MouseMove = (event: any) => {
    if (!this.state.interaction.dragging) {
      return;
    }

    var last_pos = this.state.interaction.mouse_pos;
    var current_pos = [event.screenX, event.screenY];
    this.state.interaction.mouse_pos = current_pos;

    var diff = [current_pos[0] - last_pos[0],
                current_pos[1] - last_pos[1]];
    var offset = [diff[0] / this.gl.canvas.width,
                  diff[1] / this.gl.canvas.height];


    // We apply this offset
    this.state.graph_info.offset[0] += offset[0];
    this.state.graph_info.offset[1] -= offset[1];

  }

  AddPoints(points: number[]) {
    this.points = points;

    var arrays = {
      a_position_coord: this.points
    };

    this.buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
  }

  private Clear() {
    this.gl.clearColor(this.state.graph_info.background_color[0],
                       this.state.graph_info.background_color[1],
                       this.state.graph_info.background_color[2],
                       this.state.graph_info.background_color[3]);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  Draw() {
    // Resize
    twgl.resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // Clear Canvas
    this.Clear();

    // Set shader program
    this.gl.useProgram(this.program_info.program);

    // Set the current buffers and attributes
    twgl.setBuffersAndAttributes(this.gl, this.program_info, this.buffer_info);

    // Set the uniforms
    var uniforms = {
      u_offset: this.state.graph_info.offset,
      u_color: this.state.graph_info.line_color
    };
    twgl.setUniforms(this.program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this.gl, this.buffer_info, this.gl.LINE_STRIP);
  }

}

export default GraphRenderer;
