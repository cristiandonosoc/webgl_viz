///<reference path="resources/es6.d.ts" />

import {AllColors} from "./colors";
import {Vec2} from "./vectors";

import AxisManagerInterface from "./axis_manager_interface";
import GraphManagerInterface from "./graph_manager_interface";

import {RendererLocalToCanvas} from "./transforms";

import {DrawSpace} from "./renderer_interface";

// Fix because Math won't have this function
declare interface Math {
  log10(x: number) : number;
}

// Globally loaded script
declare let twgl: any;

class ScaleEntry {
  scale: number;
  name: string;
  unit: string;

  // Calculated
  private _expr: string;

  get CalculatedString() : string {
    return this._expr;
  }


  constructor(scale: number, name: string, unit: string) {
    this.scale = scale;
    this.name = name;
    this.unit = unit;
    this._expr = name + " (" + unit + ")";
  }

  static get Empty() : ScaleEntry {
    return new ScaleEntry(0, "", "");
  }
}

let powers_names = [
  new ScaleEntry(1, "Seconds", "s"),
  new ScaleEntry(Math.pow(10, -3), "Milliseconds", "ms"),
  new ScaleEntry(Math.pow(10, -6), "Microseconds", "us"),
  new ScaleEntry(Math.pow(10, -9), "Nanoseconds", "ns"),
];
let empty_scale = ScaleEntry.Empty;

class AxisManager implements AxisManagerInterface {
  private _manager: GraphManagerInterface;

  private _state: {
    axes: {
      x: {
        context: CanvasRenderingContext2D,
        scale: number,
        steps: number,
      },
      y: {
        context: CanvasRenderingContext2D,
        scale: number,
        steps: number,
      }
    }
  };

  get Scales() : Vec2 {
    return new Vec2(this._state.axes.x.scale,
                    this._state.axes.y.scale);
  }

  get TotalSteps() : Vec2 {
    return new Vec2(this._state.axes.x.steps,
                    this._state.axes.y.steps);
  }

  get CanvasX() : CanvasRenderingContext2D {
    return this._state.axes.x.context;
  }

  get CanvasY() : CanvasRenderingContext2D {
    return this._state.axes.y.context;
  }

  /****************************************************
   * CONSTRUCTOR
   ****************************************************/

  constructor(manager: GraphManagerInterface,
              x_axis: HTMLCanvasElement,
              y_axis: HTMLCanvasElement) {
    this._manager = manager;
    this._state = {
      axes: {
        x: {
          context: x_axis.getContext("2d"),
          scale: 1,
          steps: 0,
        },
        y: {
          context: y_axis.getContext("2d"),
          scale: 1,
          steps: 0,
        }
      },
    };
  }

  Update() : void {
    // We calculate the unit the zoom should be at
    let bounds = this._manager.Renderer.Bounds;
    let diffs = new Vec2(Math.abs(bounds.x.x - bounds.x.y),
                         Math.abs(bounds.y.x - bounds.y.y));
    let step_counts = new Vec2(10, 5);
    let step_sizes = Vec2.Div(diffs, step_counts);

    // We obtain the closest power of 10 for this step size
    let ctx = this;
    let scales = Vec2.Map(step_sizes, function(i) {
      return ctx.ClosestPowerOfTen(i);
    });

    // We set the scale
    this._state.axes.x.scale = scales.x;
    this._state.axes.y.scale = scales.y;

    // We set the amount of steps
    let steps = Vec2.Div(diffs, scales);
    this._state.axes.x.steps = steps.x;
    this._state.axes.y.steps = steps.y;

    // // X axis
    // let bounds_x = Math.abs(bounds.x.x - bounds.x.y);
    // let diff_x = bounds_x / 10;
    // let closest_power = this.ClosestPowerOfTen(diff_x);
    // // let step = Math.floor(diff_x / closest_power) * closest_power;
    // let scale = closest_power;
    // let total_steps = bounds_x / scale;

    // this._state.axes.x.scale = scale;
    // this._state.axes.x.total_steps = total_steps;
  }

