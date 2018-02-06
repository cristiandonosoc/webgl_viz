/**
 * InternalRenderer
 * ----------------
 *
 * Provides the low level logic for rendering primitives
 * The idea of this interface is to be the building block upon
 * a custom VisualizerRenderer is built from.
 *
 * A Visualizer should never need to call one of the primitives
 **/

import {Bounds, Vec2} from "./vectors";
import GraphInfoInterface from "./graph_info";
import {Color} from "./colors";
import {INFINITY, CreateMaxBounds, GetCanvasChildByClass} from "./helpers";
import {RendererCalculateBounds} from "./transforms";
import {VertexShaders, FragmentShaders, AllShaders} from "./shaders";

/**************************************************************************
 * INTERFACES
 **************************************************************************/

/**
 * DrawSpace
 * ----------
 *
 * How coordinates should be interpreted for the draw call. Pixel space
 * coordinates are drawn to the screen withour offset-scale correction
 * (useful for drawing overlays), while the other is used for the actual
 * graphical elements being displayed (ie. the axis need to be drawn in local
 * space, but the mouse line in pixel space).
 **/
enum DrawSpace {
  LOCAL,
  PIXEL
}

/**
 * RendererElemId
 * --------------
 *
 * Identifies an element within the renderer.
 * The renderer will store the data needed to actually render the element
 * (VBO, etc).
 * This is used mainly for issuing the DrawCalls
 **/
interface RendererElemId {
  id: number;
}

interface InternalRendererInterface {
  /* GETTERS / SETTERS */
  Offset: Vec2;
  Scale: Vec2;
  Bounds: Bounds;
  readonly MaxBounds: Bounds;
  readonly Width: number;
  readonly Height: number;
  readonly Canvas: HTMLCanvasElement;
  readonly GL: WebGL2RenderingContext;

  /* MANAGING INTERFACE */
  AddGraph(graph_info: GraphInfoInterface) : void;
  ResizeCanvas() : void;
  ApplyMaxBounds() : void;

  /* RENDERING INTERFACE */
  Clear(color: Color) : void;

  DrawElement(graph_info: GraphInfoInterface, space: DrawSpace, color: Color) : void;
  DrawIconElement(graph_info: GraphInfoInterface, space: DrawSpace, color: Color) : void;

  DrawLine(p1: Vec2, p2: Vec2, space: DrawSpace, color: Color) : void;
  DrawHorizontalLine(y: number, space: DrawSpace, color: Color) : void;
  DrawVerticalLine(x: number, space: DrawSpace, color: Color) : void;

  DrawHorizontalRange(start: number, end: number, space: DrawSpace, color: Color) : void;
  DrawVerticalRange(start: number, end: number, space: DrawSpace, color: Color) : void;

  DrawBox(p1: Vec2, p2: Vec2, space: DrawSpace, color: Color) : void;

  DrawIcon(point: Vec2, space: DrawSpace, color: Color) : void;
}

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

// Globally loaded script
declare let twgl: any;

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

class InternalRenderer implements InternalRendererInterface {
  /**************************************************************************
   * CONSTRUCTOR
   **************************************************************************/

  constructor(container: HTMLElement) {
    let canvas = GetCanvasChildByClass(container, "central-canvas");
    this._gl = canvas.getContext("webgl2");
    this._state = {
      bounds: Bounds.FromPoints(/* x */ -1, 1, /* y */ -1, 1),
      max_bounds: Bounds.FromPoints(/* x */ -1, 1, /* y */ -1, 1),
      offset: new Vec2(0, 0),
      scale: new Vec2(1, 1),
    };
    this._elems = new RendererElemRegistry();
    this._SetupWebGL();
    this._SetupTextures();
  }

  /*************************************************
   * PUBLIC INTERFACE IMPL
   *************************************************/

  private get Elements() : RendererElemRegistry {
    return this._elems;
  }

