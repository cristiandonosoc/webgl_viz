// import GraphManager from "./graph_manager";
import GraphManagerInterface from "./graph_manager_interface";

import {RendererCanvasToLocal} from "./transforms";
import {Bounds, Vec2} from "./vectors";

import {ZoomType, LabelManagerInterface} from "./label_manager_interface";

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
  bounds_x: {
    min: HTMLInputElement,
    max: HTMLInputElement,
  };
  bounds_y: {
    min: HTMLInputElement,
    max: HTMLInputElement,
  };

  vertical_zoom_radio: HTMLInputElement;
  horizontal_zoom_radio: HTMLInputElement;
  box_zoom_radio: HTMLInputElement;

  ctrl_label: HTMLElement;

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
    this.bounds_x = {
      min: <HTMLInputElement> document.getElementById("bounds-x-min"),
      max: <HTMLInputElement> document.getElementById("bounds-x-max"),
    };
    this.bounds_y = {
      min: <HTMLInputElement> document.getElementById("bounds-y-min"),
      max: <HTMLInputElement> document.getElementById("bounds-y-max"),
    };


    this.vertical_zoom_radio = <HTMLInputElement> document.getElementById("control-vertical-zoom");
    this.horizontal_zoom_radio = <HTMLInputElement> document.getElementById("control-horizontal-zoom");
    this.box_zoom_radio = <HTMLInputElement> document.getElementById("control-box-zoom");

    // Setup changes
    this.labels.x.bottom.addEventListener("change", this.DimensionChange);
    this.labels.x.top.addEventListener("change", this.DimensionChange);
    this.labels.y.bottom.addEventListener("change", this.DimensionChange);
    this.labels.y.top.addEventListener("change", this.DimensionChange);

    this.ctrl_label = document.getElementById("ctrl-key");
  }

  get Zoom() : ZoomType {
    if (this.VerticalZoom) { return ZoomType.VERTICAL; }
    if (this.HorizontalZoom) { return ZoomType.HORIZONTAL; }
    if (this.BoxZoom) { return ZoomType.BOX; }
    return ZoomType.NONE;
  }

  Update() : void {
    if (this._manager.Interaction.CtrlPressed) {
      this.ctrl_label.classList.remove("hidden");
    } else {
      this.ctrl_label.classList.add("hidden");
    }
  }

  Draw() : void {
    this.DrawStats();
    this.DrawGraphLabels();
  }

  /*******************************************************
   * PRIVATE FUNCTIONS
   *******************************************************/

  private get VerticalZoom() : boolean {
    return this.vertical_zoom_radio.checked;
  }

  private get HorizontalZoom() : boolean {
    return this.horizontal_zoom_radio.checked;
  }

  private get BoxZoom() : boolean {
    return this.box_zoom_radio.checked;
  }

  private DimensionChange = (event: any) => {
    // We calculate the new dimensions
    let dim_x = new Vec2(Number(this.labels.x.bottom.value),
                         Number(this.labels.x.top.value));
    let dim_y = new Vec2(Number(this.labels.y.bottom.value),
                         Number(this.labels.y.top.value));
    this._manager.Renderer.Bounds = Bounds.FromVecs(dim_x, dim_y);
    this._manager.FrameLoop();
  };

  private DrawStats() {
    let mouse_pos = this._manager.Interaction.CurrentMousePos;
    var manager = this._manager;
    this.screen_x_box.value = String(mouse_pos.screen.x);
    this.screen_y_box.value = String(mouse_pos.screen.y);
    this.canvas_x_box.value = String(mouse_pos.canvas.x);
    this.canvas_y_box.value = String(mouse_pos.canvas.y);
    this.local_x_box.value = String(mouse_pos.local.x);
    this.local_y_box.value = String(mouse_pos.local.y);

    this.offset_x_box.value = String(manager.Renderer.Offset.x);
    this.offset_y_box.value = String(manager.Renderer.Offset.y);
    this.scale_x_box.value =  String(manager.Renderer.Scale.x);
    this.scale_y_box.value =  String(manager.Renderer.Scale.y);

    // Bounds
    this.bounds_x.min.value = String(manager.Renderer.Bounds.x.x);
    this.bounds_x.max.value = String(manager.Renderer.Bounds.x.y);
    this.bounds_y.min.value = String(manager.Renderer.Bounds.y.x);
    this.bounds_y.max.value = String(manager.Renderer.Bounds.y.y);

    // Labels
    this.labels.x.bottom.value = String(manager.Renderer.Bounds.x.first);
    this.labels.x.top.value = String(manager.Renderer.Bounds.x.last);
    this.labels.y.bottom.value = String(manager.Renderer.Bounds.y.first);
    this.labels.y.top.value = String(manager.Renderer.Bounds.y.last);
  }

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
