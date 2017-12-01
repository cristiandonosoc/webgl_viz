
import {Color, AllColors} from "./colors"
import Interaction from "./interaction";
import LabelManager from "./label_manager";
import Renderer from "./renderer";
import {Bounds, Vec2} from "./vectors";
import AxisManager from "./axis_manager";

import {DrawSpace, RendererInterface} from "./renderer_interface";
import InteractionInterface from "./interaction_interface";
import {ZoomType, LabelManagerInterface} from "./label_manager_interface";
import GraphManagerInterface from "./graph_manager_interface";

let g_inf = 9007199254740991;

class GraphManager implements GraphManagerInterface {
  /* WebGL programs */
  private _interaction: Interaction;   /* Manages interaction with browser (mostly mouse) */
  private _label_manager: LabelManager;
  private _renderer: Renderer;
  private _axis_manager: AxisManager;

  // Internal state of the renderer
  private _state: {
    graph_info: {
      bounds: Bounds,
      background_color: Color,
      drag_color: Color,
      line_color: Color,
      line_width: number
    },
    graph_loaded: boolean;

    custom_points?: Array<Vec2>;
    closest_point?: Vec2;
  };

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

  get Valid() : boolean {
    return this._state.graph_loaded;

  }

  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(canvas: HTMLCanvasElement) {
    this._renderer = new Renderer(canvas);
    this._interaction = new Interaction(this);
    this._label_manager = new LabelManager(this);
    this._axis_manager = new AxisManager(this);

    this.CreateDefaults();
    this._state.graph_loaded = false;
  }

  HandleDapFile = (content: string) => {
    // We split into lines
    let lines = content.split("\n");
    console.info("Read %d lines", lines.length);

    // We go over the lines
    let base = new Array<number>();
    let points = new Array<number>();
    // points.push(0);
    // points.push(0);
    // points.push(0.5);
    // points.push(0.5);

    let limit = 40;
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      if (line.lastIndexOf("TSBASE", 0) === 0) {
        let tokens = line.split(" ");
        for (var j = 1; j < tokens.length; j += 1) {
          base.push(parseFloat(tokens[j]));
        }
        console.info("Processed: %s", line);
        continue;
      }
      if (line.lastIndexOf("OFFST", 0) === 0) {
        console.info("Skipping: %s", line);
        continue;
      }

      let tokens = line.split(" ");
      // We look for the first number
      let first = parseFloat(tokens[3]);
      let last = parseFloat(tokens[tokens.length - 1]);

      points.push(first);
      points.push(last - first);

      if (i < limit) {
        console.info("%f -> %f", first, last - first);
      }
    }

    this.AddGraph(points);
  }

  AddGraph(points: number[]) : void {
    // We pass the points straight down
    this._renderer.AddGraph(points);

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

    // We set the bounds
    this._state.graph_info.bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);

    // We sort
    this._state.custom_points = arr.sort((p1: Vec2, p2: Vec2) => {
      return p1.x - p2.x;
    });

    this._state.graph_loaded = true;
  }

  // Applies the graph max bounds
  ApplyMaxBounds() : void {
    this.Renderer.Bounds = this._state.graph_info.bounds.Copy();
  }

  FrameLoop() : void {
    this.Update();
    this.Draw();
  }

  /*******************************************
   * DRAWING
   *******************************************/

  private Update() : void {
    // Resize
    this.Renderer.ResizeCanvas();
    this.LabelManager.Update();
    if (this.Valid) {
      this._axis_manager.Update();
    }
  }

  private Draw() : void {
    if (!this.Valid) {
      return;
    }

    // Clear Canvas
    this.Renderer.Clear(this._state.graph_info.background_color);
    this.LabelManager.Draw();

    if (this.Interaction.ZoomDragging) {
      let zoom = this._label_manager.Zoom;
      if (zoom == ZoomType.VERTICAL) {
        let start = this.Interaction.DownMousePos.canvas.x;
        let end = this.Interaction.CurrentMousePos.canvas.x;
        this.Renderer.DrawVerticalRange(start, end, DrawSpace.PIXEL, this._state.graph_info.drag_color);
      } else if (zoom == ZoomType.HORIZONTAL) {
        let start = this.Interaction.DownMousePos.canvas.y;
        let end = this.Interaction.CurrentMousePos.canvas.y;
        this.Renderer.DrawHorizontalRange(start, end, DrawSpace.PIXEL, this._state.graph_info.drag_color);
      } else if (zoom == ZoomType.BOX) {
        let p1 = this.Interaction.DownMousePos.canvas;
        let p2 = this.Interaction.CurrentMousePos.canvas;
        this.Renderer.DrawBox(p1, p2, DrawSpace.PIXEL, this._state.graph_info.drag_color);
      }
    }

    // Draw x/y Axis
    this._axis_manager.Draw();

    this.Renderer.DrawHorizontalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));
    this.Renderer.DrawVerticalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));

    this.Renderer.DrawGraph(DrawSpace.LOCAL, this._state.graph_info.line_color);

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
    this._state.closest_point = this.SearchForClosestPoint(pos);
  }

  /********************************************************************
   * PRIVATE IMPLEMENTATION
   ********************************************************************/

  private CreateDefaults() {
    let graph_info = {
      bounds: Bounds.Zero,
      background_color: AllColors.Get("black"),
      drag_color: AllColors.Get("lightblue"),
      line_color: AllColors.Get("white"),
      line_width: 1
    };

    this._state = {
      graph_info: graph_info,
      graph_loaded: false,
    };
  }

  private SearchForClosestPoint(pos: Vec2) : Vec2 {
    var len = this._state.custom_points.length;
    if (pos.x <= this._state.custom_points[0].x) {
      return this._state.custom_points[0];
    }
    if (pos.x >= this._state.custom_points[len-1].x) {
      return this._state.custom_points[len-1];
    }

    // We do binary search
    var min_index = 0;
    var max_index = len - 1;

    while (min_index < max_index) {
      var half = Math.floor((min_index + max_index) / 2);
      var val = this._state.custom_points[half].x;

      if (val > pos.x) {
        if (max_index == half) { break; }
        max_index = half;
      } else {
        if (min_index == half) { break; }
        min_index = half;
      }
    }

    // We now have two points
    var min_point = this._state.custom_points[min_index];
    var max_point = this._state.custom_points[max_index];

    // We want to return the closest (x-wise)
    var dist1 = Math.abs(min_point.x - pos.x);
    var dist2 = Math.abs(max_point.x - pos.x);

    if (dist1 < dist2) {
      return min_point;
    } else {
      return max_point;
    }
  }
}

export default GraphManager;