  get GL() : WebGL2RenderingContext {
    return this._gl;
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

  get MaxBounds() : Bounds {
    return this._state.max_bounds;
  }

  get Width() : number {
    return this._gl.canvas.width;
  }

  get Height() : number {
    return this._gl.canvas.height;
  }

  AddGraph(graph_info: GraphInfoInterface) : void {
    // We set the WebGL points
    let arrays = {
      a_position_coord: {
        numComponents: 2,
        data: graph_info.RawPoints,
      },
    };

    // We create the renderer elem
    let elem = new RendererElem();
    elem.buffer_info = twgl.createBufferInfoFromArrays(this.GL, arrays);
    if (graph_info.GLPrimitive != undefined) {
      elem.gl_primitive = graph_info.GLPrimitive;
    } else {
      elem.gl_primitive = this.GL.LINE_STRIP;
    }

    // Register the element
    let elem_id = this.Elements.Register(elem);
    graph_info.ElemId = elem_id;

    // Update the bounds

    this._state.max_bounds = CreateMaxBounds(this.MaxBounds, graph_info.Bounds);
  }

  ResizeCanvas() : void {
    twgl.resizeCanvasToDisplaySize(this._gl.canvas);
    this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
  }

  ApplyMaxBounds() : void {
    this.Bounds = this.MaxBounds.Copy();
  }

  /*************************************************
   * RENDERING FUNCTIONS
   *************************************************/

  Clear(color: Color) : void {
    this._gl.clearColor(color.R, color.G, color.B, color.A);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
  }

  DrawLine(p1: Vec2, p2: Vec2, space: DrawSpace, color: Color) : void {
    if (space == DrawSpace.LOCAL) {
      this._DrawLineLocalSpace(p1, p2, color);
    } else if (space == DrawSpace.PIXEL) {
      this._DrawLinePixelSpace(p1, p2, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  DrawHorizontalLine(y: number, space: DrawSpace, color: Color) : void {
    let p1 = new Vec2(-INFINITY, y);
    let p2 = new Vec2(+INFINITY, y);
    this.DrawLine(p1, p2, space, color);
  }

  DrawVerticalLine(x: number, space: DrawSpace, color: Color) : void {
    let p1 = new Vec2(x, -INFINITY);
    let p2 = new Vec2(x, +INFINITY);
    this.DrawLine(p1, p2, space, color);
  }

  /* RANGES */

  DrawHorizontalRange(start: number, end: number, space: DrawSpace, color: Color) : void {
    let min = Math.min(start, end);
    let max = Math.max(start, end);
    if (space == DrawSpace.PIXEL) {
      let points = Array<Vec2>(4);
      points[0] = new Vec2(-INFINITY, min);
      points[1] = new Vec2(+INFINITY, min);
      points[2] = new Vec2(-INFINITY, max);
      points[3] = new Vec2(+INFINITY, max);
      this._DrawTriangleStripPixelSpace(points, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  DrawVerticalRange(start: number, end: number, space: DrawSpace, color: Color) : void {
    let min = Math.min(start, end);
    let max = Math.max(start, end);
    if (space == DrawSpace.PIXEL) {
      let points = Array<Vec2>(4);
      points[0] = new Vec2(min, -INFINITY);
      points[1] = new Vec2(min, +INFINITY);
      points[2] = new Vec2(max, -INFINITY);
      points[3] = new Vec2(max, +INFINITY);
      this._DrawTriangleStripPixelSpace(points, color);
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
      this._DrawTriangleStripPixelSpace(points, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  /* ICON */

  DrawIcon(point: Vec2, space: DrawSpace, color: Color) : void {
    if (space == DrawSpace.LOCAL) {
      this._DrawIconLocalSpace(point, color);
    } else if (space == DrawSpace.PIXEL) {
      this._DrawIconPixelSpace(point, color);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  DrawElement(graph_info: GraphInfoInterface, space: DrawSpace, color: Color) : void {
    let elem = this.Elements.Get(graph_info.ElemId);
    if (!elem) {
      throw "Cannot find element";
    }
    if (space == DrawSpace.LOCAL) {
      this._DrawElementLocalSpace(elem, graph_info);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  DrawIconElement(graph_info: GraphInfoInterface, space: DrawSpace, color: Color) : void {
    let elem = this.Elements.Get(graph_info.ElemId);
    if (!elem) {
      throw "Cannot find element";
    }
    if (space == DrawSpace.LOCAL) {
      this._DrawIconElementLocalSpace(elem, graph_info);
    } else {
      throw "Unsupported DrawSpace";
    }
  }

  /**************************************************************************
   * PRIVATE FUNCTIONS
   **************************************************************************/

  private _SetupWebGL() {
    let p = <any>{};
    p.local = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader(VertexShaders.DIRECT),
      AllShaders.GetFragmentShader(FragmentShaders.SIMPLE)]);
    p.pixel = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader(VertexShaders.PIXEL),
      AllShaders.GetFragmentShader(FragmentShaders.SIMPLE)]);
    p.graph = twgl.createProgramInfo(this.GL, [
      AllShaders.GetVertexShader(VertexShaders.GRAPH),
      AllShaders.GetFragmentShader(FragmentShaders.SIMPLE)]);

    p.local_ps = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader(VertexShaders.DIRECT),
      AllShaders.GetFragmentShader(FragmentShaders.POINT_SPRITE)]);
    p.pixel_ps = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader(VertexShaders.PIXEL),
      AllShaders.GetFragmentShader(FragmentShaders.POINT_SPRITE)]);
    p.graph_ps = twgl.createProgramInfo(this._gl, [
      AllShaders.GetVertexShader(VertexShaders.GRAPH),
      AllShaders.GetFragmentShader(FragmentShaders.POINT_SPRITE)]);
    this._program_infos = p;

    // We create the overlay buffers
    let arrays = {
      a_position_coord: {
        numComponents: 2,
        data: Array<number>(100),
      }
    };

    this.buffer_info = twgl.createBufferInfoFromArrays(this.GL, arrays);
  }

  private _SetupTextures() {
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

  /******************************************************
   * PRIVATE RENDERING FUNCTIONS
   ******************************************************/

  /* DRAW GRAPH */

  private _DrawElementLocalSpace(elem: RendererElem,
                                 graph_info: GraphInfoInterface) : void {
    let program_info = this.ProgramInfos.graph;
    this._gl.useProgram(program_info.program);
    twgl.setBuffersAndAttributes(this.GL, program_info, elem.buffer_info);
    let uniforms = {
      u_offset: this.Offset.AsArray(),
      u_scale: this.Scale.AsArray(),
      u_color: graph_info.Color.AsArray(),
      u_graph_offset: graph_info.Offset.AsArray(),
    };

    twgl.setUniforms(program_info, uniforms);
    if (elem.gl_primitive == this.GL.LINES) {
      this.GL.drawArrays(this.GL.LINES, 0, elem.buffer_info.numElements);
    } else {
      twgl.drawBufferInfo(this._gl, elem.buffer_info, elem.gl_primitive);
    }
  }

  private _DrawIconElementLocalSpace(elem: RendererElem,
                                     graph_info: GraphInfoInterface) : void {
    let program_info = this.ProgramInfos.graph_ps;
    this.GL.useProgram(program_info.program);
    twgl.setBuffersAndAttributes(this.GL, program_info, elem.buffer_info);
    let uniforms = {
      u_offset: this.Offset.AsArray(),
      u_scale: this.Scale.AsArray(),
      u_color: graph_info.Color.AsArray(),
      u_graph_offset: graph_info.Offset.AsArray(),
      u_point_size: 5,
      u_sampler: 0
    };
    twgl.setUniforms(program_info, uniforms);
    this.GL.activeTexture(this.GL.TEXTURE0);
    this.GL.bindTexture(this.GL.TEXTURE_2D, this.cross_texture);
    // twgl.drawBufferInfo(this.GL, elem.buffer_info, elem.gl_primitive);
    this.GL.drawArrays(this.GL.POINTS, 0, elem.buffer_info.numElements );
  }

  /* DRAW LINE */

  private _DrawLinePixelSpace(p1: Vec2, p2: Vec2, color: Color) : void {
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

  private _DrawLineLocalSpace(p1: Vec2, p2: Vec2, color: Color) : void {
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

  private _DrawIconPixelSpace(point: Vec2, color: Color) : void {
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

  private _DrawIconLocalSpace(point: Vec2, color: Color) : void {
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
      u_point_size: 10,
      u_sampler: 0
    };
    twgl.setUniforms(this.ProgramInfos.local_ps, uniforms);
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.cross_texture);
    this._gl.drawArrays(this._gl.POINTS, 0, 1);
  }


  /* DRAW TRIANGLE_STRIP */

  private _DrawTriangleStripPixelSpace(points: Vec2[], color: Color) {
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

  /**************************************************************************
   * PRIVATE DATA
   **************************************************************************/

  private _gl: WebGL2RenderingContext;

  private _state: {
    bounds: Bounds,
    max_bounds: Bounds,
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
}

export {DrawSpace}
export {InternalRenderer}
export {RendererElemId}
export {InternalRendererInterface}
export default InternalRendererInterface;
