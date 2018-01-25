import {Bounds, Vec2} from "./vectors";
import {DrawSpace, RendererElemId, Renderer, RendererInterface} from "./renderer";
import {Interaction, InteractionInterface} from "./interaction";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {CreateVecArrayFromPoints} from "./helpers";

import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {AllColors, Color} from "./colors";


/**************************************************************************
 * INTERFACE
 **************************************************************************/

class GraphInfo {
  name = "";
  elem_id: RendererElemId;      // The points registered with the renderer
  points: Array<Vec2>;          // The points loaded and sorted (by X-axis)
  color: Color;                 // The color on which to render the graph
  bounds: Bounds;               // The max X and Y bounds of this graph
}

interface VisualizerInterface {

  AddGraph(name: string, points: number[]) : void;
  readonly Graphs: Array<GraphInfo>;

  Update() : void;
  Draw() : void;

  SetClosestPoint(point: Vec2) : void;
  ApplyMaxBounds() : void;
}

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class Visualizer implements VisualizerInterface {
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/
  constructor(container: HTMLElement) {
    let ctx = this;
    function callback(i: InteractionInterface) : void {
      ctx._InteractionCallback(i);
    }

    this._Setup(container, callback);
  }

  private _Setup(container: HTMLElement, callback: (i: InteractionInterface) => void) {
    this._graphs = new Array<GraphInfo>();
    this._renderer = new Renderer(container);
    this._interaction = new Interaction(this._renderer, callback);
    this._label_manager = new LabelManager(container, this, this._renderer);
    this._axis_manager = new AxisManager(container, this._renderer);

  }

  private _InteractionCallback(i: InteractionInterface) {
    this.SetClosestPoint(i.CurrentMousePos.local);
  }

  /*******************************************************
   * PUBLIC INTERFACE DATA
   *******************************************************/

  get Graphs() : Array<GraphInfo> {
    return this._graphs;
  }

  AddGraph(name: string, points: number[]) : void {
    // TODO(donosoc): The renderer should receive a graph_info
    //                datastructure, not plain points
    let graph_id = this.Renderer.AddGraph(points);

    let graph_info = new GraphInfo();
    graph_info.name = name;
    graph_info.elem_id = graph_id;
    let arr = CreateVecArrayFromPoints(points);
    graph_info.points = arr.sort((p1: Vec2, p2: Vec2) => {
      return p1.x - p2.x;
    });
    graph_info.color = AllColors.Get("red");
    graph_info.bounds = Bounds.FromPoints(-1, 1, -1, 1);

    this._graphs.push(graph_info);
  }

  SetClosestPoint(point: Vec2) {
    throw new Error("NOT IMPLEMENTED");
  }

  ApplyMaxBounds() : void {
    throw new Error("NOT IMPLEMENTED");
  }

  Update() : void {
    this.Renderer.ResizeCanvas();
    this.LabelManager.Update();
    this.AxisManager.Update();

  }

  Draw() : void {

    let background_color = AllColors.Get("black");
    let drag_color = AllColors.Get("lightblue");


    this.Renderer.Clear(AllColors.Get("black"));
    this.LabelManager.Draw();

    if (this.Interaction.ZoomDragging) {
      let zoom = UIManagerSingleton.Zoom;
      if (zoom == ZoomType.VERTICAL) {
        let start = this.Interaction.DownMousePos.canvas.x;
        let end = this.Interaction.CurrentMousePos.canvas.x;
        this.Renderer.DrawVerticalRange(start, end, DrawSpace.PIXEL, drag_color);
      } else if (zoom == ZoomType.HORIZONTAL) {
        let start = this.Interaction.DownMousePos.canvas.y;
        let end = this.Interaction.CurrentMousePos.canvas.y;
        this.Renderer.DrawHorizontalRange(start, end, DrawSpace.PIXEL, drag_color);
      } else if (zoom == ZoomType.BOX) {
        let p1 = this.Interaction.DownMousePos.canvas;
        let p2 = this.Interaction.CurrentMousePos.canvas;
        this.Renderer.DrawBox(p1, p2, DrawSpace.PIXEL, drag_color);
      }
    }

    // Draw x/y Axis
    this.AxisManager.Draw();

    this.Renderer.DrawHorizontalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));
    this.Renderer.DrawVerticalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));

    for (let graph_info of this.Graphs) {
      this.Renderer.DrawElement(graph_info.elem_id, DrawSpace.LOCAL, graph_info.color);
    }

    // Draw mouse vertical line
    // this.DrawLinePixelSpace([10, 10], [200, 200]);
    let canvas_pos = this.Interaction.CurrentMousePos.canvas;
    this.Renderer.DrawVerticalLine(canvas_pos.x, DrawSpace.PIXEL,
                                   AllColors.Get("orange"));

    if (this._closest_point) {
      this.Renderer.DrawIcon(this._closest_point, DrawSpace.LOCAL, AllColors.Get("purple"));
    }


  }

  private _SearchForClosestPoint(pos: Vec2) : Vec2 {
    // No points to search
    if (this.Graphs.length < 1) {
      return;
    }

    // For now we search on the last graph
    let last_graph = this.Graphs[this.Graphs.length - 1];
    let points = last_graph.points;

    var len = points.length;
    if (pos.x <= points[0].x) {
      return points[0];
    }
    if (pos.x >= points[len-1].x) {
      return points[len-1];
    }

    // We do binary search
    var min_index = 0;
    var max_index = len - 1;

    while (min_index < max_index) {
      var half = Math.floor((min_index + max_index) / 2);
      var val = points[half].x;

      if (val > pos.x) {
        if (max_index == half) { break; }
        max_index = half;
      } else {
        if (min_index == half) { break; }
        min_index = half;
      }
    }

    // We now have two points
    var min_point = points[min_index];
    var max_point = points[max_index];

    // We want to return the closest (x-wise)
    var dist1 = Math.abs(min_point.x - pos.x);
    var dist2 = Math.abs(max_point.x - pos.x);

    if (dist1 < dist2) {
      return min_point;
    } else {
      return max_point;
    }
  }




  /*******************************************************
   * PRIVATE GETTERS
   *******************************************************/

  private get Renderer() : RendererInterface {
    return this._renderer;
  }

  private get Interaction() : InteractionInterface {
    return this._interaction;
  }

  private get LabelManager() : LabelManagerInterface {
    return this._label_manager;
  }

  private get AxisManager() : AxisManagerInterface {
    return this._axis_manager;
  }

  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  _closest_point: Vec2;


  _renderer: Renderer;
  _interaction: Interaction;
  _label_manager: LabelManager;
  _axis_manager: AxisManager;

  _graphs: Array<GraphInfo>;
}


export {GraphInfo}
export {Visualizer};
export {VisualizerInterface};
export default VisualizerInterface;