  Draw() : void {
    if (!this._manager.Valid) {
      return;
    }
    // We Draw The Axes
    let scales = this.Scales;
    let steps = this.TotalSteps;
    let centers = this.CalculateAxisCenters(scales);
    let points = this.CalculateAxisPoints(centers, scales, steps);

    this.DrawAxisX(points.x, scales.x);
    this.DrawAxisY(points.y, scales.y);
  }

  /****************************************************
   * PRIVATE DRAW METHODS
   ****************************************************/

  private DrawAxisX(points: Array<number>, scale: number) : void {
    let renderer = this._manager.Renderer;

    // We clear the axis canvas
    let ctx = this.CanvasX;
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "black";

    // for (var i = 0; i < points.length; i += 1) {
    for (let x of points) {
      // We draw the vertical line
      renderer.DrawVerticalLine(x, DrawSpace.LOCAL, AllColors.Get("darkgreen"));

      // We transform the point to Canvas space
      let canvas_x = RendererLocalToCanvas(renderer, new Vec2(x, 0)).x;

      // We draw the axis label
      ctx.fillText(x.toPrecision(3), canvas_x - 10, 10);
    }

    // We draw the units
    let entry = this.ScaleToScaleEntry(scale);
    ctx.fillText(entry.CalculatedString, ctx.canvas.width / 2 - 30, 30);
  }

  private DrawAxisY(points: Array<number>, scale: number) : void {
    let renderer = this._manager.Renderer;

    // We clear the axis canvas
    let ctx = this.CanvasY;
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "black";

    // We get the units
    let entry = this.ScaleToScaleEntry(scale);
    let point = new Vec2(20, ctx.canvas.height / 2 + 30);

    // The drawing changes some settings
    ctx.save();
    for (let y of points) {
      // We draw the horizontal lines
      renderer.DrawHorizontalLine(y, DrawSpace.LOCAL, AllColors.Get("darkgreen"));

      // We transform the point to Canvas Space
      let canvas_y = RendererLocalToCanvas(renderer, new Vec2(0, y)).y;

      // We get the "scaled" number
      let scaled = y / entry.scale;
      let text = scaled.toFixed(3);
      let index = text.indexOf(".000");
      if (index >= 0) {
        text = text.substr(0, index);
      }

      // We draw the axis label
      ctx.textAlign = "right";
      ctx.fillText(text, 70, ctx.canvas.height - (canvas_y - 2));
    }
    ctx.restore();

    // We draw it rotated
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(entry.CalculatedString, 0, 0);
    ctx.restore();
  }

  /****************************************************
   * HELPERS METHODS
   ****************************************************/

  private CalculateAxisCenters(scales: Vec2) : Vec2 {
    let renderer = this._manager.Renderer;
    let final_offset = Vec2.Div(renderer.Offset, renderer.Scale);

    // We create a mapping function
    let center_func = function(i: number, scale: number) : number {
      let amount = Math.floor(i / scale);
      // We always want odd amounts
      if (amount % 2 == 0) {
        amount += 1;
      }
      return -amount * scale;
    };

    let centers = new Vec2(center_func(final_offset.x, scales.x),
                           center_func(final_offset.y, scales.y));
    return centers;
  }

  private CalculateAxisPoints(centers: Vec2, scales: Vec2, steps: Vec2) :
    { x: Array<number>, y: Array<number> } {

    // Create a function that generates the numbers
    let gen_points_func = function(center: number, scale: number,
                                   steps: number) : Array<number> {
      let it_advance = 1;
      if (steps > 10) {
        it_advance = 2;
      }

      // We calculate the points
      let points = Array<number>();
      // Only on odd range, we print the center axis
        points.push(center);
      if (it_advance == 1) {
      }
      // We create the points outwardly from the center
      for (let i = 1; i < steps; i += 1) {
        points.push(center + i * scale);
        points.push(center - i * scale);
      }
      return points;
    }

    return {
      x: gen_points_func(centers.x, scales.x, steps.x),
      y: gen_points_func(centers.y, scales.y, steps.y),
    };
  }

  private ClosestPowerOfTen(x: number) : number {
    return 10 ** Math.floor(Math.log10(2 * x));
  }

  private ScaleToScaleEntry(scale: number) : ScaleEntry {

    for (let entry of powers_names) {
      if (scale >= entry.scale) {
        return entry;
      }
    }
    return empty_scale;
  }

}

export default AxisManager;
