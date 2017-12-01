///<reference path="resources/es6.d.ts" />

import {AllColors} from "./colors";

import AxisManagerInterface from "./axis_manager_interface";
import GraphManagerInterface from "./graph_manager_interface";

import {DrawSpace} from "./renderer_interface";

declare interface Math {
  log10(x: number) : number;
}

class AxisManager implements AxisManagerInterface {
  private _manager: GraphManagerInterface;

  private _state: {
    step: number,
    total_steps: number,
  };

  get Step() : number {
    return this._state.step;
  }

  get TotalSteps() : number {
    return this._state.total_steps;
  }

  /****************************************************
   * CONSTRUCTOR
   ****************************************************/

  constructor(manager: GraphManagerInterface) {
    this._manager = manager;
    this._state = {
      step: 0,
      total_steps: 0,
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
    console.log(
      " TOTAL: ", bounds_x,
      " DIFF: ", diff_x,
      " POWER: ", closest_power,
      " STEP: " , step,
      " TOTAL_STEPS: ", total_steps);

    this._state.step = step;
    this._state.total_steps = total_steps;
  }

  Draw() : void {
    if (this.Step == 0) {
      return;
    }
    // We draw vertical lines

    let it_advance = 1;
    if (this.TotalSteps > 20) {
      it_advance = 2;
    }

    for (let i = 1; i < this.TotalSteps; i += it_advance) {
      this._manager.Renderer.DrawVerticalLine(i * this.Step, DrawSpace.LOCAL, AllColors.Get("darkgreen"));
      this._manager.Renderer.DrawVerticalLine(-i * this.Step, DrawSpace.LOCAL, AllColors.Get("darkgreen"));
    }
  }

  /****************************************************
   * PRIVATE METHODS
   ****************************************************/

  private ClosestPowerOfTen(x: number) : number {
    return 10 ** Math.floor(Math.log10(2 * x));
  }

}

export default AxisManager;
