
import {Color, AllColors} from "./colors"
import {Interaction, InteractionInterface} from "./interaction";
import {Bounds, Vec2} from "./vectors";

import {DrawSpace, RendererElemId, Renderer, RendererInterface} from "./renderer";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {ZoomType, UIManager, UIManagerInterface} from "./ui_manager";

import {GetCanvasChildByClass} from "./helpers";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

/**
 * GraphInfo
 * ---------
 *
 * Represents the info of a graph
 **/
class GraphInfo {
  name = "";
  elem_id: RendererElemId;      // The points registered with the renderer
  points: Array<Vec2>;          // The points loaded and sorted (by X-axis)
  color: Color;                 // The color on which to render the graph
  bounds: Bounds;               // The max X and Y bounds of this graph
}

interface GraphManagerInterface {
  /* COMPONENTS */
  Interaction: InteractionInterface;
  Renderer: RendererInterface;
  LabelManager: LabelManagerInterface;
  UIManager: UIManagerInterface;

  /* STATE */
  Valid: boolean;
  readonly Graphs: Array<GraphInfo>;

  /* ACTIONS */
  FrameLoop() : void;   /* Update + Draw */
  // Update() : void;
  // Draw() : void;

  SetClosestPoint(point: Vec2) : void;
  // Resets the zoom to the containing bounds
  ApplyMaxBounds() : void;
}


/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

let g_inf = 9007199254740991;


class CanvasHolder {
  renderer: Renderer;
  interaction: Interaction;
  label_manager: LabelManager;
  axis_manager: AxisManager;
}

class GraphManager implements GraphManagerInterface {
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(graph_canvas_container: HTMLElement,
              timing_canvas_container: HTMLElement) {
    this.SetupElements(graph_canvas_container);
    this.SetupState();
  }

  private SetupElements(container: HTMLElement) {
    let canvas = GetCanvasChildByClass(container, "central-canvas");
    let labels = GetCanvasChildByClass(container, "canvas-labels");
    let x_axis = GetCanvasChildByClass(container, "x-axis");
    let y_axis = GetCanvasChildByClass(container, "y-axis");

    this._renderer = new Renderer(canvas);
    this._interaction = new Interaction(this);
    this._label_manager = new LabelManager(this, this._renderer, labels);
    this._axis_manager = new AxisManager(container, this._renderer);

    this._ui_manager = new UIManager(this._renderer, this._interaction);
  }

  private SetupState() {
    let graph_colors = new Array<Color>();
    graph_colors.push(AllColors.Get("deeppink"));
    graph_colors.push(AllColors.Get("cyan"));
    graph_colors.push(AllColors.Get("midnightblue"));
    graph_colors.push(AllColors.Get("white"));
    graph_colors.push(AllColors.Get("orange"));

    this._state = {
      colors: {
        background_color: AllColors.Get("black"),
        drag_color: AllColors.Get("lightblue"),
        graph_colors: graph_colors,
      },
      bounds: Bounds.FromPoints(-1, 1, -1, 1),
      graphs: new Array<GraphInfo>(),
    };
  }

  /*******************************************************
   * GETTERS / SETTERS
   *******************************************************/

  get Renderer() : RendererInterface {
    return this._renderer;
  }

  get Interaction() : InteractionInterface {
    return this._interaction;
  }

  get LabelManager() : LabelManagerInterface {
    return this._label_manager;
  }

  get UIManager() : UIManagerInterface {
    return this._ui_manager;
  }

  get AxisManager() : AxisManagerInterface {
    return this._axis_manager;
  }

  get Graphs() : Array<GraphInfo> {
    return this._state.graphs;
  }

  get Colors() : any {
    return this._state.colors;
  }

  get Valid() : boolean {
    return this.Graphs.length > 0;
  }

  get Bounds() :  Bounds {
    return this._state.bounds;
  }

  HandleDapFile = (content: string) => {
    // We split into lines
    let lines = content.split("\n");
    console.info("Read %d lines", lines.length);

    // We count how many graphs
    let first_line = lines[0];
    if (first_line.lastIndexOf("TSBASE", 0) != 0) {
      throw "Invalid file";
    }

    // We get the base times for each pcap
    let first_split = first_line.split(" ");
    let base = new Array<number>();
    for (var j = 1; j < first_split.length; j += 1) {
      base.push(parseFloat(first_split[j]));
    }


    // We go over the lines
    let graphs = new Array<Array<number>>(base.length);
    for (var i = 0; i < graphs.length; i += 1) {
      graphs[i] = new Array<number>();
    }

    let limit = 40;
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      if (line.lastIndexOf("TSBASE", 0) === 0) {
        console.info("Skipping: %s", line);
        continue;
      }
      if (line.lastIndexOf("OFFST", 0) === 0) {
        console.info("Skipping: %s", line);
        continue;
      }

      let split = line.split(" ");
      let tokens = split.slice(3, split.length);
      if (tokens.length != base.length) {
        console.error("Wrongly formatted line");
        continue;
      }

      // We add the graphs
      let parsed = tokens.map(function(i: string) : number {
        return parseFloat(i);
      });
      for (var j = 0; j < tokens.length - 1; j += 1) {
        graphs[j].push(parsed[j]);
        graphs[j].push(parsed[j + 1] - parsed[j]);
      }
      graphs[graphs.length - 1].push(parsed[0]);
      graphs[graphs.length - 1].push(parsed[parsed.length - 1] - parsed[0]);
    }

