import {DrawSpace, RendererElemId, RendererInterface} from "./renderer_interface";
import AllShaders from "./shaders";
import {Bounds, Vec2} from "./vectors";
import {Color} from "./colors";

import {RendererCalculateBounds} from "./transforms";

// Globally loaded script
declare let twgl: any;
let g_inf = 9999999999999999;   /* BIG NUMBER */

/**
 * RendererElem
 * ------------
 *
 * An element registered within the Renderer.
 * Holds all the information to render it correctly.
 **/
class RendererElem {
  buffer_info: any;
  // What GL primitive use to draw this
  gl_primitive: any;
};

/**
 * RendererElemRegistry
 * --------------------
 *
 * Helper class for registering
 **/
class RendererElemRegistry {
  private _elements: Array<RendererElem>;

  constructor() {
    this._elements = new Array<RendererElem>();
  }

  get Count() : number {
    return this._elements.length;
  }

  Get(elem_id: RendererElemId) : RendererElem {
    return this._elements[elem_id.id];
  }

  Register(elem: RendererElem) : RendererElemId {
    let id = this._elements.length;
    this._elements.push(elem);

    // We "abuse" the interface
    let elem_id = {
      id: id,
    }
    return elem_id;
  }
}

class Renderer implements RendererInterface {

  private _gl: WebGL2RenderingContext;

  private _state: {
    bounds: Bounds,
    offset: Vec2,
    scale: Vec2,
  };

  private _program_infos: {
    // "Normal" programs
    local: any,
    pixel: any,
    // Point Sprite programs
    local_ps: any,
    pixel_ps: any,
  };

  private _elems: RendererElemRegistry;

  buffer_info: any;                 /* Holds up to 2 points */

  cross_texture: any;

  constructor(canvas: HTMLCanvasElement) {
    this._gl = canvas.getContext("webgl2");
    this._state = {
      bounds: Bounds.FromPoints(/* x */ -1, 1, /* y */ -1, 1),
      offset: new Vec2(0, 0),
      scale: new Vec2(1, 1),
    };
    this._elems = new RendererElemRegistry();
    this.SetupWebGL();
    this.SetupTextures();
  }

  /*************************************************
   * GETTERS/SETTERS
   *************************************************/

  private get Elements() : RendererElemRegistry {
    return this._elems;
  }

  private get ProgramInfos() : any {
    return this._program_infos;
  }

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

