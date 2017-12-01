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

class AxisManager implements AxisManagerInterface {
  private _manager: GraphManagerInterface;

  private _state: {
    axes: {
      x: {
        context: CanvasRenderingContext2D,
        step: number,
        total_steps: number,
        points?: Array<number>,
      },
      y: {
        context: CanvasRenderingContext2D,
        step: number,
        total_steps: number,
        points?: Array<number>,
      }
    }
  };

  get Step() : Vec2 {
    return new Vec2(this._state.axes.x.step,
                    this._state.axes.y.step);
  }

  get TotalSteps() : Vec2 {
    return new Vec2(this._state.axes.x.total_steps,
                    this._state.axes.y.total_steps);
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
          step: 0,
          total_steps: 0,
        },
        y: {
          context: y_axis.getContext("2d"),
          step: 0,
          total_steps: 0,
        }
      },
    };
  }

  Update() : void {
    // We calculate the unit the zoom should be at
    let bounds = this._manager.Renderer.Bounds;
    let bounds_x = Math.abs(bounds.x.x - bounds.x.y);
    let diff_x = bounds_x / 10;
    let closest_power = this.ClosestPowerOfTen(diff_x);
    // let step = Math.floor(diff_x / closest_power) * closest_power;
    let step = closest_power;
    let total_steps = bounds_x / step;
    // console.log(
    //   " TOTAL: ", bounds_x,
    //   " DIFF: ", diff_x,
    //   " POWER: ", closest_power,
    //   " STEP: " , step,
    //   " TOTAL_STEPS: ", total_steps);

    this._state.axes.x.step = step;
    this._state.axes.x.total_steps = total_steps;
  }

  Draw() : void {
    let step = this.Step;
    if ((step.x == 0)) {
      return;
    }
    // We Draw The Axes
    let total_steps = this.TotalSteps;

    this.DrawAxisX(step.x, total_steps.x);
  }

  /****************************************************
   * PRIVATE METHODS
   ****************************************************/


  private DrawAxisX(step: number, total_steps: number) : void {
    // If there are too many steps, we draw half of them
    let it_advance = 1;
    if (total_steps > 20) {
      it_advance = 2;
    }

    // We calculate the points
    let points = Array<number>();
    for (let i = 1; i < total_steps; i += it_advance) {
      points.push(+i * step);
      points.push(-i * step);
    }

    // We draw the lines
    let renderer = this._manager.Renderer;
    let canvas_points = Array<number>();
    for (var i = 0; i < points.length; i += 1) {
      let point = points[i];
      // We transform the point to Canvas space
      let canvas_x = RendererLocalToCanvas(renderer, new Vec2(point, 0)).x;
      canvas_points.push(canvas_x);

      // We draw the vertical line
      renderer.DrawVerticalLine(point, DrawSpace.LOCAL,
                                AllColors.Get("darkgreen"));


    }

    // We clear the axis canvas
    let ctx = this.CanvasX;
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "black";
    for (var i = 0; i < canvas_points.length; i += 1) {
      let x = points[i];
      let canvas_x = canvas_points[i];
      ctx.fillText(x.toPrecision(3), canvas_x - 10, 10);
    }

    // We get the points in Canvas Space

    // let ctx = this.CanvasX;
    // ctx.fillStyle = "green";

  }

  private ClosestPowerOfTen(x: number) : number {
    return 10 ** Math.floor(Math.log10(2 * x));
  }

}

export default AxisManager;
