import {Bounds, Vec2} from "./vectors";
import {DrawSpace, RendererElemId, InternalRenderer, InternalRendererInterface} from "./internal_renderer";
import {Interaction, InteractionInterface, InteractionEvents} from "./interaction";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {IdManager} from "./helpers";
import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {AllColors, Color} from "./colors";

import {GraphInfo, GraphInfoInterface} from "./graph_info";

import {VisualizerCallbackData, VisualizerInterface} from "./visualizer_interface";

import {PDDataInterface, PDMatchInterface, PDEntryInterface} from "./data";

import {INFINITY} from "./helpers";

import {VertexShaders, FragmentShaders} from "./shaders";

import {MousePosition} from "./mouse";

import * as Utils from "./visualizer_utils";

import {RendererLocalToCanvas} from "./transforms";

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class TimingVisualizer implements VisualizerInterface {

  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(container: HTMLElement) {
    this._id = IdManager.GetVisualizerId();

    let ctx = this;
    this._Setup(container, function(i: InteractionInterface, e: InteractionEvents) {
      ctx._InteractionCallback(i, e);
    });
  }

  private _Setup(container: HTMLElement,
                 callback: (i: InteractionInterface, e: InteractionEvents) => void) {
    this._renderer = new InternalRenderer(container);
    this._interaction = new Interaction(this._renderer, callback);
    this._label_manager = new LabelManager(container, this, this._renderer);
    this._axis_manager = new AxisManager(container, this._renderer);
    this._boxes = new Array<HTMLElement>();

    this._ResetRendererData();
  }

  private _ResetRendererData() : void {
    this.RemoveData();

    this._lines = new Array<GraphInfoInterface>();
    this._missing_lines = new Array<GraphInfoInterface>();

    this._points = new Array<GraphInfoInterface>();
    this._missing_points = new Array<GraphInfoInterface>();

    this._matches_points = new Array<Array<Vec2>>();

    this._match_index = -1;
    this._entry_index = -1;
  }

  private _InteractionCallback(i: InteractionInterface, e: InteractionEvents) : void {
    this.MousePos = i.MousePos;
    this.SetClosestPoint(this.MousePos.local);

    if (e == InteractionEvents.CLICK) {
      this._ProcessClick();
    } else if (e != InteractionEvents.MOVE) {
      this._ResetBoxes();
    }

    // We see if we have to call the program
    if (this._global_interaction_callback) {
      // We don't care about the entry index
      this._global_interaction_callback({
        Owner: this,
        Event: e,
        MousePos: this.MousePos,
        MatchIndex: this.MatchIndex
      });
    }

    return;
  }

  private _ResetBoxes() {
    // We remove all the boxes
    for (let box of this.Boxes) {
      box.remove();
    }
    this.Boxes.length = 0;
  }

  private _ProcessClick() : void {
    this._ResetBoxes();

    // We create boxes
    let elem = document.createElement("div");
    elem.classList.add("metadata");

    // We get the position
    let p = this.ClosestPoint;
    let canvas_pos = RendererLocalToCanvas(this.Renderer, p);
    let rect = this.Renderer.Canvas.getBoundingClientRect();
    let left = window.scrollX + rect.left + Math.floor(canvas_pos.x);
    let top = window.scrollY + rect.top + rect.height - Math.floor(canvas_pos.y);

    elem.style.left = `${left}px`;
    elem.style.top = `${top}px`;

    document.body.appendChild(elem);

    // We get the data
    let ul = elem.appendChild(document.createElement("ul"));



    this.Boxes.push(elem);

  }

  /*******************************************************
   * PUBLIC INTERFACE DATA
   *******************************************************/

  get MatchesPoints() : Array<Array<Vec2>> { return this._matches_points; }
  set MatchesPoints(m: Array<Array<Vec2>>) { this._matches_points = m; }

  get MousePos() : MousePosition { return this._mouse_pos; }
  set MousePos(pos: MousePosition) { this._mouse_pos = pos; }

  get MatchIndex() : number { return this._match_index; }
  set MatchIndex(i: number) { this._match_index = i; }

  get EntryIndex() : number { return this._entry_index; }
  set EntryIndex(i: number) { this._entry_index = i; }

  get ClosestPoint() : Vec2 { return this._closest_point; }
  set ClosestPoint(p: Vec2) { this._closest_point = p; }

  get Colors() : {[K:string]: Color} { return this._colors; }

  GetColor(key: string) : Color {
    return this._colors[key];
  }

  SetColor(key: string, color: Color) : boolean {
    this._colors[key] = color;
    return true;
  }

  get Heights() : Array<number> { return this._heights; }
  set Heights(h: Array<number>) { this._heights = h; }

  get Id() : number { return this._id; }

  SetGlobalInteractionCallback(callback: (d: VisualizerCallbackData) => void): void {
    this._global_interaction_callback = callback;
  }

  ReactToOtherVisualizer(data: VisualizerCallbackData) : void {
    this.MousePos = data.MousePos;

    if (data.Event == InteractionEvents.MOVE) {
      if (data.MatchIndex) {
        this.MatchIndex = data.MatchIndex;
      }
      return;
    } else if (data.Event == InteractionEvents.CLICK) {
      // this._ProcessClick();
    } else {
      this._ResetBoxes();
    }

    // We only care on obtaining the horizontal zoom
    let new_bounds = data.Owner.Renderer.Bounds.Copy();
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

  private get Data() : PDDataInterface { return this._data; }
  private set Data(data: PDDataInterface) { this._data = data; }

  private get Boxes() : Array<HTMLElement> { return this._boxes; }
  private set Boxes(b: Array<HTMLElement>) { this._boxes = b; }

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

  private _GenerateHeights(count: number) : Array<number> {
    let lower = -0.9;
    let top = 0.9;

    let diff = (top - lower) / (count - 1);

    let heights = new Array<number>();
    for (let i = 0; i < count; i++) {
      heights.push(lower + i * diff);
    }
    return heights;
  }

  LoadData(data: PDDataInterface) : void {
    this.Data = data;

    let lines = new Array<number>();
    let missing_lines = new Array<number>();
    let points = new Array<number>();
    let missing_points = new Array<number>();

    let matches_points = new Array<Array<Vec2>>();

    // We calculate the offsets for each capture
    let min_tsbase = Math.min(...data.TsBase);
    let base_offsets = data.TsBase.map(function(ts_base: number) {
      return ts_base - min_tsbase;
    });
    let offsets = data.Offsets;

    this.Heights = this._GenerateHeights(data.TsBase.length);

    for (let match of data.Matches) {
      let match_points = new Array<Vec2>();

      for (let i = 0; i < match.Entries.length - 1; i++) {
        // Setup entry variables references
        let from_entry = match.Entries[i];
        let to_entry = match.Entries[i+1];
        let from_offset = base_offsets[i] + offsets[i];
        let to_offset = base_offsets[i+1] + offsets[i+1];
        let from_height = this.Heights[i];
        let to_height = this.Heights[i+1];

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
            this._AddPoint(missing_points, match_points, x, this.Heights[j]);
            missing_lines.push(x, this.Heights[j]);
            missing_lines.push(x, this.Heights[j+1]);
          }

          // We update the loop to the correct index
          i = res.index - 1;  // Going to be updated by the for loop
          continue;
        }

        // We have a from packet, we see if there is a to
        if (to_entry.Missing) {
          this._AddPoint(points, match_points, from_x, from_height);

          // Get the following entry
          let res = this._GetLatestEntry(match, i + 1);
          if (res) {
            // We mark a line between those
            let res_x = base_offsets[res.index] + offsets[res.index] + res.entry.Value;
            missing_lines.push(from_x, from_height);
            missing_lines.push(res_x, this.Heights[res.index]);

            // We found the last entry of the list
            if (res.index == match.Entries.length - 1) {
              this._AddPoint(points, match_points, res_x, this.Heights[res.index]);
            }

            // We mark the points in between
            let dist = (res_x - from_x) / (res.index - i);
            for (let j = i + 1; j < res.index; j++) {
              let mx = from_x + dist * (j - i);
              this._AddPoint(missing_points, match_points, mx, this.Heights[j]);
            }

            // We update the loop to the correct index
            i = res.index - 1;  // Going to be updated by the for loop
            continue;
          }

          // If we don't find and index,
          // we mark the packet lost until the end
          missing_lines.push(from_x, from_height);
          missing_lines.push(from_x, this.Heights[this.Heights.length-1]);
          this._AddPoint(missing_points, match_points,
                         from_x, this.Heights[this.Heights.length-1]);

          // We mark the points in between
          for (let j = i + 1; j < this.Heights.length; j++) {
            this._AddPoint(missing_points, match_points, from_x, this.Heights[j]);
          }
          break;
        }

        // Now we can check the normal case, in which both points
        // are present
        // We add the line
        lines.push(from_x, from_height);
        lines.push(to_x, to_height);
        // We add the points
        this._AddPoint(points, match_points, from_x, from_height);
        this._AddPoint(points, match_points, to_x, to_height);
      }

      matches_points.push(match_points);
    }

    console.debug("LINES: ", lines);
    console.debug("MISSING LINES: ", missing_lines);
    console.debug("POINTS: ", points);
    console.debug("MISSING: ", missing_points);

    this._ResetRendererData();


    this.MatchesPoints = matches_points;

    // We create the graph info from the points
    this._CreateLinesGraphInfo(this.Lines, "lines", lines, AllColors.Get("yellow"));
    this._CreateLinesGraphInfo(this.MissingLines, "missing_lines",
                               missing_lines, AllColors.Get("red"));

    this._CreatePointsGraphInfo(this.Points, "points",
                                points, AllColors.Get("lightblue"));
    this._CreatePointsGraphInfo(this.MissingPoints, "missing",
                                missing_points, AllColors.Get("red"));
  }

  private _AddPoint(list: Array<number>, match_points: Array<Vec2>,
                    x: number, y: number) : void {
    list.push(x, y);
    match_points.push(new Vec2(x, y));
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
    if (this.MatchesPoints.length == 0) {
      return;
    }

    // We get the closest height
    this.MousePos.local;

    let h_index = 0;
    let abs = INFINITY;
    for (let i = 0; i < this.Heights.length; i++) {
      let h = this.Heights[i];
      let cur_abs = Math.abs(this.MousePos.local.y - h);
      if (cur_abs < abs) {
        abs = cur_abs;
        h_index = i;
      }
    }
    // We double it for the current wat MatchesPoints is created
    let array_index = 2 * h_index;
    if (h_index == this.Heights.length - 1) {
      array_index--;
    }

    let index = Utils.SearchForClosest(this.MatchesPoints,
        this.MousePos.local, function(a: Array<Vec2>) {
      return a[array_index];
    });

    this.ClosestPoint = this.MatchesPoints[index][array_index];
    this.MatchIndex = index;
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
        let end = this.Interaction.MousePos.canvas.x;
        this.Renderer.DrawVerticalRange(start, end, DrawSpace.PIXEL, drag_color);
      } else if (zoom == ZoomType.HORIZONTAL) {
        let start = this.Interaction.DownMousePos.canvas.y;
        let end = this.Interaction.MousePos.canvas.y;
        this.Renderer.DrawHorizontalRange(start, end, DrawSpace.PIXEL, drag_color);
      } else if (zoom == ZoomType.BOX) {
        let p1 = this.Interaction.DownMousePos.canvas;
        let p2 = this.Interaction.MousePos.canvas;
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

    // Draw the selected points
    if ((this.MatchIndex >= 0) &&
        (this.MatchIndex < this.MatchesPoints.length)) {
      let color = AllColors.Get("purple");
      let match_points = this.MatchesPoints[this.MatchIndex];
      let points = new Array<number>();
      for (let p of match_points) {
        points.push(p.x, p.y);
      }

      this.Renderer.DrawCustomPoints(points, DrawSpace.LOCAL, {
        Color: color,
        GLPrimitive: this.Renderer.GL.LINE_STRIP
      });
      for (let point of match_points) {
        this.Renderer.DrawIcon(point, DrawSpace.LOCAL, AllColors.Get("purple"));
      }
    }

    // Draw the closest point
    if (this.ClosestPoint) {
      this.Renderer.DrawIcon(this.ClosestPoint, DrawSpace.LOCAL,
        AllColors.Get("salmon"));
    }

    // Draw mouse vertical line
    if (this.MousePos) {
      let canvas_pos = this.MousePos.canvas;
      this.Renderer.DrawVerticalLine(canvas_pos.x, DrawSpace.PIXEL,
                                     AllColors.Get("orange"));
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


  private _closest_point: Vec2;
  private _match_index: number;
  private _entry_index: number;
  private _matches_points: Array<Array<Vec2>>;

  private _renderer: InternalRenderer;
  private _interaction: Interaction;
  private _label_manager: LabelManager;
  private _axis_manager: AxisManager;

  private _lines: Array<GraphInfoInterface>;
  private _points: Array<GraphInfoInterface>;
  private _missing_points: Array<GraphInfoInterface>;
  private _missing_lines: Array<GraphInfoInterface>;

  private _global_interaction_callback: (d: VisualizerCallbackData) => void;

  private _mouse_pos: MousePosition;

  private _data: PDDataInterface;
  private _boxes: Array<HTMLElement>;
  private _heights: Array<number>;
}

/**************************************************************************
 * EXPORTS
 **************************************************************************/

export {TimingVisualizer};
export {VisualizerInterface};
export default TimingVisualizer;