    for (var i = 0; i < graphs.length; i += 1) {
      let name = `Graph ${i}`;
      let graph_points = graphs[i];
      this.AddGraph(name, graph_points);
    }
  }

  AddGraph(name: string, points: number[]) : void {
    // We pass the points straight down
    let graph_id = this._renderer.AddGraph(points);

    // We post-process the points
    let min = new Vec2(+g_inf, +g_inf);
    let max = new Vec2(-g_inf, -g_inf);
    let arr = new Array<Vec2>(points.length / 2);
    for (let i = 0; i < arr.length; i += 1) {
      let point_index = i * 2;
      let p = new Vec2(points[point_index], points[point_index + 1]);
      arr[i] = p;

      // We track the bounds
      if (p.x < min.x) { min.x = p.x; }
      if (p.x > max.x) { max.x = p.x; }
      if (p.y < min.y) { min.y = p.y; }
      if (p.y > max.y) { max.y = p.y; }
    }

    let graph_info = new GraphInfo();
    graph_info.name = name;
    graph_info.elem_id = graph_id;
    graph_info.points = arr.sort((p1: Vec2, p2: Vec2) => {
      return p1.x - p2.x;
    });

    let color_index = this.Graphs.length % this.Colors.graph_colors.length;
    graph_info.color = this.Colors.graph_colors[color_index];
    graph_info.bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);

    // We add the graph
    this.Graphs.push(graph_info);

    // We recalculate the graph bounds
    this._RecalculateBounds();
    this.ApplyMaxBounds();
  }

  // Applies the graph max bounds
  ApplyMaxBounds() : void {
    // We don't want a reference here
    this.Renderer.Bounds = this.Bounds.Copy();
  }

  FrameLoop() : void {
    this.Update();
    // TODO(donosoc): Do it so that we only draw when needed, making components
    //                "dirty" the view.
    //                Right now we are always re-rendering (~60 FPS)
    this.Draw();
  }

  /*******************************************
   * DRAWING
   *******************************************/

  private Update() : void {
    // Resize
    this.Renderer.ResizeCanvas();
    this.LabelManager.Update();
    this.UIManager.Update();

    if (!this.Valid) {
      return;
    }

    this.AxisManager.Update();
  }

  private Draw() : void {
    if (!this.Valid) {
      return;
    }

    // Clear Canvas
    this.Renderer.Clear(this.Colors.background_color);
    this.LabelManager.Draw();

    if (this.Interaction.ZoomDragging) {
      let zoom = this._ui_manager.Zoom;
      if (zoom == ZoomType.VERTICAL) {
        let start = this.Interaction.DownMousePos.canvas.x;
        let end = this.Interaction.CurrentMousePos.canvas.x;
        this.Renderer.DrawVerticalRange(start, end, DrawSpace.PIXEL, this.Colors.drag_color);
      } else if (zoom == ZoomType.HORIZONTAL) {
        let start = this.Interaction.DownMousePos.canvas.y;
        let end = this.Interaction.CurrentMousePos.canvas.y;
        this.Renderer.DrawHorizontalRange(start, end, DrawSpace.PIXEL, this.Colors.drag_color);
      } else if (zoom == ZoomType.BOX) {
        let p1 = this.Interaction.DownMousePos.canvas;
        let p2 = this.Interaction.CurrentMousePos.canvas;
        this.Renderer.DrawBox(p1, p2, DrawSpace.PIXEL, this.Colors.drag_color);
      }
    }

    // Draw x/y Axis
    this._axis_manager.Draw();

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

    if (this._state.closest_point) {
      this.Renderer.DrawIcon(this._state.closest_point, DrawSpace.LOCAL, AllColors.Get("purple"));
    }

  }

  SetClosestPoint(pos: Vec2) : void {
    if (!this.Valid) {
      return;
    }
    this._state.closest_point = this._SearchForClosestPoint(pos);
  }

  /********************************************************************
   * PRIVATE METHODS
   ********************************************************************/

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

  private _RecalculateBounds() : void {
    let bounds = this._GetMinBounds();
    for (let graph of this.Graphs) {
      // We compare the bounds
      if (graph.bounds.x.x < bounds.x.x) { bounds.x.x = graph.bounds.x.x; }
      if (graph.bounds.x.y > bounds.x.y) { bounds.x.y = graph.bounds.x.y; }
      if (graph.bounds.y.x < bounds.y.x) { bounds.y.x = graph.bounds.y.x; }
      if (graph.bounds.y.y > bounds.y.y) { bounds.y.y = graph.bounds.y.y; }
    }
    this._state.bounds = bounds;
  }

  // Get a bounds that will be trivially changed in max comparisons
  private _GetMinBounds() : Bounds {
    return Bounds.FromPoints(+g_inf, -g_inf, +g_inf, -g_inf);
  }


  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _renderer: Renderer;            // Manages WebGL rendering
  private _interaction: Interaction;      // Manages interaction with browser (mostly mouse)
  private _label_manager: LabelManager;   // Manages interaction with DOM
  private _axis_manager: AxisManager;     // Manages axis and scales

  private _ui_manager: UIManager;

  // Internal state of the renderer
  private _state: {
    colors: {
      background_color: Color,
      drag_color: Color,
      graph_colors: Array<Color>,
    },
    bounds: Bounds,                       // The containing bounds of all the graphs
    graphs: Array<GraphInfo>,             // The graph elements added
    closest_point?: Vec2,                 // The closest point to the mouse (x-wise)
  };


  private _timing_renderer: Renderer;

  private _canvas_holders: Array<CanvasHolder>;
}

export {GraphInfo};
export {GraphManager}
export {GraphManagerInterface};
export default GraphManagerInterface;
