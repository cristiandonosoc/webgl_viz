/**
 * UIManager
 *
 * Handles all the global UI logic
 **/

import {Bounds, Vec2} from "./vectors";
import {ZoomType, UIManagerInterface} from "./ui_manager_interface";

import GraphManagerInterface from "./graph_manager_interface";

import KeyboardSingleton from "./keyboard";

class UIManager implements UIManagerInterface {
  private _manager: GraphManagerInterface;


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
  alt_label: HTMLElement;
  shift_label: HTMLElement;

  constructor(manager: GraphManagerInterface) {
    this._manager = manager;
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
    this.bounds_x.min.addEventListener("change", this.DimensionChange);
    this.bounds_x.max.addEventListener("change", this.DimensionChange);
    this.bounds_y.min.addEventListener("change", this.DimensionChange);
    this.bounds_y.max.addEventListener("change", this.DimensionChange);

    this.ctrl_label = document.getElementById("ctrl-key");
    this.alt_label = document.getElementById("alt-key");
    this.shift_label = document.getElementById("shift-key");
  }

  /*******************************************************
   * PUBLIC INTERFACE
   *******************************************************/

  get Zoom() : ZoomType {
    if (this.VerticalZoom) { return ZoomType.VERTICAL; }
    if (this.HorizontalZoom) { return ZoomType.HORIZONTAL; }
    if (this.BoxZoom) { return ZoomType.BOX; }
    return ZoomType.NONE;
  }

  Update() : void {
    this._UpdateLabel(this.ctrl_label, KeyboardSingleton.CtrlPressed);
    this._UpdateLabel(this.alt_label, KeyboardSingleton.AltPressed);
    this._UpdateLabel(this.shift_label, KeyboardSingleton.ShiftPressed);
  }


  Draw() : void {
    this.DrawStats();
  }


  /*******************************************************
   * PRIVATE FUNCTIONS
   *******************************************************/

  private _UpdateLabel(label: HTMLElement, flag: boolean) : void {
    if (flag) {
      label.classList.remove("hidden");
    } else {
      label.classList.add("hidden");
    }
  }

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
    let dim_x = new Vec2(Number(this.bounds_x.min.value),
                         Number(this.bounds_x.max.value));
    let dim_y = new Vec2(Number(this.bounds_y.min.value),
                         Number(this.bounds_y.max.value));
    this._manager.Renderer.Bounds = Bounds.FromVecs(dim_x, dim_y);
    // TODO(donosoc): Mark the view as dirty when that is implemented
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
    // this.labels.x.bottom.value = String(manager.Renderer.Bounds.x.first);
    // this.labels.x.top.value = String(manager.Renderer.Bounds.x.last);
    // this.labels.y.bottom.value = String(manager.Renderer.Bounds.y.first);
    // this.labels.y.top.value = String(manager.Renderer.Bounds.y.last);
  }
}

export {ZoomType}
export {UIManager}
export {UIManagerInterface}
export default UIManager
