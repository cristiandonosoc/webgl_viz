import Renderer from "./renderer";

import {RendererCanvasToLocal} from "./transforms";

class LabelManager {
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

  constructor(canvas: HTMLCanvasElement) {
    var graph_container = canvas.parentNode.parentNode;

    this.labels = {
      x: {
        bottom: document.querySelector(".x-labels .bottom"),
        top: document.querySelector(".x-labels .top")
      },
      y: {
        bottom: document.querySelector(".y-labels .bottom"),
        top: document.querySelector(".y-labels .top")
      }
    };
  }

  Update(renderer: Renderer) {
    // We transform the points
    // bottom-left
    var bl = [0, 0];
    var tbl = RendererCanvasToLocal(renderer, bl);
    // top-right
    var tr = [renderer.gl.canvas.width, renderer.gl.canvas.height];
    var ttr = RendererCanvasToLocal(renderer, tr);


    var offset = renderer.state.offset;
    this.labels.x.bottom.value = String(tbl[0]);
    this.labels.y.bottom.value = String(tbl[1]);

    this.labels.x.top.value = String(ttr[0]);
    this.labels.y.top.value = String(ttr[1]);
  }
}

export default LabelManager
