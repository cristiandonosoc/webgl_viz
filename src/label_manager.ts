// import GraphManager from "./graph_manager";
import GraphManagerInterface from "./graph_manager_interface";

import {RendererCanvasToLocal} from "./transforms";
import {Bounds, Vec2} from "./vectors";

import LabelManagerInterface from "./label_manager_interface";

// Globally loaded script
declare let twgl: any;

class LabelManager implements LabelManagerInterface {
  private _manager: GraphManagerInterface;

  label_canvas: CanvasRenderingContext2D;

  labels: {
    x: {
      bottom: HTMLInputElement,
      top: HTMLInputElement
    },
    y: {
      bottom: HTMLInputElement,
      top: HTMLInputElement
    },
  };

  constructor(manager: GraphManagerInterface,
              label_canvas: HTMLCanvasElement) {
    this._manager = manager;
    this.label_canvas = label_canvas.getContext("2d");
    var graph_container = this._manager.Renderer.Canvas.parentNode.parentNode;

    this.labels = {
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

  Update() : void {}

  Draw() : void {
    this.DrawGraphLabels();
  }

  /*******************************************************
   * PRIVATE FUNCTIONS
   *******************************************************/

  private DrawGraphLabels() : void {
    let ctx = this.label_canvas;

    let sqr_size = 10;
    let height = (ctx.canvas.height) / 2;

    let label_width = 100;

    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (var i = 0; i < this._manager.Graphs.length; i += 1) {
      let graph_info = this._manager.Graphs[i];

      let sqr_x = label_width * i + 10;
      let sqr_y = height - sqr_size / 2;

      ctx.strokeStyle = "black";
      ctx.strokeRect(sqr_x, sqr_y, sqr_size, sqr_size);
      ctx.fillStyle = graph_info.color.RgbString;
      ctx.fillRect(sqr_x, sqr_y, sqr_size, sqr_size);

      ctx.fillStyle = "black";
      ctx.fillText(graph_info.name, label_width * i + 12 + sqr_size, height + sqr_size / 3, label_width);
    }
  }
}

export default LabelManager;
