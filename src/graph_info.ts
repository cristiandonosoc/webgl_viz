import {Bounds, Vec2} from "./vectors";
import {RendererElemId} from "./internal_renderer";
import {AllColors, Color} from "./colors";
import {VertexShaders, FragmentShaders} from "./shaders";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface GraphInfoInterface {
  readonly Name: string;
  RawPoints: Array<number>;
  Points: Array<Vec2>;
  Bounds: Bounds;
  // Use InternalRenderer.GL to get the primitive enum */
  // ie: InternalRenderer.GL.LINES
  readonly GLPrimitive: any;
  readonly VertexShader: VertexShaders;
  readonly FragmentShader: FragmentShaders;

  // Modifyable
  ElemId: RendererElemId;
  Color: Color;
  Offset: Vec2;
  GLProgram: any;   // Holds a reference to the internal GL program
}

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class GraphInfo implements GraphInfoInterface{
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(name: string, color?: Color) {
    this._name = name;

    this._raw_points = Array<number>();
    this._points = Array<Vec2>();
    this._bounds = Bounds.FromPoints(-1, 1, -1, 1);
    this._offset = Vec2.Zero;

    if (color) {
      this._color = color;
    } else {
      this._color = AllColors.Get("yellow");
    }
  }

  /*******************************************************
   * PUBLIC INTERFACE
   *******************************************************/

  get Name() : string { return this._name; }
  get ElemId() : RendererElemId { return this._elem_id; }
  get RawPoints() : Array<number> { return this._raw_points; }
  get Points() : Array<Vec2> { return this._points; }
  get Color() : Color { return this._color; }
  get Bounds() : Bounds { return this._bounds; }
  get GLPrimitive() : any { return this._gl_primitive; }
  get Offset() : Vec2 { return this._offset; }
  get VertexShader() : VertexShaders { return this._vertex_shader; }
  get FragmentShader() : FragmentShaders { return this._fragment_shader; }
  get GLProgram() { return this._gl_program; }

  set ElemId(elem_id: RendererElemId) { this._elem_id = elem_id; }
  set Color(color: Color) { this._color = color; }
  set RawPoints(points: Array<number>) { this._raw_points = points; }
  set Points(points: Array<Vec2>) { this._points = points; }
  set Bounds(bounds: Bounds) { this._bounds = bounds; }
  set GLPrimitive(p) { this._gl_primitive = p; }
  set Offset(offset: Vec2) { this._offset = offset; }
  set VertexShader(vs: VertexShaders) { this._vertex_shader = vs; }
  set FragmentShaders(fs: FragmentShaders) { this._fragment_shader = fs; }
  set GLProgram(program) { this._gl_program = program; }

  /*******************************************************
   * PRIVATE METHODS
   *******************************************************/


  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _name: string;
  private _elem_id: RendererElemId;
  private _raw_points: Array<number>;
  private _points: Array<Vec2>;
  private _color: Color;
  private _bounds: Bounds;
  private _gl_primitive: any;
  private _offset: Vec2;

  private _vertex_shader: VertexShaders;
  private _fragment_shader: FragmentShaders;

  private _gl_program: any;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {GraphInfo};
export {GraphInfoInterface};
export default GraphInfoInterface;

