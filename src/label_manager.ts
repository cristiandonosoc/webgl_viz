import GraphManager from "./graph_manager";

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

  offset_x_box: HTMLInputElement;
  offset_y_box: HTMLInputElement;
  screen_x_box: HTMLInputElement;
  screen_y_box: HTMLInputElement;
  canvas_x_box: HTMLInputElement;
  canvas_y_box: HTMLInputElement;
  local_x_box: HTMLInputElement;
  local_y_box: HTMLInputElement;
  scale_x_box: HTMLInputElement;
  scale_y_box: HTMLInputElement;

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

    this.offset_x_box = <HTMLInputElement> document.getElementById("offset-x");
    this.offset_y_box = <HTMLInputElement> document.getElementById("offset-y");
    this.screen_x_box = <HTMLInputElement> document.getElementById("screen-x");
    this.screen_y_box = <HTMLInputElement> document.getElementById("screen-y");
    this.canvas_x_box = <HTMLInputElement> document.getElementById("canvas-x");
    this.canvas_y_box = <HTMLInputElement> document.getElementById("canvas-y");
    this.local_x_box = <HTMLInputElement> document.getElementById("local-x");
    this.local_y_box = <HTMLInputElement> document.getElementById("local-y");
    this.scale_x_box = <HTMLInputElement> document.getElementById("scale-x");
    this.scale_y_box = <HTMLInputElement> document.getElementById("scale-y");

    // Setup changes
    this.labels.x.bottom.addEventListener("change", this.DimensionChange);
    this.labels.x.top.addEventListener("change", this.DimensionChange);
    this.labels.y.bottom.addEventListener("change", this.DimensionChange);
    this.labels.y.top.addEventListener("change", this.DimensionChange);
  }

  private DimensionChange = (event: any) => {
    console.log(this.labels.x.bottom.value,
                this.labels.x.top.value,
                this.labels.y.bottom.value,
                this.labels.y.top.value);
  };

  Update(manager: GraphManager) {
    var renderer = manager.renderer;

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

    this.UpdateStats(manager);
  }

  private UpdateStats(manager: GraphManager) {
    this.screen_x_box.value = String(manager.interaction.state.mouse.screen[0]);
    this.screen_y_box.value = String(manager.interaction.state.mouse.screen[1]);
    this.canvas_x_box.value = String(manager.interaction.state.mouse.canvas[0]);
    this.canvas_y_box.value = String(manager.interaction.state.mouse.canvas[1]);
    this.offset_x_box.value = String(manager.renderer.state.offset[0]);
    this.offset_y_box.value = String(manager.renderer.state.offset[1]);
    this.scale_x_box.value =  String(manager.renderer.state.scale[0]);
    this.scale_y_box.value =  String(manager.renderer.state.scale[1]);
  }


}

export default LabelManager
