///<reference path="resources/webgl2.d.ts" />

import {Color, AllColors} from "./colors"
import Interaction from "./interaction";
import LabelManager from "./label_manager";
import {DrawSpace, Renderer} from "./renderer";
import {Bounds, Vec2} from "./vectors";

let g_inf = 9007199254740991;

class GraphManager {
  canvas: HTMLCanvasElement;

  /* WebGL programs */
  graph_buffer_info: any;     /* Holds a graph, should be one per graph */

  interaction: Interaction;   /* Manages interaction with browser (mostly mouse) */
  renderer: Renderer;
  labels: LabelManager;

  // Internal state of the renderer
  state: {
    graph_info: {
      bounds: Bounds,
      background_color: Color,
      line_color: Color,
      line_width: number
    },
  };

  points: number[];
  custom_points: Array<Vec2>;
  closest_point: Vec2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.CreateDefaults();
    this.renderer = new Renderer(this.canvas);
    this.interaction = new Interaction(this);
    this.labels = new LabelManager(this, canvas);
  }

  private CreateDefaults() {
    let graph_info = {
      bounds: Bounds.Zero,
      background_color: AllColors.Get("black"),
      line_color: AllColors.Get("white"),
      line_width: 1
    };

    this.state = {
      graph_info: graph_info,
    };
  }

  AddGraph(points: number[]) {
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
    this.state.graph_info.bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);
    console.log(this.state.graph_info.bounds);

    // We sort
    this.custom_points = arr.sort((p1: Vec2, p2: Vec2) => {
      return p1.x - p2.x;
    });
  }

  // Applies the graph max bounds
  ApplyMaxBounds() {
    this.renderer.bounds = this.state.graph_info.bounds;
  }

  /*******************************************
   * DRAWING
   *******************************************/

  Draw() {
    // Resize
    this.renderer.ResizeCanvas();

    // Clear Canvas
    this.renderer.Clear(this.state.graph_info.background_color);

    this.renderer.DrawGraphLocalSpace(this.state.graph_info.line_color);

    // Draw x/y Axis
    this.renderer.DrawHorizontalLine(0, DrawSpace.LOCAL, AllColors.Get("green"));
    this.renderer.DrawVerticalLine(0, DrawSpace.LOCAL, AllColors.Get("green"));

    // Draw mouse vertical line
    // this.DrawLinePixelSpace([10, 10], [200, 200]);
    let canvas_pos = this.interaction.state.mouse.canvas;
    this.renderer.DrawVerticalLine(canvas_pos.x, DrawSpace.PIXEL,
                                   AllColors.Get("orange"));

    if (this.closest_point) {
      this.renderer.DrawIcon(this.closest_point, DrawSpace.LOCAL, AllColors.Get("purple"));
    }

    this.labels.Update();
  }
}

export default GraphManager;
