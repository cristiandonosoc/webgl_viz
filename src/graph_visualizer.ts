import {INFINITY} from "./helpers";
import {Bounds, Vec2} from "./vectors";
import {DrawSpace, RendererElemId, Renderer, RendererInterface} from "./renderer";
import {Interaction, InteractionInterface} from "./interaction";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {AllColors, Color} from "./colors";

import {GraphInfo, GraphInfoInterface} from "./graph_info";

import VisualizerInterface from "./visualizer_interface";

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class GraphVisualizer implements VisualizerInterface {
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
    this._graphs = new Array<GraphInfoInterface>();
    this._renderer = new Renderer(container);
    this._interaction = new Interaction(this._renderer, callback);
    this._label_manager = new LabelManager(container, this, this._renderer);
    this._axis_manager = new AxisManager(container, this._renderer);
  }

  private _InteractionCallback(i: InteractionInterface) {
    return;
    // this.SetClosestPoint(i.CurrentMousePos.local);
  }

  /*******************************************************
   * PUBLIC INTERFACE DATA
   *******************************************************/

  get Graphs() : Array<GraphInfoInterface> {
    return this._graphs;
  }

  Start() : void {
    this.Interaction.Start();
  }

  AddGraph(name: string, points: number[]) : void {
    console.log("VISUALIZER ADDING: ",
                "NAME: ", name);

    // TODO(donosoc): Give a correct color to the graph
    let graph_info = new GraphInfo(name);
    this._ProcessPoints(graph_info, points);
    this.Renderer.AddGraph(graph_info);
    this._graphs.push(graph_info);
  }

  private _ProcessPoints(graph_info: GraphInfoInterface, points: number[]) : void {
    graph_info.RawPoints = points;
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
    graph_info.Points = arr;
    graph_info.Bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);
  }

  SetClosestPoint(point: Vec2) {
    throw new Error("NOT IMPLEMENTED");
  }

  ApplyMaxBounds() : void {
    this.Renderer.ApplyMaxBounds();
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
      this.Renderer.DrawElement(graph_info.ElemId, DrawSpace.LOCAL, graph_info.Color);
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
    let points = last_graph.Points;

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

  _graphs: Array<GraphInfoInterface>;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {GraphVisualizer};
export {VisualizerInterface};
export default GraphVisualizer;
