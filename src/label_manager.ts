import VisualizerInterface from "./visualizer_interface";

import InternalRendererInterface from "./internal_renderer";
import {RendererCanvasToLocal} from "./transforms";
import {Bounds, Vec2} from "./vectors";

import {GetCanvasChildByClass} from "./helpers";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface LabelManagerInterface {
  /* ACTIONS */
  Update() : void;
  Draw() : void;
}


/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

// Globally loaded script
declare let twgl: any;


class LabelManager implements LabelManagerInterface {

  /*******************************************************
   * PUBLIC INTERFACE IMPL
   *******************************************************/

  Update() : void {}

  Draw() : void {
    this._DrawGraphLabels();
  }


  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(container: HTMLElement,
              visualizer: VisualizerInterface,
              renderer: InternalRendererInterface) {

    this._visualizer= visualizer;
    this._renderer = renderer;
    let label_canvas = GetCanvasChildByClass(container, "canvas-labels");

    this._label_canvas = label_canvas.getContext("2d");

    this._labels = {
      x: {
        bottom: <HTMLInputElement> document.querySelector(".x-labels .bottom"),
        top: <HTMLInputElement> document.querySelector(".x-labels .top")
      },
      y: {
        bottom: <HTMLInputElement> document.querySelector(".y-labels .bottom"),
        top: <HTMLInputElement> document.querySelector(".y-labels .top")
      }
    };
  }

  /*******************************************************
   * PRIVATE FUNCTIONS
   *******************************************************/

  private _DrawGraphLabels() : void {
    let ctx = this._label_canvas;

    let sqr_size = 10;
    let height = (ctx.canvas.height) / 2;

    let label_width = 100;

    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (var i = 0; i < this._visualizer.Graphs.length; i += 1) {
      let graph_info = this._visualizer.Graphs[i];

      let sqr_x = label_width * i + 10;
      let sqr_y = height - sqr_size / 2;

      ctx.strokeStyle = "black";
      ctx.strokeRect(sqr_x, sqr_y, sqr_size, sqr_size);
      ctx.fillStyle = graph_info.Color.RgbString;
      ctx.fillRect(sqr_x, sqr_y, sqr_size, sqr_size);

      ctx.fillStyle = "black";
      ctx.fillText(graph_info.Name, label_width * i + 12 + sqr_size, height + sqr_size / 3, label_width);
    }
  }

  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _visualizer: VisualizerInterface;
  private _renderer: InternalRendererInterface;
  private _label_canvas: CanvasRenderingContext2D;
  private _labels: {
    x: {
      bottom: HTMLInputElement,
      top: HTMLInputElement
    },
    y: {
      bottom: HTMLInputElement,
      top: HTMLInputElement
    },
  };
}

export {LabelManager};
export {LabelManagerInterface}
export default LabelManagerInterface
