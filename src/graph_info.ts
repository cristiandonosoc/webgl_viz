import {INFINITY} from "./helpers";
import {Bounds, Vec2} from "./vectors";
import {RendererElemId} from "./renderer";
import {AllColors, Color} from "./colors";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface GraphInfoInterface {
  readonly Name: string;
  readonly RawPoints: Array<number>;
  readonly Points: Array<Vec2>;
  readonly Bounds: Bounds;

  ElemId: RendererElemId;
  Color: Color;
}

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class GraphInfo {
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(name: string, graph_points: number[], color?: Color) {
    this._name = name;

    // Sets _points and _bounds
    this._ProcessPoints(graph_points);

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

  set ElemId(elem_id: RendererElemId) {
    this._elem_id = elem_id;
  }
  set Color(color: Color) {
    this._color = color;
  }

  /*******************************************************
   * PRIVATE METHODS
   *******************************************************/

  private _ProcessPoints(points: number[]) : void {
    this._raw_points = points;
    let arr = new Array<Vec2>(points.length / 2);
    let min = new Vec2(+INFINITY, +INFINITY);
    let max = new Vec2(-INFINITY, -INFINITY);
    for (let i = 0; i < arr.length; i += 1) {
      let point_index = i * 2;
      let p = new Vec2(points[point_index], points[point_index + 1]);
      arr[i] = p;

      // We go by tracking the bounds
      if (p.x < min.x) { min.x = p.x; }
      if (p.x > max.x) { max.x = p.x; }
      if (p.y < min.y) { min.y = p.y; }
      if (p.y > max.y) { max.y = p.y; }
    }

    // We set the points
    this._points = arr;
    this._bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);
  }



  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _name: string;
  private _elem_id: RendererElemId;
  private _raw_points: Array<number>;
  private _points: Array<Vec2>;
  private _color: Color;
  private _bounds: Bounds;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {GraphInfo};
export {GraphInfoInterface};
export default GraphInfoInterface;

