import {Bounds, Vec2} from "./vectors";
import {RendererElemId} from "./internal_renderer";
import {AllColors, Color} from "./colors";

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

  ElemId: RendererElemId;
  Color: Color;
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

  set ElemId(elem_id: RendererElemId) {
    this._elem_id = elem_id;
  }
  set Color(color: Color) {
    this._color = color;
  }

  set RawPoints(points: Array<number>) {
    this._raw_points = points;
  }

  set Points(points: Array<Vec2>) {
    this._points = points;
  }

  set Bounds(bounds: Bounds) {
    this._bounds = bounds;
  }

  set GLPrimitive(p) {
    this._gl_primitive = p;
  }

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
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {GraphInfo};
export {GraphInfoInterface};
export default GraphInfoInterface;

