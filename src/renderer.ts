import {DrawSpace, RendererInterface} from "./renderer_interface";
import AllShaders from "./shaders";
import {Bounds, Vec2} from "./vectors";
import {Color} from "./colors";

import {RendererCalculateBounds} from "./transforms";

declare let twgl: any;
let g_inf = 9999999999999999;   /* BIG NUMBER */

class Renderer implements RendererInterface {

  private _gl: WebGL2RenderingContext;

  private _state: {
    bounds: Bounds,
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

  /*************************************************
   * GETTERS/SETTERS
   *************************************************/

  get Canvas() : HTMLCanvasElement {
    return this._gl.canvas;
  }

  get Offset() : Vec2 {
    return this._state.offset;
  }

  set Offset(new_offset: Vec2) {
    this._state.offset = new_offset;
    this._state.bounds = RendererCalculateBounds(this);
  }

  get Scale() : Vec2 {
    return this._state.scale;
  }

  set Scale(new_scale: Vec2) {
    this._state.scale = new_scale;
    this._state.bounds = RendererCalculateBounds(this);
  }

  get Bounds() : Bounds {
    return this._state.bounds;
  }

  set Bounds(new_bounds: Bounds) {
    this._state.bounds = new_bounds;

    // We get the new scale
    let scale = new Vec2(2 / (new_bounds.x.last - new_bounds.x.first),
                         2 / (new_bounds.y.last - new_bounds.y.first));
    this._state.scale = scale;

    // We get the offset by knowing that, without
    // offset and scale, the bottom dim_xy is -1
    let offset = new Vec2(-1 - (new_bounds.x.first * scale.x),
                          -1 - (new_bounds.y.first * scale.y));
    this._state.offset = offset;
  }

  get Width() : number {
    return this._gl.canvas.width;
  }

  get Height() : number {
    return this._gl.canvas.height;
  }

  constructor(canvas: HTMLCanvasElement) {
    this._gl = canvas.getContext("webgl2");
    this._state = {
      bounds: Bounds.FromPoints(/* x */ -1, 1, /* y */ -1, 1),
      offset: new Vec2(0, 0),
      scale: new Vec2(1, 1),
    };
    this.SetupWebGL();
    this.SetupTextures();
  }

  private SetupWebGL() {
    this.local_program_info = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("direct"),
      AllShaders.GetFragmentShader("simple")]);
    this.pixel_program_info = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("pixel"),
      AllShaders.GetFragmentShader("simple")]);

    this.local_ps_program_info = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("direct"),
      AllShaders.GetFragmentShader("point_sprite")]);
    this.pixel_ps_program_info = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("pixel"),
      AllShaders.GetFragmentShader("point_sprite")]);

    // We create the overlay buffers
    let arrays = {
      a_position_coord: Array<number>(100)
    };
    // this.pixel_buffer_info = twgl.createBufferInfoFromArrays(this._gl, arrays);
    // this.local_buffer_info = twgl.createBufferInfoFromArrays(this._gl, arrays);
    // this.ps_buffer_info = twgl.createBufferInfoFromArrays(this._gl, arrays);

    this.buffer_info = twgl.createBufferInfoFromArrays(this._gl, arrays);
  }

  private SetupTextures() {
    // We ge the element
    const img = new Image();
    img.addEventListener("load", () => {
      this.cross_texture = this._gl.createTexture();
      this._gl.bindTexture(this._gl.TEXTURE_2D, this.cross_texture);
      this._gl.texImage2D(this._gl.TEXTURE_2D,
        0,                        // LOD
        this._gl.RGBA,             // Format
        img.width,
        img.height,
        0,                        // Border
        this._gl.RGBA,             // Input Format
        this._gl.UNSIGNED_BYTE,
        img);
      this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, this._gl.NEAREST);
      this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._gl.NEAREST);

      this._gl.bindTexture(this._gl.TEXTURE_2D, null);
    });

    img.crossOrigin = "";
    img.src = "src/resources/cross.png";
  }

  AddGraph(points: number[]) : void {
    // We set the WebGL points
    let arrays = {
      a_position_coord: points
    };
    this.graph_buffer_info = twgl.createBufferInfoFromArrays(this._gl, arrays);
  }

  ResizeCanvas() : void {
    twgl.resizeCanvasToDisplaySize(this._gl.canvas);
    this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
  }

  /*************************************************
   * RENDERING FUNCTIONS
   *************************************************/

  Clear(color: Color) : void {
    this._gl.clearColor(color.r, color.g,
                       color.b, color.a);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
  }

  DrawGraph(space: DrawSpace, color: Color) : void {
    if (space == DrawSpace.LOCAL) {
      this.DrawGraphLocalSpace(color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  DrawLine(p1: Vec2, p2: Vec2, space: DrawSpace, color: Color) : void {
    if (space == DrawSpace.LOCAL) {
      this.DrawLineLocalSpace(p1, p2, color);
    } else if (space == DrawSpace.PIXEL) {
      this.DrawLinePixelSpace(p1, p2, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  DrawHorizontalLine(y: number, space: DrawSpace, color: Color) : void {
    let p1 = new Vec2(-g_inf, y);
    let p2 = new Vec2(+g_inf, y);
    this.DrawLine(p1, p2, space, color);
  }

  DrawVerticalLine(x: number, space: DrawSpace, color: Color) : void {
    let p1 = new Vec2(x, -g_inf);
    let p2 = new Vec2(x, +g_inf);
    this.DrawLine(p1, p2, space, color);
  }

  /* RANGES */

  DrawHorizontalRange(start: number, end: number, space: DrawSpace, color: Color) : void {
    let min = Math.min(start, end);
    let max = Math.max(start, end);
    if (space == DrawSpace.PIXEL) {
      let points = Array<Vec2>(4);
      points[0] = new Vec2(-g_inf, min);
      points[1] = new Vec2(+g_inf, min);
      points[2] = new Vec2(-g_inf, max);
      points[3] = new Vec2(+g_inf, max);
      this.DrawTriangleStripPixelSpace(points, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  DrawVerticalRange(start: number, end: number, space: DrawSpace, color: Color) : void {
    let min = Math.min(start, end);
    let max = Math.max(start, end);
    if (space == DrawSpace.PIXEL) {
      let points = Array<Vec2>(4);
      points[0] = new Vec2(min, -g_inf);
      points[1] = new Vec2(min, +g_inf);
      points[2] = new Vec2(max, -g_inf);
      points[3] = new Vec2(max, +g_inf);
      this.DrawTriangleStripPixelSpace(points, color);
    } else {
      throw "unsupported DrawSpace";
    }
  }

  /* BOX */

  DrawBox(p1: Vec2, p2: Vec2, space: DrawSpace, color: Color) : void {
    let min = Vec2.Min(p1, p2);
    let max = Vec2.Max(p1, p2);
    if (space == DrawSpace.PIXEL) {
      let points = Array<Vec2>(4);
      points[0] = new Vec2(min.x, min.y);
      points[1] = new Vec2(min.x, max.y);
      points[2] = new Vec2(max.x, min.y);
      points[3] = new Vec2(max.x, max.y);
      this.DrawTriangleStripPixelSpace(points, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  /* ICON */

  DrawIcon(point: Vec2, space: DrawSpace, color: Color) : void {
    if (space == DrawSpace.LOCAL) {
      this.DrawIconLocalSpace(point, color);
    } else if (space == DrawSpace.PIXEL) {
      this.DrawIconPixelSpace(point, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  /******************************************************
   * PRIVATE FUNCTIONS
   ******************************************************/

  /* DRAW GRAPH */

  private DrawGraphLocalSpace(color: Color) : void {
    // Set shader program
    this._gl.useProgram(this.local_program_info.program);

    // Set the current buffers and attributes
    twgl.setBuffersAndAttributes(this._gl, this.local_program_info, this.graph_buffer_info);

    // Set the uniforms
    let uniforms = {
      u_offset: this._state.offset.AsArray(),
      u_scale: this._state.scale.AsArray(),
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.local_program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this._gl, this.graph_buffer_info, this._gl.LINE_STRIP);
  }

  /* DRAW LINE */

  private DrawLinePixelSpace(p1: Vec2, p2: Vec2, color: Color) : void {
    this._gl.useProgram(this.pixel_program_info.program);
    twgl.setBuffersAndAttributes(this._gl, this.pixel_program_info, this.buffer_info);

    let new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setAttribInfoBufferFromArray(this._gl, this.buffer_info.attribs.a_position_coord, new_pos);

    let uniforms = {
      u_resolution: [this._gl.canvas.width, this._gl.canvas.height],
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.pixel_program_info, uniforms);

    // We draw
    this._gl.drawArrays(this._gl.LINES, 0, 2);
  }

  private DrawLineLocalSpace(p1: Vec2, p2: Vec2, color: Color) : void {
    this._gl.useProgram(this.local_program_info.program);
    twgl.setBuffersAndAttributes(this._gl,
                                 this.local_program_info,
                                 this.buffer_info);
    let new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setAttribInfoBufferFromArray(this._gl,
      this.buffer_info.attribs.a_position_coord, new_pos);

    let uniforms = {
      u_offset: this._state.offset.AsArray(),
      u_scale: this._state.scale.AsArray(),
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.local_program_info, uniforms);
    this._gl.drawArrays(this._gl.LINES, 0, 2);
  }

  /* DRAW ICON */

  private DrawIconPixelSpace(point: Vec2, color: Color) : void {
    if (!this.cross_texture) {
      return;
    }

    this._gl.enable(this._gl.BLEND);
    this._gl.useProgram(this.pixel_ps_program_info.program);
    twgl.setBuffersAndAttributes(this._gl,
                                 this.pixel_ps_program_info,
                                 this.buffer_info);
    twgl.setAttribInfoBufferFromArray(this._gl,
      this.buffer_info.attribs.a_position_coord, point.AsArray());

    let uniforms = {
      u_color: color,
      u_resolution: [this._gl.canvas.width, this._gl.canvas.height],
      u_point_size: 10,
      u_sampler: 0
    };
    twgl.setUniforms(this.pixel_ps_program_info, uniforms);
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.cross_texture);
    this._gl.drawArrays(this._gl.POINTS, 0, 1);
  }

  private DrawIconLocalSpace(point: Vec2, color: Color) : void {
    if (!this.cross_texture) {
      return;
    }
    this._gl.enable(this._gl.BLEND);
    this._gl.useProgram(this.local_ps_program_info.program);
    twgl.setBuffersAndAttributes(this._gl,
                                 this.local_ps_program_info,
                                 this.buffer_info);
    // We update the point
    twgl.setAttribInfoBufferFromArray(this._gl,
      this.buffer_info.attribs.a_position_coord, point.AsArray());

    let uniforms = {
      u_offset: this._state.offset.AsArray(),
      u_scale: this._state.scale.AsArray(),
      u_color: color.AsArray(),
      u_resolution: [this._gl.canvas.width, this._gl.canvas.height],
      u_point_size: 10,
      u_sampler: 0
    };
    twgl.setUniforms(this.local_ps_program_info, uniforms);
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.cross_texture);
    this._gl.drawArrays(this._gl.POINTS, 0, 1);
  }

  /* DRAW TRIANGLE_STRIP */

  private DrawTriangleStripPixelSpace(points: Vec2[], color: Color) {
    this._gl.useProgram(this.pixel_program_info.program);

    twgl.setBuffersAndAttributes(this._gl, this.pixel_program_info, this.buffer_info);
    // this._gl.frontFace(this._gl.CCW);

    // TODO(donosoc): Use indexes and not hardcoded indexing :(
    // First triangle
    let v_points = Array<number>();
    v_points.push(points[0].x);
    v_points.push(points[0].y);
    v_points.push(points[1].x);
    v_points.push(points[1].y);
    v_points.push(points[2].x);
    v_points.push(points[2].y);
    // Second triangle
    v_points.push(points[3].x);
    v_points.push(points[3].y);
    twgl.setAttribInfoBufferFromArray(this._gl, this.buffer_info.attribs.a_position_coord, v_points);

    let uniforms = {
      u_resolution: [this._gl.canvas.width, this._gl.canvas.height],
      u_color: color.AsArray(),
    }
    twgl.setUniforms(this.pixel_program_info, uniforms);
    this._gl.drawArrays(this._gl.TRIANGLE_STRIP, 0, v_points.length / 2);
  }
}

export {Renderer};
export default Renderer;
