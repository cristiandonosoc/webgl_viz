///<reference path="resources/webgl2.d.ts" />

import {Color, AllColors} from "./colors"
import Interaction from "./interaction";
import InteractionInterface from "./interaction_interface";
import LabelManager from "./label_manager";
import Renderer from "./renderer";
import {DrawSpace, RendererInterface} from "./renderer_interface";
import {Bounds, Vec2} from "./vectors";
import GraphManagerInterface from "./graph_manager";

let g_inf = 9007199254740991;

class GraphManager implements GraphManagerInterface {
  /* WebGL programs */
  interaction: InteractionInterface;   /* Manages interaction with browser (mostly mouse) */
  label_manager: LabelManager;
  renderer: RendererInterface;

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

  get Valid() : boolean {
    return this._state.graph_loaded;

  }

  constructor(canvas: HTMLCanvasElement) {
    this.CreateDefaults();
    this.renderer = new Renderer(canvas);
    this.interaction = new Interaction(this);
    this.label_manager = new LabelManager(this);

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
    this.renderer.AddGraph(points);

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
    this.renderer.bounds = this._state.graph_info.bounds.Copy();
  }

  /*******************************************
   * DRAWING
   *******************************************/

  Draw() : void {
    // Resize
    this.renderer.ResizeCanvas();

    // Clear Canvas
    this.renderer.Clear(this._state.graph_info.background_color);

    this.label_manager.Update();

    if (!this.Valid) {
      return;
    }

    if (this.interaction.ZoomDragging) {
      if (this.label_manager.VerticalZoom) {
        let start = this.interaction.DownMousePos.canvas.x;
        let end = this.interaction.CurrentMousePos.canvas.x;
        this.renderer.DrawVerticalRange(start, end, DrawSpace.PIXEL, this._state.graph_info.drag_color);
      } else if (this.label_manager.HorizontalZoom) {
        let start = this.interaction.DownMousePos.canvas.y;
        let end = this.interaction.CurrentMousePos.canvas.y;
        this.renderer.DrawHorizontalRange(start, end, DrawSpace.PIXEL, this._state.graph_info.drag_color);
      } else if (this.label_manager.BoxZoom) {
        let p1 = this.interaction.DownMousePos.canvas;
        let p2 = this.interaction.CurrentMousePos.canvas;
        this.renderer.DrawBox(p1, p2, DrawSpace.PIXEL, this._state.graph_info.drag_color);
      }
    }

    // Draw x/y Axis
    this.renderer.DrawHorizontalLine(0, DrawSpace.LOCAL, AllColors.Get("green"));
    this.renderer.DrawVerticalLine(0, DrawSpace.LOCAL, AllColors.Get("green"));

    this.renderer.DrawGraph(DrawSpace.LOCAL, this._state.graph_info.line_color);

    // Draw mouse vertical line
    // this.DrawLinePixelSpace([10, 10], [200, 200]);
    let canvas_pos = this.interaction.CurrentMousePos.canvas;
    this.renderer.DrawVerticalLine(canvas_pos.x, DrawSpace.PIXEL,
                                   AllColors.Get("orange"));

    if (this._state.closest_point) {
      this.renderer.DrawIcon(this._state.closest_point, DrawSpace.LOCAL, AllColors.Get("purple"));
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
