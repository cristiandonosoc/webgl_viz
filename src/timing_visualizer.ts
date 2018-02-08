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

import {PDDataInterface, PDMatchInterface, PDEntryInterface} from "./data";

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

    this._ResetRendererData();
  }

  private _ResetRendererData() : void {
    this.RemoveData();

    this._lines = new Array<GraphInfoInterface>();
    this._missing_lines = new Array<GraphInfoInterface>();

    this._points = new Array<GraphInfoInterface>();
    this._missing_points = new Array<GraphInfoInterface>();
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

  private get MissingLines() : Array<GraphInfoInterface> {
    return this._missing_lines;
  }

  private get Points() : Array<GraphInfoInterface> {
    return this._points;
  }

  private get MissingPoints() : Array<GraphInfoInterface> {
    return this._missing_points;
  }

  Start() : void {
    this.Interaction.Start();
  }

  RemoveData() : void {
    let elems = [this.Lines,
                 this.MissingLines,
                 this.Points,
                 this.MissingPoints];
    for (let elem of elems) {
      if (elem) {
        for (let g of elem) {
          this.Renderer.RemoveGraph(g);
        }
      }
    }
  }

  LoadData(data: PDDataInterface) : void {
    let lines = new Array<number>();
    let missing_lines = new Array<number>();
    let points = new Array<number>();
    let missing_points = new Array<number>();

    // We calculate the offsets for each capture
    let min_tsbase = Math.min(...data.TsBase);
    let base_offsets = data.TsBase.map(function(ts_base: number) {
      return ts_base - min_tsbase;
    });
    let offsets = data.Offsets;

    // Initialize elements
    let ybase = 0;
    let heights = new Array<number>();
    for (let i = 0; i < data.Names.length; i++) {
      heights.push(ybase + i * 0.2);
    }

    for (let match of data.Matches) {
      for (let i = 0; i < match.Entries.length - 1; i++) {
        // Setup entry variables references
        let from_entry = match.Entries[i];
        let to_entry = match.Entries[i+1];
        let from_offset = base_offsets[i] + offsets[i];
        let to_offset = base_offsets[i+1] + offsets[i+1];
        let from_height = heights[i];
        let to_height = heights[i+1];

        let from_x = from_offset + from_entry.Value;
        let to_x = to_offset + to_entry.Value;

        // If the first packet is missing
        if (from_entry.Missing) {
          if (i != 0) {
            throw "Missing from should be accounted for!";
          }

          // We mark the packet lost at the height of the latest
          // packet seen
          let res = this._GetLatestEntry(match, 1);
          if (!res) {
            console.error(match);
            throw "Match doesn't have any match";
          }

          // We add the missing points and lines
          let x = base_offsets[res.index] + offsets[res.index] + res.entry.Value;
          for (let j = 0; j < res.index; j++) {
            missing_points.push(x, heights[j]);
            missing_lines.push(x, heights[j]);
            missing_lines.push(x, heights[j+1]);
          }

          // We update the loop to the correct index
          i = res.index - 1;  // Going to be updated by the for loop
          continue;
        }

        // We have a from packet, we see if there is a to
        if (to_entry.Missing) {
          points.push(from_x, from_height);

          // Get the following entry
          let res = this._GetLatestEntry(match, i + 1);
          if (res) {
            // We mark a line between those
            let res_x = base_offsets[res.index] + offsets[res.index] + res.entry.Value;
            missing_lines.push(from_x, from_height);
            missing_lines.push(res_x, heights[res.index]);

            // We found the last entry of the list
            if (res.index == match.Entries.length - 1) {
              points.push(res_x, heights[res.index]);
            }

            // We mark the points in between
            let dist = (res_x - from_x) / (res.index - i);
            for (let j = i + 1; j < res.index; j++) {
              let mx = from_x + dist * (j - i);
              missing_points.push(mx, heights[j]);
            }

            // We update the loop to the correct index
            i = res.index - 1;  // Going to be updated by the for loop
            continue;
          }

          // If we don't find and index,
          // we mark the packet lost until the end
          missing_lines.push(from_x, from_height);
          missing_lines.push(from_x, heights[heights.length-1]);
          missing_points.push(from_x, heights[heights.length-1]);

          // We mark the points in between
          for (let j = i + 1; j < heights.length; j++) {
            missing_points.push(from_x, heights[j]);
          }


          break;
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
    console.debug("MISSING LINES: ", missing_lines);
    console.debug("POINTS: ", points);
    console.debug("MISSING: ", missing_points);

    this._ResetRendererData();

    // We create the graph info from the points
    this._CreateLinesGraphInfo(this.Lines, "lines", lines, AllColors.Get("yellow"));
    this._CreateLinesGraphInfo(this.MissingLines, "missing_lines",
                               missing_lines, AllColors.Get("red"));

    this._CreatePointsGraphInfo(this.Points, "points",
                                points, AllColors.Get("lightblue"));
    this._CreatePointsGraphInfo(this.MissingPoints, "missing",
                                missing_points, AllColors.Get("red"));
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

  private _CreateLinesGraphInfo(list: Array<GraphInfoInterface>,
                                name: string,
                                points: Array<number>,
                                color: Color) {
    let graph_info = new GraphInfo(name, color);
    graph_info.RawPoints = points;
    graph_info.GLPrimitive = this.Renderer.GL.LINES;
    graph_info.VertexShader = VertexShaders.TIMING;
    graph_info.FragmentShader = FragmentShaders.SIMPLE;
    this.Renderer.AddGraph(graph_info);
    list.push(graph_info);
  }

  private _CreatePointsGraphInfo(list: Array<GraphInfoInterface>,
                                 name: string,
                                 points: Array<number>,
                                 color: Color) {
    let graph_info = new GraphInfo(name, color);
    graph_info.RawPoints = points;
    graph_info.GLPrimitive = this.Renderer.GL.POINTS;
    graph_info.VertexShader = VertexShaders.TIMING;
    graph_info.FragmentShader = FragmentShaders.POINT_SPRITE;
    this.Renderer.AddGraph(graph_info);
    // this._lines.push(graph_info);
    list.push(graph_info);
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
    // We recreate the data
    this.LoadData(data);
    return;
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

    for (let line_info of this.MissingLines) {
      this.Renderer.DrawElement(line_info, DrawSpace.LOCAL, line_info.Color);
    }

    // We render the points
    for (let point_info of this.Points) {
      this.Renderer.DrawIconElement(point_info, DrawSpace.LOCAL, point_info.Color);
    }

    for (let point_info of this.MissingPoints) {
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
  _missing_points: Array<GraphInfoInterface>;
  _missing_lines: Array<GraphInfoInterface>;

  private _global_interaction_callback: (i: VisualizerInterface) => void;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {TimingVisualizer};
export {VisualizerInterface};
export default TimingVisualizer;
