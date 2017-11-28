///<reference path="resources/webgl2.d.ts" />

import AllShaders from "./shaders";
import Interaction from "./interaction";



// We mark twgl as a global
declare var twgl: any;
var g_inf = 99999999;

class GraphRenderer {

  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;

  /* WebGL programs */
  direct_program_info: any;   /* For rendering in local space */
  pixel_program_info: any;    /* For rendering in pixel space */

  graph_buffer_info: any;     /* Holds a graph, should be one per graph */

  direct_buffer_info: any;    /* Holds a pair of points */
  pixel_buffer_info: any;     /* Holds a pair of points */

  interaction: Interaction;   /* Manages interaction with browser (mostly mouse */

  /* ICONS */
  cross_icon: Image;

  // Internal state of the renderer
  state: {
    graph_info: {
      offset: number[],                 /* size = 2 */
      scale: number[],                  /* size = 2 */
      background_color: number[],       /* size = 2 */
      line_color: number[],             /* size = 2 */
      line_width: number
    },
  };

  points: number[];
  custom_points: Array<number[]>;

  constructor(graph_canvas: HTMLCanvasElement) {
    this.canvas = graph_canvas;
    this.CreateDefaults();
    this.SetupWebGl();
    this.interaction = new Interaction(this);
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
      mouse: {
        local: [0, 0],
        canvas: [0, 0],
        screen: [0, 0]
      },
      dragging: false
    };

    this.state = {
      graph_info: graph_info,
    };
  }

  private SetupWebGl() {
    this.gl = this.canvas.getContext("webgl2");
    this.direct_program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("direct"), AllShaders.GetFragmentShader("direct")]);
    this.pixel_program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("pixel"), AllShaders.GetFragmentShader("pixel")]);

    // We create the overlay buffers
    var arrays = {
      a_position_coord: Array<number>(4)
    };
    this.pixel_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
    this.direct_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
  }


  AddPoints(points: number[]) {
    // We set the WebGL points
    var arrays = {
      a_position_coord: points
    };
    this.graph_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);

    var arr = new Array<number[]>(points.length / 2);
    for (var i = 0; i < arr.length; i += 1) {
      var point_index = i * 2;
      arr[i] = [points[point_index], points[point_index + 1]];
    }

    // We sort
    this.custom_points = arr.sort((x: number[], y: number[]) => {
      return x[0] - y[0];
    });
  }

  private Clear() {
    this.gl.clearColor(this.state.graph_info.background_color[0],
                       this.state.graph_info.background_color[1],
                       this.state.graph_info.background_color[2],
                       this.state.graph_info.background_color[3]);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /*******************************************
   * DRAWING
   *******************************************/

  Draw(time: number) {
    // Resize
    twgl.resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // Clear Canvas
    this.Clear();

    this.DrawGraph(time);
    // this.DrawOverlay(time);
    // this.DrawLinePixelSpace([-g_inf, this.gl.canvas.height/2], [g_inf, this.gl.canvas.height/2]);
    this.DrawLineLocalSpace([-g_inf, 0], [g_inf, 0], this.state.graph_info.offset);
  }

  private DrawGraph(time: number) {
    // Set shader program
    this.gl.useProgram(this.direct_program_info.program);

    // Set the current buffers and attributes
    twgl.setBuffersAndAttributes(this.gl, this.direct_program_info, this.graph_buffer_info);

    // Set the uniforms
    var uniforms = {
      u_offset: this.state.graph_info.offset,
      u_color: this.state.graph_info.line_color
    };
    twgl.setUniforms(this.direct_program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this.gl, this.graph_buffer_info, this.gl.LINE_STRIP);
  }

  private DrawLinePixelSpace(p1: number[], p2: number[]) {
    this.gl.useProgram(this.pixel_program_info.program);
    // We update the buffers
    // var new_pos = [
    //   this.interaction.state.mouse.canvas[0], -10000,
    //   this.interaction.state.mouse.canvas[0], 10000,
    //   -10000, this.gl.canvas.height - this.interaction.state.mouse.canvas[1],
    //   10000,  this.gl.canvas.height - this.interaction.state.mouse.canvas[1]
    // ];
    var new_pos = [p1[0], p1[1], p2[0], p2[1]];
    // console.log(new_pos);
    twgl.setBuffersAndAttributes(this.gl, this.pixel_program_info, this.pixel_buffer_info);
    twgl.setAttribInfoBufferFromArray(this.gl, this.pixel_buffer_info.attribs.a_position_coord, new_pos);


    var uniforms = {
      u_resolution: [this.gl.canvas.width, this.gl.canvas.height],
      u_color: [0.2, 0.6, 0.2, 1],
    };
    twgl.setUniforms(this.pixel_program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this.gl, this.pixel_buffer_info, this.gl.LINES);
  }

  private DrawLineLocalSpace(p1: number[], p2: number[], offset: number[]) {
    this.gl.useProgram(this.direct_program_info.program);
    var new_pos = [p1[0], p1[1], p2[0], p2[1]];
    twgl.setBuffersAndAttributes(this.gl, this.direct_program_info, this.direct_buffer_info);
    twgl.setAttribInfoBufferFromArray(this.gl, this.direct_buffer_info.attribs.a_position_coord, new_pos);

    var uniforms = {
      u_offset: offset,
      u_color: [0.2, 0.6, 0.2, 1],
    };
    twgl.setUniforms(this.direct_program_info, uniforms);
    twgl.drawBufferInfo(this.gl, this.direct_buffer_info, this.gl.LINES);
  }

}

export default GraphRenderer;