  private SetupWebGL() {
    let p = <any>{};
    p.local = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("direct"),
      AllShaders.GetFragmentShader("simple")]);
    p.pixel = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("pixel"),
      AllShaders.GetFragmentShader("simple")]);

    p.local_ps = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("direct"),
      AllShaders.GetFragmentShader("point_sprite")]);
    p.pixel_ps = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader("pixel"),
      AllShaders.GetFragmentShader("point_sprite")]);
    this._program_infos = p;

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
    img.src = "resources/cross.png";
  }

  AddGraph(points: number[]) : RendererElemId {
    // We set the WebGL points
    let arrays = {
      a_position_coord: points
    };

    // We create the renderer elem
    let elem = new RendererElem();
    elem.buffer_info = twgl.createBufferInfoFromArrays(this._gl, arrays)
    elem.gl_primitive = this._gl.LINE_STRIP;
    let elem_id = this.Elements.Register(elem);
    return elem_id;
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

  DrawElement(elem_id: RendererElemId, space: DrawSpace, color: Color) : void {
    let elem = this.Elements.Get(elem_id);
    if (!elem) {
      throw "Cannot find element";
    }
    if (space == DrawSpace.LOCAL) {
      this.DrawElementLocalSpace(elem, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  /******************************************************
   * PRIVATE FUNCTIONS
   ******************************************************/

  /* DRAW GRAPH */

  private DrawElementLocalSpace(elem: RendererElem, color: Color) : void {
    let program_info = this.ProgramInfos.local;
    this._gl.useProgram(program_info.program);
    twgl.setBuffersAndAttributes(this._gl, program_info, elem.buffer_info);
    let uniforms = {
      u_offset: this.Offset.AsArray(),
      u_scale: this.Scale.AsArray(),
      u_color: color.AsArray(),
    };
    twgl.setUniforms(program_info, uniforms);
    twgl.drawBufferInfo(this._gl, elem.buffer_info, elem.gl_primitive);
  }

  /* DRAW LINE */

  private DrawLinePixelSpace(p1: Vec2, p2: Vec2, color: Color) : void {
    this._gl.useProgram(this.ProgramInfos.pixel.program);
    twgl.setBuffersAndAttributes(this._gl, this.ProgramInfos.pixel, this.buffer_info);

    let new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setAttribInfoBufferFromArray(this._gl, this.buffer_info.attribs.a_position_coord, new_pos);

    let uniforms = {
      u_resolution: [this._gl.canvas.width, this._gl.canvas.height],
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.ProgramInfos.pixel, uniforms);

    // We draw
    this._gl.drawArrays(this._gl.LINES, 0, 2);
  }

  private DrawLineLocalSpace(p1: Vec2, p2: Vec2, color: Color) : void {
    this._gl.useProgram(this.ProgramInfos.local.program);
    twgl.setBuffersAndAttributes(this._gl,
                                 this.ProgramInfos.local,
                                 this.buffer_info);
    let new_pos = [p1.x, p1.y, p2.x, p2.y];
    twgl.setAttribInfoBufferFromArray(this._gl,
      this.buffer_info.attribs.a_position_coord, new_pos);

    let uniforms = {
      u_offset: this._state.offset.AsArray(),
      u_scale: this._state.scale.AsArray(),
      u_color: color.AsArray(),
    };
    twgl.setUniforms(this.ProgramInfos.local, uniforms);
    this._gl.drawArrays(this._gl.LINES, 0, 2);
  }

  /* DRAW ICON */

  private DrawIconPixelSpace(point: Vec2, color: Color) : void {
    if (!this.cross_texture) {
      return;
    }

    this._gl.enable(this._gl.BLEND);
    this._gl.useProgram(this.ProgramInfos.pixel_ps.program);
    twgl.setBuffersAndAttributes(this._gl,
                                 this.ProgramInfos.pixel_ps,
                                 this.buffer_info);
    twgl.setAttribInfoBufferFromArray(this._gl,
      this.buffer_info.attribs.a_position_coord, point.AsArray());

    let uniforms = {
      u_color: color,
      u_resolution: [this._gl.canvas.width, this._gl.canvas.height],
      u_point_size: 10,
      u_sampler: 0
    };
    twgl.setUniforms(this.ProgramInfos.pixel_ps, uniforms);
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.cross_texture);
    this._gl.drawArrays(this._gl.POINTS, 0, 1);
  }

  private DrawIconLocalSpace(point: Vec2, color: Color) : void {
    if (!this.cross_texture) {
      return;
    }
    this._gl.enable(this._gl.BLEND);
    this._gl.useProgram(this.ProgramInfos.local_ps.program);
    twgl.setBuffersAndAttributes(this._gl,
                                 this.ProgramInfos.local_ps,
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
    twgl.setUniforms(this.ProgramInfos.local_ps, uniforms);
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.cross_texture);
    this._gl.drawArrays(this._gl.POINTS, 0, 1);
  }

  /* DRAW TRIANGLE_STRIP */

  private DrawTriangleStripPixelSpace(points: Vec2[], color: Color) {
    this._gl.useProgram(this.ProgramInfos.pixel.program);

    twgl.setBuffersAndAttributes(this._gl, this.ProgramInfos.pixel, this.buffer_info);
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
    twgl.setUniforms(this.ProgramInfos.pixel, uniforms);
    this._gl.drawArrays(this._gl.TRIANGLE_STRIP, 0, v_points.length / 2);
  }
}

export {Renderer};
export default Renderer;
