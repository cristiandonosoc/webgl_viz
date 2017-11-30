import {DrawSpace, RendererInterface} from "./renderer_interface";
import AllShaders from "./shaders";
import {Bounds, Vec2} from "./vectors";
import {Color} from "./colors";

import {RendererCalculateBounds} from "./transforms";

declare let twgl: any;
let g_inf = 9999999999999999;   /* BIG NUMBER */

class Renderer implements RendererInterface {

  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;

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

  get offset() : Vec2 {
    return this._state.offset;
  }

  set offset(new_offset: Vec2) {
    this._state.offset = new_offset;
    this._state.bounds = RendererCalculateBounds(this);
  }

  get scale() : Vec2 {
    return this._state.scale;
  }

  set scale(new_scale: Vec2) {
    this._state.scale = new_scale;
    this._state.bounds = RendererCalculateBounds(this);
  }

  get bounds() : Bounds {
    return this._state.bounds;
  }

  set bounds(new_bounds: Bounds) {
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

  get width() : number {
    return this.gl.canvas.width;
  }

  get height() : number {
    return this.gl.canvas.height;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this._state = {
      bounds: Bounds.FromPoints(/* x */ -1, 1, /* y */ -1, 1),
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
    let arrays = {
      a_position_coord: Array<number>(100)
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

  AddGraph(points: number[]) : void {
    // We set the WebGL points
    let arrays = {
      a_position_coord: points
    };
    this.graph_buffer_info = twgl.createBufferInfoFromArrays(this.gl, arrays);
  }

  ResizeCanvas() : void {
    twgl.resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  /*************************************************
   * RENDERING FUNCTIONS
   *************************************************/

  Clear(color: Color) : void {
    this.gl.clearColor(color.r, color.g,
                       color.b, color.a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
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
    this.gl.useProgram(this.local_program_info.program);

    // Set the current buffers and attributes
    twgl.setBuffersAndAttributes(this.gl, this.local_program_info, this.graph_buffer_info);

    // Set the uniforms
    let uniforms = {
      u_offset: this._state.offset.AsArray(),
      u_scale: this._state.scale.AsArray(),
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.local_program_info, uniforms);

    // We draw
    twgl.drawBufferInfo(this.gl, this.graph_buffer_info, this.gl.LINE_STRIP);
  }



  /* DRAW LINE */

  private DrawLinePixelSpace(p1: Vec2, p2: Vec2, color: Color) : void {
    this.gl.useProgram(this.pixel_program_info.program);
    twgl.setBuffersAndAttributes(this.gl, this.pixel_program_info, this.buffer_info);

    let new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setAttribInfoBufferFromArray(this.gl, this.buffer_info.attribs.a_position_coord, new_pos);

    let uniforms = {
      u_resolution: [this.gl.canvas.width, this.gl.canvas.height],
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.pixel_program_info, uniforms);

    // We draw
    this.gl.drawArrays(this.gl.LINES, 0, 2);
  }

  private DrawLineLocalSpace(p1: Vec2, p2: Vec2, color: Color) : void {
    this.gl.useProgram(this.local_program_info.program);
    twgl.setBuffersAndAttributes(this.gl,
                                 this.local_program_info,
                                 this.buffer_info);
    let new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setAttribInfoBufferFromArray(this.gl,
      this.buffer_info.attribs.a_position_coord, new_pos);

    let uniforms = {
      u_offset: this._state.offset.AsArray(),
      u_scale: this._state.scale.AsArray(),
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.local_program_info, uniforms);
    this.gl.drawArrays(this.gl.LINES, 0, 2);
  }

  /* DRAW ICON */

  private DrawIconPixelSpace(point: Vec2, color: Color) : void {
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

    let uniforms = {
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

  private DrawIconLocalSpace(point: Vec2, color: Color) : void {
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

    let uniforms = {
      u_offset: this._state.offset.AsArray(),
      u_scale: this._state.scale.AsArray(),
      u_color: color.AsArray(),
      u_resolution: [this.gl.canvas.width, this.gl.canvas.height],
      u_point_size: 10,
      u_sampler: 0
    };
    twgl.setUniforms(this.local_ps_program_info, uniforms);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.cross_texture);
    this.gl.drawArrays(this.gl.POINTS, 0, 1);
  }

  /* DRAW RANGE */

  private DrawTriangleStripPixelSpace(points: Vec2[], color: Color) {
    this.gl.useProgram(this.pixel_program_info.program);

    twgl.setBuffersAndAttributes(this.gl, this.pixel_program_info, this.buffer_info);
    // this.gl.frontFace(this.gl.CCW);

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
    twgl.setAttribInfoBufferFromArray(this.gl, this.buffer_info.attribs.a_position_coord, v_points);

    let uniforms = {
      u_resolution: [this.gl.canvas.width, this.gl.canvas.height],
      u_color: color.AsArray(),
    }
    twgl.setUniforms(this.pixel_program_info, uniforms);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, v_points.length / 2);
  }
}

export {Renderer};
