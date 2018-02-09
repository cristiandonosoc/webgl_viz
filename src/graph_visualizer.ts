import {IdManager, INFINITY} from "./helpers";
import {Bounds, Vec2} from "./vectors";
import {DrawSpace, RendererElemId, InternalRenderer, InternalRendererInterface} from "./internal_renderer";
import {Interaction, InteractionInterface, InteractionEvents} from "./interaction";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {AllColors, Color} from "./colors";

import {GraphInfo, GraphInfoInterface} from "./graph_info";

import {VisualizerCallbackData, VisualizerInterface} from "./visualizer_interface";

import {VertexShaders, FragmentShaders} from "./shaders";

import {PDDataInterface, PDMatchInterface} from "./data";

import {MousePosition} from "./mouse";

import * as Utils from "./visualizer_utils";

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class GraphVisualizer implements VisualizerInterface {

  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(container: HTMLElement) {
    this._id = IdManager.GetVisualizerId();
    let ctx = this;
    function int_callback(i: InteractionInterface, e: InteractionEvents) : void {
      ctx._InteractionCallback(i, e);
    }

    this._Setup(container, int_callback);
  }

  private _Setup(container: HTMLElement,
                 callback: (i: InteractionInterface, e: InteractionEvents) => void) {
    this._graphs = new Array<GraphInfoInterface>();
    this._missing_points = new Array<GraphInfoInterface>();
    this._closest_points = new Array<Vec2>();
    this._renderer = new InternalRenderer(container);
    this._interaction = new Interaction(this._renderer, callback);
    this._label_manager = new LabelManager(container, this, this._renderer);
    this._axis_manager = new AxisManager(container, this._renderer);
    this._colors = {};
  }

  private _InteractionCallback(i: InteractionInterface, e: InteractionEvents) {
    this.MousePos = i.CurrentMousePos;
    this.SetClosestPoint(this.MousePos.local);

    // We see if we have to call the program
    if (this._global_interaction_callback) {
      this._global_interaction_callback({
        Owner: this,
        Event: e,
        MousePos: this.MousePos,
        EntryIndex: this.ClosestIndex
      });
    }

    return;
  }

  /*******************************************************
   * PUBLIC INTERFACE DATA
   *******************************************************/

  get Colors() : {[K:string]: Color} { return this._colors; }

  get MousePos() : MousePosition { return this._mouse_pos; }
  set MousePos(pos: MousePosition) { this._mouse_pos = pos; }

  GetColor(key: string) : Color {
    return this._colors[key];
  }

  SetColor(key: string, color: Color) : boolean {
    this._colors[key] = color;
    return true;
  }

  get Id() : number { return this._id; }

  ReactToOtherVisualizer(data: VisualizerCallbackData) : void {
    this.MousePos = data.MousePos;

    if (data.Event == InteractionEvents.MOVE) {
      return;
    }

    // We only care on obtaining the horizontal zoom
    let new_bounds = data.Owner.Renderer.Bounds.Copy();
    new_bounds.y = this.Renderer.Bounds.y;

    this.Renderer.Bounds = new_bounds;
  }

  get Graphs() : Array<GraphInfoInterface> {
    return this._graphs;
  }

  get MissingPoints() : Array<GraphInfoInterface> {
    return this._missing_points;
  }

  get ClosestPoints() : Array<Vec2> {
    return this._closest_points;
  }

  get ClosestIndex() : number { return this._closest_index; }
  set ClosestIndex(i: number) { this._closest_index = i; }

  Start() : void {
    this.Interaction.Start();
  }

  private _GetLatestEntry(match: PDMatchInterface, start: number) {
    for (let i = start; i < match.Entries.length; i++) {
      let entry = match.Entries[i];
      if (!entry.Missing) {
        return { entry: entry, index: i }
      }
    }
    return undefined;
  }

  LoadData(data: PDDataInterface) : void {
    // We create the entries
    for (let i = 0; i < data.Names.length - 1; i++) {
      let name = `${data.Names[i]} -> ${data.Names[i+1]}`;
      let graph_info = new GraphInfo(name, AllColors.GetDefaultColor(i));
      // We add the shaders
      graph_info.VertexShader = VertexShaders.GRAPH;
      graph_info.FragmentShader = FragmentShaders.SIMPLE;
      graph_info.GLPrimitive = this.Renderer.GL.LINE_STRIP;
      graph_info.Context.u_point_size = 1;
      this.Graphs.push(graph_info);

      // We add the missing point
        // We create the missing point GraphInfo
      let mpi = new GraphInfo("Missing", AllColors.Get("red"));
      mpi.VertexShader = VertexShaders.GRAPH;
      mpi.FragmentShader = FragmentShaders.POINT_SPRITE;
      mpi.GLPrimitive = this.Renderer.GL.POINTS;
      mpi.Context.u_point_size = 7;
      this.MissingPoints.push(mpi);
    }


    let min_tsbase = Math.min(...data.TsBase);

    // We create the raw points for each graph
    for (let match of data.Matches) {

      let base_offset = data.TsBase[0] - min_tsbase;

      let res = this._GetLatestEntry(match, 0);
      if (!res) {
        throw "There should be an entry in a match";
      }
      let xbase = base_offset + res.entry.Value;

      for (let i = 0; i < match.Entries.length - 1; i++) {
        let from_entry = match.Entries[i];
        let to_entry = match.Entries[i+1];

        let points = this.Graphs[i].RawPoints;
        let missing_points = this.MissingPoints[i].RawPoints;

        if (from_entry.Missing || to_entry.Missing) {
          // We extend the previous point
          let y = points.length > 2 ? points[points.length - 1] : 0;
          points.push(xbase, y);
          missing_points.push(xbase, y);
          continue;
        }

        let y = to_entry.Value - from_entry.Value;
        points.push(xbase, y);
      }
    }

    // Now we can just post-process the points and
    // pass them on to the renderer
    this._UpdateOffsets(data);
    for (let graph_info of this.Graphs) {
      GraphVisualizer._ProcessGraphInfo(graph_info);
      this.Renderer.AddGraph(graph_info);
    }
    for (let point_info of this.MissingPoints) {
      this.Renderer.AddGraph(point_info);
    }

    console.log("GRAPHS: ", this.Graphs);
    console.log("MISSING POINTS: ", this.MissingPoints);
  }

  RemoveData() : void {
    throw "Not Implemented";
  }

  static _ProcessGraphInfo(graph_info: GraphInfoInterface) : void {
    let arr = new Array<Vec2>(graph_info.RawPoints.length / 2);
    let min = new Vec2(+INFINITY, +INFINITY);
    let max = new Vec2(-INFINITY, -INFINITY);
    for (let i = 0; i < arr.length; i += 1) {
      let point_index = i * 2;
      let p = new Vec2(graph_info.RawPoints[point_index],
                       graph_info.RawPoints[point_index + 1]);
      arr[i] = p;

      // We go by tracking the bounds
      if (p.x < min.x) { min.x = p.x; }
      if (p.x > max.x) { max.x = p.x; }
      if (p.y < min.y) { min.y = p.y; }
      if (p.y > max.y) { max.y = p.y; }
    }

    // We set the points
    graph_info.Points = arr;
    graph_info.Bounds = Bounds.FromPoints(min.x, max.x, min.y, max.y);

  }

  private _UpdateOffsets(data: PDDataInterface) : void {
    // We check for a change in the offsets
    let base_offset = data.Offsets[0];
    for (let i = 0; i < data.Offsets.length - 1; i++) {
      let from_offset = data.Offsets[i];
      let to_offset = data.Offsets[i+1];
      let offset_diff = to_offset - from_offset;

      let graph_info = this.Graphs[i];
      graph_info.Context.u_graph_offset = [base_offset, offset_diff]
      let mpi = this.MissingPoints[i];
      mpi.Context.u_graph_offset = [base_offset, offset_diff]
    }
  }

  SetClosestPoint(point: Vec2) {
    if (this.Graphs.length == 0) {
      return;
    }

    this.ClosestIndex = Utils.SearchForClosest(this.Graphs[0].Points,
      point, function(v: Vec2) : Vec2 {
      return v;
    })
    // We clear the array
    this.ClosestPoints.length = 0;

    // We add the closest points
    for (let graph_info of this.Graphs) {
      this.ClosestPoints.push(graph_info.Points[this.ClosestIndex]);
    }
  }

  ApplyMaxBounds() : void {
    this.Renderer.ApplyMaxBounds();
  }

  SetGlobalInteractionCallback(
    callback: (data: VisualizerCallbackData) => void) : void {
    this._global_interaction_callback = callback;
  }

  Update() : void {
    this.Renderer.ResizeCanvas();
    this.LabelManager.Update();
    this.AxisManager.Update();
  }

  UpdateDirtyData(data: PDDataInterface) : void {
    this._UpdateOffsets(data);
  }

  Draw() : void {
    let background_color = AllColors.Get("black");
    this.Renderer.Clear(background_color);

    this._DrawInteraction();
    this.LabelManager.Draw();

    // Draw x/y Axis
    this.AxisManager.Draw();

    this.Renderer.DrawHorizontalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));
    this.Renderer.DrawVerticalLine(0, DrawSpace.LOCAL, AllColors.Get("yellow"));

    // We draw the lines
    for (let graph_info of this.Graphs) {
      this.Renderer.DrawElement(graph_info, DrawSpace.LOCAL, graph_info.Color);
    }

    // We draw the missing points
    for (let point_info of this.MissingPoints) {
      this.Renderer.DrawIconElement(point_info, DrawSpace.LOCAL, point_info.Color);
    }

    // Draw the mouse
    if (this.MousePos) {
      let canvas_pos = this.MousePos.canvas;
      this.Renderer.DrawVerticalLine(canvas_pos.x, DrawSpace.PIXEL,
                                     AllColors.Get("orange"));
    }

    // We draw the points
    for (let point of this.ClosestPoints) {
      this.Renderer.DrawIcon(point, DrawSpace.LOCAL, AllColors.Get("purple"));
    }
  }

  private _DrawInteraction() : void {
    let drag_color = AllColors.Get("lightblue");
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

  private _closest_index: number;
  private _closest_points: Array<Vec2>;

  private _renderer: InternalRenderer;
  private _interaction: Interaction;
  private _label_manager: LabelManager;
  private _axis_manager: AxisManager;
  private _mouse_pos: MousePosition;

  private _graphs: Array<GraphInfoInterface>;
  private _missing_points: Array<GraphInfoInterface>;

  private _global_interaction_callback: (d: VisualizerCallbackData) => void;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {GraphVisualizer};
export {VisualizerInterface};
export default GraphVisualizer;
