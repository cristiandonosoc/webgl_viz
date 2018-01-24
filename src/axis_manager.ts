///<reference path="resources/es6.d.ts" />

import {AllColors} from "./colors";
import {Vec2} from "./vectors";

import {GetCanvasChildByClass} from "./helpers"

import {RendererLocalToCanvas} from "./transforms";

import {DrawSpace, RendererInterface} from "./renderer";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface AxisManagerInterface {

  /* ACTIONS */
  Update() : void;
  Draw() : void;
}


/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

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
  /*****************************************************************
   * PUBLIC INTERFACE IMPL
   *****************************************************************/

  get Scales() : Vec2 {
    return this._state.axes.scales;
  }

  set Scales(scales: Vec2) {
    this._state.axes.scales = scales;
  }

  get Steps() : Vec2 {
    return this._state.axes.steps;
  }

  set Steps(steps: Vec2) {
    this._state.axes.steps = steps;
  }

  get StepDividers() : Vec2 {
    return this._state.axes.step_dividers;
  }

  get StepBreaks() : Vec2 {
    return this._state.axes.step_breaks;
  }

  get CanvasX() : CanvasRenderingContext2D {
    return this._state.axes.contexts.x;
  }

  get CanvasY() : CanvasRenderingContext2D {
    return this._state.axes.contexts.y;
  }

  /****************************************************
   * CONSTRUCTOR
   ****************************************************/

  constructor(container: HTMLElement,
              renderer: RendererInterface) {
    this._renderer = renderer;

    let x_axis = GetCanvasChildByClass(container, "x-axis");
    let y_axis = GetCanvasChildByClass(container, "y-axis");

    this._state = {
      axes: {
        contexts: {
          x: x_axis.getContext("2d"),
          y: y_axis.getContext("2d"),
        },
        scales: new Vec2(1, 1),
        steps: new Vec2(0, 0),
        step_dividers: new Vec2(10, 8),
        step_breaks: new Vec2(10, 6),
      },
    };
  }

  Update() : void {
    // We calculate the unit the zoom should be at
    let bounds = this._renderer.Bounds;
    let diffs = new Vec2(Math.abs(bounds.x.x - bounds.x.y),
                         Math.abs(bounds.y.x - bounds.y.y));
    let step_sizes = Vec2.Div(diffs, this.StepDividers);

    // We obtain the closest power of 10 for this step size
    let ctx = this;
    let scales = Vec2.Map(step_sizes, function(i) {
      return ctx._ClosestPowerOfTen(i);
    });

    // We set the scale
    this.Scales = scales;

    // We set the amount of steps
    this.Steps = Vec2.Div(diffs, scales);
  }

  Draw() : void {
    // We Draw The Axes
    let scales = this.Scales;
    let centers = this._CalculateAxisCenters(scales);
    let points = this._CalculateAxisPoints(centers, scales, this.Steps, this.StepBreaks);

    this._DrawAxisX(points.x, scales.x);
    this._DrawAxisY(points.y, scales.y);
  }

  /****************************************************
   * PRIVATE DRAW METHODS
   ****************************************************/

  private _DrawAxisX(points: Array<number>, scale: number) : void {
    // We clear the axis canvas
    let ctx = this.CanvasX;
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "black";

    // We draw the units
    let entry = this._ScaleToScaleEntry(scale);
    ctx.fillText(entry.CalculatedString, ctx.canvas.width / 2 - 30, 30);

    // for (var i = 0; i < points.length; i += 1) {
    for (let x of points) {
      // We draw the vertical line
      this._renderer.DrawVerticalLine(x, DrawSpace.LOCAL, AllColors.Get("darkgreen"));

      // We transform the point to Canvas space
      let canvas_x = RendererLocalToCanvas(this._renderer, new Vec2(x, 0)).x;

      // We get the "scaled" number
      let scaled = x / entry.scale;
      let text = this._DecimalTextFormatting(scaled.toFixed(3));

      // We draw the axis label
      ctx.fillText(text, canvas_x - 10, 10);
    }

  }

  private _DrawAxisY(points: Array<number>, scale: number) : void {
    // We clear the axis canvas
    let ctx = this.CanvasY;
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "black";

    // We get the units
    let entry = this._ScaleToScaleEntry(scale);
    let point = new Vec2(20, ctx.canvas.height / 2 + 30);

    // The drawing changes some settings
    ctx.save();
    for (let y of points) {
      // We draw the horizontal lines
      this._renderer.DrawHorizontalLine(y, DrawSpace.LOCAL, AllColors.Get("darkgreen"));

      // We transform the point to Canvas Space
      let canvas_y = RendererLocalToCanvas(this._renderer, new Vec2(0, y)).y;

      // We get the "scaled" number
      let scaled = y / entry.scale;
      let text = this._DecimalTextFormatting(scaled.toFixed(3));

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
   * PRIVATE METHODS
   ****************************************************/

  private _CalculateAxisCenters(scales: Vec2) : Vec2 {
    let final_offset = Vec2.Div(this._renderer.Offset, this._renderer.Scale);

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

  private _CalculateAxisPoints(centers: Vec2, scales: Vec2, steps: Vec2, step_breaks: Vec2) :
    { x: Array<number>, y: Array<number> } {

    // Create a function that generates the numbers
    let gen_points_func = function(center: number, scale: number,
                                   steps: number, step_break: number) : Array<number> {
      let it_advance = 1;
      if (steps > step_break) {
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
      x: gen_points_func(centers.x, scales.x, steps.x, step_breaks.x),
      y: gen_points_func(centers.y, scales.y, steps.y, step_breaks.y),
    };
  }

  private _ClosestPowerOfTen(x: number) : number {
    return 10 ** Math.floor(Math.log10(2 * x));
  }

  private _ScaleToScaleEntry(scale: number) : ScaleEntry {

    for (let entry of powers_names) {
      if (scale >= entry.scale) {
        return entry;
      }
    }
    return empty_scale;
  }

  private _DecimalTextFormatting(text: string) : string {
    let index = text.indexOf(".000");
    if (index >= 0) {
      return text.substr(0, index);
    }
    return text;
  }

  /**************************************************************************
   * PRIVATE DATA
   **************************************************************************/

  private _renderer: RendererInterface;

  private _state: {
    axes: {
      contexts: {
        x: CanvasRenderingContext2D,
        y: CanvasRenderingContext2D,
      },
      scales: Vec2,
      steps: Vec2,
      step_dividers: Vec2,
      step_breaks: Vec2,
    },
  };



}

export {AxisManager};
export {AxisManagerInterface};
export default AxisManagerInterface;
