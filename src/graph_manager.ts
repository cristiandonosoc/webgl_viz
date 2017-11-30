///<reference path="resources/webgl2.d.ts" />

import {Color, AllColors} from "./colors"
import Interaction from "./interaction";
import LabelManager from "./label_manager";
import {Renderer} from "./renderer";
import {DrawSpace, RendererInterface} from "./renderer_interface";
import {Bounds, Vec2} from "./vectors";

let g_inf = 9007199254740991;

class GraphManager {
  canvas: HTMLCanvasElement;

  /* WebGL programs */
  interaction: Interaction;   /* Manages interaction with browser (mostly mouse) */
  label_manager: LabelManager;
  renderer: RendererInterface;

  // Internal state of the renderer
  state: {
    graph_info: {
      bounds: Bounds,
      background_color: Color,
      drag_color: Color,
      line_color: Color,
      line_width: number
    },
  };

  graph_loaded: boolean;
  points: number[];
  custom_points: Array<Vec2>;
  closest_point: Vec2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.CreateDefaults();
    this.renderer = new Renderer(this.canvas);
    this.interaction = new Interaction(this);
    this.label_manager = new LabelManager(this, canvas);
    this.graph_loaded = false;
  }

  private CreateDefaults() {
    let graph_info = {
      bounds: Bounds.Zero,
      background_color: AllColors.Get("black"),
      drag_color: AllColors.Get("lightblue"),
      line_color: AllColors.Get("white"),
      line_width: 1
    };

    this.state = {
      graph_info: graph_info,
    };
  }

  HandleDapFile = (content: string) => {
    // We split into lines
    let lines = content.split("\n");
    console.info("Read %d lines", lines.length);

    // We go over the lines
    let base = new Array<number>();
    let points = new Array<number>();
    points.push(0);
    points.push(0);
    points.push(0.5);
    points.push(0.5);

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
      let first = parseFloat(tokens[3]) + base[0];
      let last = parseFloat(tokens[tokens.length - 1]) + base[base.length - 1];

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
    this.state.graph_info.bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);

    // We sort
    this.custom_points = arr.sort((p1: Vec2, p2: Vec2) => {
      return p1.x - p2.x;
    });

    this.graph_loaded = true;
  }

  // Applies the graph max bounds
  ApplyMaxBounds() : void {
    this.renderer.bounds = this.state.graph_info.bounds.Copy();
  }

  /*******************************************
   * DRAWING
   *******************************************/

  Draw() : void {
    // Resize
    this.renderer.ResizeCanvas();

    // Clear Canvas
    this.renderer.Clear(this.state.graph_info.background_color);

    if (!this.graph_loaded) {
      return;
    }

    if (this.interaction.ZoomDragging) {
      if (this.label_manager.VerticalZoom) {
        let start = this.interaction.DownMousePos.canvas.x;
        let end = this.interaction.CurrentMousePos.canvas.x;
        this.renderer.DrawVerticalRange(start, end, DrawSpace.PIXEL, this.state.graph_info.drag_color);
      } else if (this.label_manager.HorizontalZoom) {
        let start = this.interaction.DownMousePos.canvas.y;
        let end = this.interaction.CurrentMousePos.canvas.y;
        this.renderer.DrawHorizontalRange(start, end, DrawSpace.PIXEL, this.state.graph_info.drag_color);
      } else if (this.label_manager.BoxZoom) {
        let p1 = this.interaction.DownMousePos.canvas;
        let p2 = this.interaction.CurrentMousePos.canvas;
        this.renderer.DrawBox(p1, p2, DrawSpace.PIXEL, this.state.graph_info.drag_color);
      }
    }

    // Draw x/y Axis
    this.renderer.DrawHorizontalLine(0, DrawSpace.LOCAL, AllColors.Get("green"));
    this.renderer.DrawVerticalLine(0, DrawSpace.LOCAL, AllColors.Get("green"));

    this.renderer.DrawGraph(DrawSpace.LOCAL, this.state.graph_info.line_color);

    // Draw mouse vertical line
    // this.DrawLinePixelSpace([10, 10], [200, 200]);
    let canvas_pos = this.interaction.CurrentMousePos.canvas;
    this.renderer.DrawVerticalLine(canvas_pos.x, DrawSpace.PIXEL,
                                   AllColors.Get("orange"));

    if (this.closest_point) {
      this.renderer.DrawIcon(this.closest_point, DrawSpace.LOCAL, AllColors.Get("purple"));
    }

    this.label_manager.Update();
  }
}

export default GraphManager;
