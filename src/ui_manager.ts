/**
 * UIManager
 *
 * Handles all the global UI logic
 **/

import {Bounds, Vec2} from "./vectors";

import KeyboardSingleton from "./keyboard";
import {PDDataInterface} from "./data";

/*******************************************************
 * INTERFACE
 *******************************************************/

enum ZoomType {
  NONE,
  VERTICAL,
  HORIZONTAL,
  BOX
}

interface UIManagerInterface {
  Zoom: ZoomType;

  /* ACTIONS */
  Update() : void;
  Draw() : void;
  SetupData(data: PDDataInterface) : void;
}

/*******************************************************
 * IMPLEMENTATION
 *******************************************************/

class UIManager implements UIManagerInterface {
  /*******************************************************
   * PUBLIC INTERFACE
   *******************************************************/

  get Data() : PDDataInterface {
    return this._data;

  }

  SetupData(data: PDDataInterface) : void {
    this._data = data;
    let container = <HTMLElement> document.getElementById("graph-offsets");

    for (let i = 0; i < data.TsBase.length; i++) {
      let name = data.Names[i];
      let offset = data.Offsets[i];

      let label = <HTMLLabelElement> document.createElement("label");
      label.innerText = name;
      container.appendChild(label);

      let input = <HTMLInputElement> document.createElement("input");
      input.value = `${offset}`;

      let ctx = this;
      input.addEventListener("change", function() {
        ctx._RecreateOffsets();
      });
      container.appendChild(input);
      this._offset_inputs.push(input);
    }
  }

  private _RecreateOffsets() : void {
    console.log("RECREATING OFFSETS");
    let offsets = new Array<number>();
    for (let input of this._offset_inputs) {
      let offset = parseFloat(input.value);
      if (isNaN(offset)) {
        console.error(`Cannot parse offset to number: ${offset}`);
        return;
      }
      offsets.push(offset);
    }

    // We update the offset
    this.Data.Offsets = offsets;
    this.Data.Dirty = true;
  }

  get Zoom() : ZoomType {
    if (this.VerticalZoom) { return ZoomType.VERTICAL; }
    if (this.HorizontalZoom) { return ZoomType.HORIZONTAL; }
    if (this.BoxZoom) { return ZoomType.BOX; }
    return ZoomType.NONE;
  }

  Update() : void {
    this._UpdateLabel(this._ctrl_label, KeyboardSingleton.CtrlPressed);
    this._UpdateLabel(this._alt_label, KeyboardSingleton.AltPressed);
    this._UpdateLabel(this._shift_label, KeyboardSingleton.ShiftPressed);

    if (this.Data) {

    }
  }

  Draw() : void {
    this.DrawStats();
  }

  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor() {
    // this._renderer = renderer;
    // this._interaction = interaction;
    this._offset_inputs = new Array<HTMLInputElement>();

    this._offset_x_box = <HTMLInputElement> document.getElementById("offset-x");
    this._offset_y_box = <HTMLInputElement> document.getElementById("offset-y");
    this._screen_x_box = <HTMLInputElement> document.getElementById("screen-x");
    this._screen_y_box = <HTMLInputElement> document.getElementById("screen-y");
    this._canvas_x_box = <HTMLInputElement> document.getElementById("canvas-x");
    this._canvas_y_box = <HTMLInputElement> document.getElementById("canvas-y");
    this._local_x_box = <HTMLInputElement> document.getElementById("local-x");
    this._local_y_box = <HTMLInputElement> document.getElementById("local-y");
    this._scale_x_box = <HTMLInputElement> document.getElementById("scale-x");
    this._scale_y_box = <HTMLInputElement> document.getElementById("scale-y");
    this._bounds_x = {
      min: <HTMLInputElement> document.getElementById("bounds-x-min"),
      max: <HTMLInputElement> document.getElementById("bounds-x-max"),
    };
    this._bounds_y = {
      min: <HTMLInputElement> document.getElementById("bounds-y-min"),
      max: <HTMLInputElement> document.getElementById("bounds-y-max"),
    };

    this._vertical_zoom_radio = <HTMLInputElement> document.getElementById("control-vertical-zoom");
    this._horizontal_zoom_radio = <HTMLInputElement> document.getElementById("control-horizontal-zoom");
    this._box_zoom_radio = <HTMLInputElement> document.getElementById("control-box-zoom");

    // Setup changes
    this._bounds_x.min.addEventListener("change", this.DimensionChange);
    this._bounds_x.max.addEventListener("change", this.DimensionChange);
    this._bounds_y.min.addEventListener("change", this.DimensionChange);
    this._bounds_y.max.addEventListener("change", this.DimensionChange);

    this._ctrl_label = document.getElementById("ctrl-key");
    this._alt_label = document.getElementById("alt-key");
    this._shift_label = document.getElementById("shift-key");
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
    return this._vertical_zoom_radio.checked;
  }

