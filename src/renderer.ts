import AllShaders from "./shaders";
import {Vec2} from "./vectors";

declare var twgl: any;

class Renderer {

  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;

  state: {
    offset: Vec2,
    scale: Vec2,
  };

  // "Normal" programs
  local_program_info: any;
  pixel_program_info: any;
  // Point Sprite programs
  local_ps_program_info: any;
  pixel_ps_program_info: any;

  graph_buffer_info: any;           /* Holds the points of the graph */
  buffer_info: any;                 /* Holds up to 2 points */

  cross_texture: any;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      offset: new Vec2(0, 0),
      scale: new Vec2(1, 1),
    };
    this.gl = canvas.getContext("webgl2");
    this.SetupWebGL();
    this.SetupTextures();
  }

  private SetupWebGL() {
    this.local_program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("direct"),
      AllShaders.GetFragmentShader("simple")]);
    this.pixel_program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("pixel"),
      AllShaders.GetFragmentShader("simple")]);

    this.local_ps_program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("direct"),
      AllShaders.GetFragmentShader("point_sprite")]);
    this.pixel_ps_program_info = twgl.createProgramInfo(this.gl, [
      AllShaders.GetVertexShader("pixel"),
      AllShaders.GetFragmentShader("point_sprite")]);

    // We create the overlay buffers
    var arrays = {
      a_position_coord: Array<number>(4)
    };
    // this.pixel_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
    // this.local_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
    // this.ps_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);

    this.buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
  }

  private SetupTextures() {
    // We ge the element
    const img = new Image();
    img.addEventListener("load", () => {
      this.cross_texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.cross_texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D,
        0,                        // LOD
        this.gl.RGBA,             // Format
        img.width,
        img.height,
        0,                        // Border
        this.gl.RGBA,             // Input Format
        this.gl.UNSIGNED_BYTE,
        img);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

      this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    });

    img.crossOrigin = "";
    img.src = "src/resources/cross.png";
  }

  AddGraph(points: number[]) {
    // We set the WebGL points
    var arrays = {
      a_position_coord: points
    };
    this.graph_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
  }

  ResizeCanvas() {
    twgl.resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  ChangeDimensions(dim_x: Vec2, dim_y: Vec2) {
    // We get the new scale
    var scale = new Vec2(2 / (dim_x.last - dim_x.first),
                         2 / (dim_y.last - dim_y.first));
    this.state.scale = scale;

    // We get the offset by knowing that, without
    // offset and scale, the bottom dim_xy is -1
    var offset = new Vec2(-1 - (dim_x.first * scale.x),
                          -1 - (dim_y.first * scale.x));
    this.state.offset = offset;
  }

  /*************************************************
   * RENDERING FUNCTIONS
   *************************************************/

  Clear(clear_color: number[]) {
    // this.gl.clearColor(this.state.graph_info.background_color[0],
    //                    this.state.graph_info.background_color[1],
    //                    this.state.graph_info.background_color[2],
    //                    this.state.graph_info.background_color[3]);
    this.gl.clearColor(clear_color[0], clear_color[1],
                       clear_color[2], clear_color[3]);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  DrawGraphLocalSpace(color: number[]) {
    // Set shader program
    this.gl.useProgram(this.local_program_info.program);

    // Set the current buffers and attributes
    twgl.setBuffersAndAttributes(this.gl, this.local_program_info, this.graph_buffer_info);

    // Set the uniforms
    var uniforms = {
      u_offset: this.state.offset.AsArray(),
      u_scale: this.state.scale.AsArray(),
      u_color: color
    };
    twgl.setUniforms(this.local_program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this.gl, this.graph_buffer_info, this.gl.LINE_STRIP);
  }

  /* DRAW LINE */

  DrawLinePixelSpace(p1: Vec2, p2: Vec2, color: number[]) {
    this.gl.useProgram(this.pixel_program_info.program);
    var new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setBuffersAndAttributes(this.gl, this.pixel_program_info, this.buffer_info);
    twgl.setAttribInfoBufferFromArray(this.gl, this.buffer_info.attribs.a_position_coord, new_pos);

    var uniforms = {
      u_resolution: [this.gl.canvas.width, this.gl.canvas.height],
      u_color: color,
    };
    twgl.setUniforms(this.pixel_program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this.gl, this.buffer_info, this.gl.LINES);
  }

  DrawLineLocalSpace(p1: Vec2, p2: Vec2, color: number[]) {
    this.gl.useProgram(this.local_program_info.program);
    twgl.setBuffersAndAttributes(this.gl,
                                 this.local_program_info,
                                 this.buffer_info);
    var new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setAttribInfoBufferFromArray(this.gl,
      this.buffer_info.attribs.a_position_coord, new_pos);

    var uniforms = {
      u_offset: this.state.offset.AsArray(),
      u_scale: this.state.scale.AsArray(),
      u_color: color,
    };
    twgl.setUniforms(this.local_program_info, uniforms);
    twgl.drawBufferInfo(this.gl, this.buffer_info, this.gl.LINES);
  }

  /* DRAW ICON */

  DrawIconPixelSpace(point: Vec2, color: Vec2) {
    if (!this.cross_texture) {
      return;
    }

    this.gl.enable(this.gl.BLEND);
    this.gl.useProgram(this.pixel_ps_program_info.program);
    twgl.setBuffersAndAttributes(this.gl,
                                 this.pixel_ps_program_info,
                                 this.buffer_info);
    twgl.setAttribInfoBufferFromArray(this.gl,
      this.buffer_info.attribs.a_position_coord, point.AsArray());

    var uniforms = {
      u_color: color,
      u_resolution: [this.gl.canvas.width, this.gl.canvas.height],
      u_point_size: 10,
      u_sampler: 0
    };
    twgl.setUniforms(this.pixel_ps_program_info, uniforms);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.cross_texture);
    this.gl.drawArrays(this.gl.POINTS, 0, 1);
  }

  DrawIconLocalSpace(point: Vec2, color: number[]) {
    if (!this.cross_texture) {
      return;
    }
    this.gl.enable(this.gl.BLEND);
    this.gl.useProgram(this.local_ps_program_info.program);
    twgl.setBuffersAndAttributes(this.gl,
                                 this.local_ps_program_info,
                                 this.buffer_info);
    // We update the point
    twgl.setAttribInfoBufferFromArray(this.gl,
      this.buffer_info.attribs.a_position_coord, point.AsArray());

    var uniforms = {
      u_offset: this.state.offset.AsArray(),
      u_scale: this.state.scale.AsArray(),
      u_color: color,
      u_resolution: [this.gl.canvas.width, this.gl.canvas.height],
      u_point_size: 10,
      u_sampler: 0
    };
    twgl.setUniforms(this.local_ps_program_info, uniforms);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.cross_texture);
    this.gl.drawArrays(this.gl.POINTS, 0, 1);
  }

}

export default Renderer;
