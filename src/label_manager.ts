import GraphManager from "./graph_manager";

import {RendererCanvasToLocal} from "./transforms";
import {Bounds, Vec2} from "./vectors";

class LabelManager {
  manager: GraphManager;
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

  vertical_zoom_radio: HTMLInputElement;
  horizontal_zoom_radio: HTMLInputElement;

  constructor(manager: GraphManager, canvas: HTMLCanvasElement) {
    this.manager = manager;
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

    this.vertical_zoom_radio = <HTMLInputElement> document.getElementById("control-vertical-zoom");
    this.horizontal_zoom_radio = <HTMLInputElement> document.getElementById("control-horizontal-zoom");

    // Setup changes
    this.labels.x.bottom.addEventListener("change", this.DimensionChange);
    this.labels.x.top.addEventListener("change", this.DimensionChange);
    this.labels.y.bottom.addEventListener("change", this.DimensionChange);
    this.labels.y.top.addEventListener("change", this.DimensionChange);
  }

  private DimensionChange = (event: any) => {
    // We calculate the new dimensions
    let dim_x = new Vec2(Number(this.labels.x.bottom.value),
                         Number(this.labels.x.top.value));
    let dim_y = new Vec2(Number(this.labels.y.bottom.value),
                         Number(this.labels.y.top.value));
    this.manager.renderer.bounds = Bounds.FromVecs(dim_x, dim_y);
    this.manager.Draw();
  };

  get VerticalZoom() : boolean {
    return this.vertical_zoom_radio.checked;
  }

  get HorizontalZoom() : boolean {
    return this.horizontal_zoom_radio.checked;
  }

  Update() {
    var renderer = this.manager.renderer;
    this.UpdateStats(this.manager);
  }

  private UpdateStats(manager: GraphManager) {
    let mouse_pos = this.manager.interaction.state.mouse.current_pos;
    this.screen_x_box.value = String(mouse_pos.screen.x);
    this.screen_y_box.value = String(mouse_pos.screen.y);
    this.canvas_x_box.value = String(mouse_pos.canvas.x);
    this.canvas_y_box.value = String(mouse_pos.canvas.y);
    this.local_x_box.value = String(mouse_pos.local.x);
    this.local_y_box.value = String(mouse_pos.local.y);

    this.offset_x_box.value = String(manager.renderer.offset.x);
    this.offset_y_box.value = String(manager.renderer.offset.y);
    this.scale_x_box.value =  String(manager.renderer.scale.x);
    this.scale_y_box.value =  String(manager.renderer.scale.y);

    // Labels
    this.labels.x.bottom.value = String(manager.renderer.bounds.x.first);
    this.labels.x.top.value = String(manager.renderer.bounds.x.last);
    this.labels.y.bottom.value = String(manager.renderer.bounds.y.first);
    this.labels.y.top.value = String(manager.renderer.bounds.y.last);
  }
}

export default LabelManager