  private get HorizontalZoom() : boolean {
    return this._horizontal_zoom_radio.checked;
  }

  private get BoxZoom() : boolean {
    return this._box_zoom_radio.checked;
  }

  private DimensionChange = (event: any) => {
    // We calculate the new dimensions
    let dim_x = new Vec2(Number(this._bounds_x.min.value),
                         Number(this._bounds_x.max.value));
    let dim_y = new Vec2(Number(this._bounds_y.min.value),
                         Number(this._bounds_y.max.value));
    // this._renderer.Bounds = Bounds.FromVecs(dim_x, dim_y);
    // TODO(donosoc): Mark the view as dirty when that is implemented
  };

  private DrawStats() {
    // let mouse_pos = this._interaction.CurrentMousePos;
    // this._screen_x_box.value = String(mouse_pos.screen.x);
    // this._screen_y_box.value = String(mouse_pos.screen.y);
    // this._canvas_x_box.value = String(mouse_pos.canvas.x);
    // this._canvas_y_box.value = String(mouse_pos.canvas.y);
    // this._local_x_box.value = String(mouse_pos.local.x);
    // this._local_y_box.value = String(mouse_pos.local.y);

    // this._offset_x_box.value = String(this._renderer.Offset.x);
    // this._offset_y_box.value = String(this._renderer.Offset.y);
    // this._scale_x_box.value =  String(this._renderer.Scale.x);
    // this._scale_y_box.value =  String(this._renderer.Scale.y);

    // // Bounds
    // this._bounds_x.min.value = String(this._renderer.Bounds.x.x);
    // this._bounds_x.max.value = String(this._renderer.Bounds.x.y);
    // this._bounds_y.min.value = String(this._renderer.Bounds.y.x);
    // this._bounds_y.max.value = String(this._renderer.Bounds.y.y);

    // Labels
    // this.labels.x.bottom.value = String(manager.Renderer.Bounds.x.first);
    // this.labels.x.top.value = String(manager.Renderer.Bounds.x.last);
    // this.labels.y.bottom.value = String(manager.Renderer.Bounds.y.first);
    // this.labels.y.top.value = String(manager.Renderer.Bounds.y.last);
  }

  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  // private _interaction: InteractionInterface;
  // private _renderer: RendererInterface;

  private _offset_x_box: HTMLInputElement;
  private _offset_y_box: HTMLInputElement;
  private _screen_x_box: HTMLInputElement;
  private _screen_y_box: HTMLInputElement;
  private _canvas_x_box: HTMLInputElement;
  private _canvas_y_box: HTMLInputElement;
  private _local_x_box: HTMLInputElement;
  private _local_y_box: HTMLInputElement;
  private _scale_x_box: HTMLInputElement;
  private _scale_y_box: HTMLInputElement;
  private _bounds_x: {
    min: HTMLInputElement,
    max: HTMLInputElement,
  };
  private _bounds_y: {
    min: HTMLInputElement,
    max: HTMLInputElement,
  };

  private _vertical_zoom_radio: HTMLInputElement;
  private _horizontal_zoom_radio: HTMLInputElement;
  private _box_zoom_radio: HTMLInputElement;

  private _ctrl_label: HTMLElement;
  private _alt_label: HTMLElement;
  private _shift_label: HTMLElement;

  private _data: PDDataInterface;
  private _offset_inputs: Array<HTMLInputElement>;
}

/*************************************************
 * SINGLETON
 *************************************************/

let UIManagerSingleton = new UIManager();

/*************************************************
 * EXPORTS
 *************************************************/

export {ZoomType}
export {UIManager}
export {UIManagerInterface}
export {UIManagerSingleton}
export default UIManagerSingleton;
