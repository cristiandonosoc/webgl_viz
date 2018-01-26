import {Bounds, Vec2} from "./vectors";
import {DrawSpace, RendererElemId, Renderer, RendererInterface} from "./renderer";
import {Interaction, InteractionInterface} from "./interaction";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {AllColors, Color} from "./colors";

import {GraphInfo, GraphInfoInterface} from "./graph_info";

import VisualizerInterface from "./visualizer_interface";

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class TimingVisualizer implements VisualizerInterface {

  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(container: HTMLElement) {
    let ctx = this;
    this._Setup(container, function (i: InteractionInterface) {
      ctx._InteractionCallback(i);
    });

  }

  private _Setup(container: HTMLElement, callback: (i: InteractionInterface) => void) {
    this._graphs = new Array<GraphInfoInterface>();
    this._renderer = new Renderer(container);
    this._interaction = new Interaction(this._renderer, callback);
    this._label_manager = new LabelManager(container, this, this._renderer);
    this._axis_manager = new AxisManager(container, this._renderer);
  }

  private _InteractionCallback(i: InteractionInterface) : void {

  }

  /*******************************************************
   * PUBLIC INTERFACE DATA
   *******************************************************/

  get Graphs() : Array<GraphInfoInterface> {
    return this._graphs;
  }

  Start() : void {
    this.Interaction.Start();
  }

  AddGraph(name: string, points: number[]) : void {
    // console.log("VISUALIZER ADDING: ",
    //             "NAME: ", name);


    // // TODO(donosoc): Give a correct color to the graph
    // let graph_info = new GraphInfo(name, points);
    // // TODO(donosoc): Verify that this is working as reference
    // this.Renderer.AddGraph(graph_info);
    // this._graphs.push(graph_info);
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
   * PRIVATE GETTERS
   *******************************************************/

  private get Renderer() : RendererInterface {
    return this._renderer;
  }

  private get Interaction() : InteractionInterface {
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

  _closest_point: Vec2;

  _renderer: Renderer;
  _interaction: Interaction;
  _label_manager: LabelManager;
  _axis_manager: AxisManager;

  _graphs: Array<GraphInfoInterface>;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {TimingVisualizer};
export {VisualizerInterface};
export default TimingVisualizer;
