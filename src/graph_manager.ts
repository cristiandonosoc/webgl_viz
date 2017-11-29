///<reference path="resources/webgl2.d.ts" />

import AllColors from "./colors"
import Interaction from "./interaction";
import LabelManager from "./label_manager";
import Renderer from "./renderer";
import {Vec2} from "./vectors";

var g_inf = 99999999;

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
      background_color: number[],
      line_color: number[],
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
    var graph_info = {
      background_color: [1, 1, 1, 1],
      line_color: [0, 0, 0, 1],
      line_width: 1
    };

    this.state = {
      graph_info: graph_info,
    };
  }

  AddGraph(points: number[]) {
    this.renderer.AddGraph(points);
    var arr = new Array<Vec2>(points.length / 2);
    for (var i = 0; i < arr.length; i += 1) {
      var point_index = i * 2;
      arr[i] = new Vec2(points[point_index], points[point_index + 1]);
    }

    // We sort
    this.custom_points = arr.sort((p1: Vec2, p2: Vec2) => {
      return p1.x - p2.x;
    });
  }

  ChangeDimensions(dim_x: Vec2, dim_y: Vec2) {
    this.renderer.ChangeDimensions(dim_x, dim_y);
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
    this.renderer.DrawLineLocalSpace(new Vec2(-g_inf, 0), new Vec2(g_inf, 0), AllColors.Get("green"));
    this.renderer.DrawLineLocalSpace(new Vec2(0, -g_inf), new Vec2(0, g_inf), AllColors.Get("green"));

    // Draw mouse vertical line
    // this.DrawLinePixelSpace([10, 10], [200, 200]);
    let canvas_pos = this.interaction.state.mouse.canvas;
    this.renderer.DrawLinePixelSpace(new Vec2(canvas_pos.x, -g_inf),
                                     new Vec2(canvas_pos.x, g_inf),
                                     AllColors.Get("orange"));

    if (this.closest_point) {
      this.renderer.DrawIconLocalSpace(this.closest_point, AllColors.Get("purple"));
    }

    this.labels.Update();
  }
}

export default GraphManager;
