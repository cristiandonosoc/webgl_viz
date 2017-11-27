///<reference path="resources/webgl2.d.ts" />

import AllShaders from "./shaders";
// We mark twgl as a global
declare var twgl: any;

class GraphRenderer {

  gl: WebGL2RenderingContext;
  program_info: any;
  buffer_info: any;

  points: number[];

  constructor(graph_canvas: HTMLCanvasElement) {
    this.gl = graph_canvas.getContext("webgl2");
    this.program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("graph_line"),
      AllShaders.GetFragmentShader("graph_line")]);
  }

  AddPoints(points: number[]) {
    this.points = points;

    var arrays = {
      a_position_coord: this.points
    };

    this.buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
  }

  Draw() {
    // Resize
    twgl.resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // Clear Canvas
    this.gl.clearColor(1, 1, 1, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Set shader program
    this.gl.useProgram(this.program_info.program);

    // Set the current buffers and attributes
    twgl.setBuffersAndAttributes(this.gl, this.program_info, this.buffer_info);

    // Set the uniforms
    var uniforms = {
      u_color: [0, 0, 0, 1]
    };
    twgl.setUniforms(this.program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this.gl, this.buffer_info, this.gl.LINE_STRIP);
  }

}

export default GraphRenderer;
