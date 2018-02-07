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

import {PDDataInterface, PDEntryInterface} from "./data";

import {INFINITY} from "./helpers";

import {VertexShaders, FragmentShaders} from "./shaders";

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
    this._renderer = new InternalRenderer(container);
    this._interaction = new Interaction(this._renderer, callback);
    this._label_manager = new LabelManager(container, this, this._renderer);
    this._axis_manager = new AxisManager(container, this._renderer);

    this._lines = new Array<GraphInfoInterface>();
    this._points = new Array<GraphInfoInterface>();
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
    return this._lines;
  }

  private get Lines() : Array<GraphInfoInterface> {
    return this._lines;
  }

  private get Points() : Array<GraphInfoInterface> {
    return this._points;
  }

  Start() : void {
    this.Interaction.Start();
  }

  LoadData(data: PDDataInterface) : void {
    // Setup the point containers
    let lines = new Array<number>();
    let points = new Array<number>();
    let missing = new Array<number>();

    // We calculate the offsets for each capture
    let min_tsbase = Math.min(...data.TsBase);
    let offsets = data.TsBase.map(function(ts_base: number) {
      return ts_base - min_tsbase;
    });

    let ybase = 0;
    let heights = new Array<number>();
    for (let i = 0; i < data.Names.length; i++) {
      heights.push(ybase + i * 0.2);
    }


    for (let match of data.Matches) {
      // We search for the first value we can see.
      // This variable is used to place a missed packet, which
      // we are going to mark at the level of the latest packet we've seen.
      // We have to search for the latest for the case where the first step
      // is lost
      let latest_entry : PDEntryInterface;
      let latest_offset = -1;
      for (let i = 0; i < match.Entries.length; i++) {
        let entry = match.Entries[i];
        if (!entry.Missing) {
          latest_entry = entry;
          latest_offset = offsets[i];
        }
      }
      if (latest_offset == -1) {
        throw "latest entry should never be undefined.";
      }

      for (let i = 0; i < match.Entries.length - 1; i++) {
        // We set up the variables
        let from_entry = match.Entries[i];
        let to_entry = match.Entries[i+1];
        let from_offset = offsets[i];
        let to_offset = offsets[i+1];
        let from_height = heights[i];
        let to_height = heights[i+1];

        if (from_entry.Missing) {
          // We mark a missing point at it's height
          missing.push(latest_offset + latest_entry.Value);
          missing.push(from_height);
          continue;
        }

        // We update the latest entry seen
        latest_entry = from_entry;
        latest_offset = from_offset;

        if (to_entry.Missing) {
          // We only put a single point here
          // The missing point will be added by the previous entry
          points.push(from_offset + from_entry.Value);
          points.push(from_height);

          // EXCEPTION: The latest point won't be checked,
          // so we need to check here to see if the latest point
          // was missing
          if (i == match.Entries.length - 1) {
            missing.push(latest_offset + latest_entry.Value);
            missing.push(to_height);
          }
          continue;
        }

        // Now we can check the normal case, in which both points
        // are present
        // We add the line
        lines.push(from_offset + from_entry.Value);
        lines.push(from_height);
        lines.push(to_offset + to_entry.Value);
        lines.push(to_height);
        // We add the points
        points.push(from_offset + from_entry.Value);
        points.push(from_height);
        points.push(to_offset + to_entry.Value);
        points.push(to_height);
      }
    }

    console.debug("LINES: ", lines);
    console.debug("POINTS: ", points);
    console.debug("MISSING: ", missing);

    // We create the graph info from the points
    this._CreateLinesGraphInfo("lines", lines, AllColors.Get("yellow"));
    this._CreatePointsGraphInfo("points", points, AllColors.Get("lightblue"));
    this._CreatePointsGraphInfo("missing", missing, AllColors.Get("red"));
    this._UpdateOffsets(data);
  }

  private _CreateLinesGraphInfo(name: string, points: Array<number>,
                                color: Color) {
    let graph_info = new GraphInfo(name, color);
    graph_info.RawPoints = points;
    graph_info.GLPrimitive = this.Renderer.GL.LINES;
    graph_info.VertexShader = VertexShaders.TIMING;
    graph_info.FragmentShader = FragmentShaders.SIMPLE;
    this.Renderer.AddGraph(graph_info);
    this._lines.push(graph_info);
  }

  private _CreatePointsGraphInfo(name: string, points: Array<number>,
                                 color: Color) {
    let graph_info = new GraphInfo(name, color);
    graph_info.RawPoints = points;
    graph_info.GLPrimitive = this.Renderer.GL.POINTS;
    graph_info.VertexShader = VertexShaders.TIMING;
    graph_info.FragmentShader = FragmentShaders.POINT_SPRITE;
    this.Renderer.AddGraph(graph_info);
    // this._lines.push(graph_info);
    this._points.push(graph_info);
  }

  private _UpdateOffsets(data: PDDataInterface) : void {
    // // We can pass the offset directly
    // let key = "a_offset_coord"
    // for (let graph_info of this.Lines) {
    //   this.Renderer.ModifyGraph(graph_info, key, data.Offsets);
    // }
    // for (let graph_info of this.Points) {
    //   this.Renderer.ModifyGraph(graph_info, key, data.Offsets);
    // }
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

  UpdateDirtyData(data: PDDataInterface) : void {
    this._UpdateOffsets(data);
  }

  Draw() : void {

    let background_color = AllColors.Get("black");
    let drag_color = AllColors.Get("lightblue");


    this.Renderer.Clear(AllColors.Get("black"));
    this.LabelManager.Draw();

    // TODO(donosoc): Un-duplicate this code (from other visualizers)
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

    // We render the lines
    for (let line_info of this.Lines) {
      this.Renderer.DrawElement(line_info, DrawSpace.LOCAL, line_info.Color);
    }

    // We render the points
    for (let point_info of this.Points) {
      this.Renderer.DrawIconElement(point_info, DrawSpace.LOCAL, point_info.Color);
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

  _lines: Array<GraphInfoInterface>;
  _points: Array<GraphInfoInterface>;

  private _global_interaction_callback: (i: VisualizerInterface) => void;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {TimingVisualizer};
export {VisualizerInterface};
export default TimingVisualizer;
