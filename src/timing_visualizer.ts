import {Bounds, Vec2} from "./vectors";
import {DrawSpace, RendererElemId, InternalRenderer, InternalRendererInterface} from "./internal_renderer";
import {Interaction, InteractionInterface} from "./interaction";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {IdManager} from "./helpers";
import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {AllColors, Color} from "./colors";

import {GraphInfo, GraphInfoInterface} from "./graph_info";

import VisualizerInterface from "./visualizer_interface";

import {PDDataInterface} from "./data_loader";

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class TimingVisualizer implements VisualizerInterface {

  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(container: HTMLElement,
              viz_callback?: (i:VisualizerInterface) => void) {
    this._id = IdManager.GetVisualizerId();

    let ctx = this;
    this._Setup(container, function (i: InteractionInterface) {
      ctx._InteractionCallback(i);
    });


    if (viz_callback) {
      this.SetGlobalInteractionCallback(viz_callback);
    }
  }

  private _Setup(container: HTMLElement,
                 callback: (i: InteractionInterface) => void) {
    this._graphs = new Array<GraphInfoInterface>();
    this._renderer = new InternalRenderer(container);
    this._interaction = new Interaction(this._renderer, callback);
    this._label_manager = new LabelManager(container, this, this._renderer);
    this._axis_manager = new AxisManager(container, this._renderer);
  }

  private _InteractionCallback(i: InteractionInterface) : void {
    // We see if we have to call the program
    if (this._global_interaction_callback) {
      this._global_interaction_callback(this);
    }

    return;
    // this.SetClosestPoint(i.CurrentMousePos.local);
  }

  /*******************************************************
   * PUBLIC INTERFACE DATA
   *******************************************************/

  get Colors() : {[K:string]: Color} { return this._colors; }

  GetColor(key: string) : Color {
    return this._colors[key];
  }

  SetColor(key: string, color: Color) : boolean {
    this._colors[key] = color;
    return true;
  }



  get Id() : number { return this._id; }

  SetGlobalInteractionCallback(callback: (i: VisualizerInterface) => void): void {
    this._global_interaction_callback = callback;
  }

  ReactToOtherVisualizer(v: VisualizerInterface) : void {
    // We only care on obtaining the horizontal zoom
    let new_bounds = v.Renderer.Bounds.Copy();
    new_bounds.y = this.Renderer.Bounds.y;

    this.Renderer.Bounds = new_bounds;
  }

  get Graphs() : Array<GraphInfoInterface> {
    return this._graphs;
  }

  Start() : void {
    this.Interaction.Start();
  }

  LoadData(data: PDDataInterface) : void {
    // We calculate the points
    let points = new Array<number>();

    let min_tsbase = Math.min(...data.TsBase);
    let offset = data.TsBase[0] - min_tsbase;

    let ybase = 0;

    for (let entry of data.Entries) {
      // We add the first point
      let xbase = offset + entry.Data[0];

      for (let i = 0; i < entry.Data.length - 1; i++) {
        points.push(offset + entry.Data[i]);
        points.push(ybase + i * 0.2);

        points.push(offset + entry.Data[i+1]);
        points.push(ybase + (i + 1) * 0.2);
      }
    }

    let graph_info = new GraphInfo("Test");

    graph_info.RawPoints = points;
    graph_info.GLPrimitive = this.Renderer.GL.LINES;
    this.Renderer.AddGraph(graph_info);
    this._graphs.push(graph_info);
  }

  SetClosestPoint(point: Vec2) {
    throw new Error("NOT IMPLEMENTED");
  }

  ApplyMaxBounds() : void {
    this.Renderer.ApplyMaxBounds();
  }

  Update() : void {
    this.Renderer.ResizeCanvas();
    this.LabelManager.Update();
    this.AxisManager.Update();
  }

  Draw() : void {

    let background_color = AllColors.Get("black");
    let drag_color = AllColors.Get("lightblue");


    this.Renderer.Clear(AllColors.Get("black"));
    this.LabelManager.Draw();

    if (this.Interaction.ZoomDragging) {
      let zoom = UIManagerSingleton.Zoom;
      if (zoom == ZoomType.VERTICAL) {
        let start = this.Interaction.DownMousePos.canvas.x;
        let end = this.Interaction.CurrentMousePos.canvas.x;
        this.Renderer.DrawVerticalRange(start, end, DrawSpace.PIXEL, drag_color);
      } else if (zoom == ZoomType.HORIZONTAL) {
        let start = this.Interaction.DownMousePos.canvas.y;
        let end = this.Interaction.CurrentMousePos.canvas.y;
        this.Renderer.DrawHorizontalRange(start, end, DrawSpace.PIXEL, drag_color);
      } else if (zoom == ZoomType.BOX) {
        let p1 = this.Interaction.DownMousePos.canvas;
        let p2 = this.Interaction.CurrentMousePos.canvas;
        this.Renderer.DrawBox(p1, p2, DrawSpace.PIXEL, drag_color);
      }
    }

    // Draw x/y Axis
    this.AxisManager.Draw();

    this.Renderer.DrawHorizontalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));
    this.Renderer.DrawVerticalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));

    for (let graph_info of this.Graphs) {
      this.Renderer.DrawElement(graph_info.ElemId, DrawSpace.LOCAL, graph_info.Color);
    }

    // Draw mouse vertical line
    // this.DrawLinePixelSpace([10, 10], [200, 200]);
    let canvas_pos = this.Interaction.CurrentMousePos.canvas;
    this.Renderer.DrawVerticalLine(canvas_pos.x, DrawSpace.PIXEL,
                                   AllColors.Get("orange"));

    if (this._closest_point) {
      this.Renderer.DrawIcon(this._closest_point, DrawSpace.LOCAL, AllColors.Get("purple"));
    }
  }

  /*******************************************************
   * GETTERS
   *******************************************************/

  get Renderer() : InternalRendererInterface {
    return this._renderer;
  }

  get Interaction() : InteractionInterface {
    return this._interaction;
  }

  private get LabelManager() : LabelManagerInterface {
    return this._label_manager;
  }

  private get AxisManager() : AxisManagerInterface {
    return this._axis_manager;
  }

  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _colors: {[K:string]: Color};
  private _id: number;

  _closest_point: Vec2;

  _renderer: InternalRenderer;
  _interaction: Interaction;
  _label_manager: LabelManager;
  _axis_manager: AxisManager;

  _graphs: Array<GraphInfoInterface>;

  private _global_interaction_callback: (i: VisualizerInterface) => void;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {TimingVisualizer};
export {VisualizerInterface};
export default TimingVisualizer;
