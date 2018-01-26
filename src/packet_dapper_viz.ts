import {Color, AllColors} from "./colors"
import {Interaction, InteractionInterface} from "./interaction";
import {Bounds, Vec2} from "./vectors";

import {DrawSpace, RendererElemId, Renderer, RendererInterface} from "./renderer";
import {LabelManager, LabelManagerInterface} from "./label_manager";
import {AxisManager, AxisManagerInterface} from "./axis_manager";

import {Visualizer, VisualizerInterface} from "./visualizer";

// import {ZoomType, UIManager, UIManagerInterface} from "./ui_manager";
import {ZoomType, UIManagerSingleton} from "./ui_manager";

import {GetCanvasChildByClass} from "./helpers";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface PacketDapperVizInterface {
  /* STATE */
  Valid: boolean;

  /* ACTIONS */
  FrameLoop() : void;   /* Update + Draw */
  // Update() : void;
  // Draw() : void;

  SetClosestPoint(point: Vec2) : void;
  // Resets the zoom to the containing bounds
  ApplyMaxBounds() : void;
}


/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

let g_inf = 9007199254740991;


class CanvasHolder {
  renderer: Renderer;
  interaction: Interaction;
  label_manager: LabelManager;
  axis_manager: AxisManager;
}

class PacketDapperViz implements PacketDapperVizInterface {
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(graph_canvas_container: HTMLElement,
              timing_canvas_container: HTMLElement) {
    this._SetupState();

    // Create visualizers
    this._visualizers.push(new Visualizer(graph_canvas_container));
  }

  private _SetupState() {

    let graph_colors = new Array<Color>();
    graph_colors.push(AllColors.Get("deeppink"));
    graph_colors.push(AllColors.Get("cyan"));
    graph_colors.push(AllColors.Get("midnightblue"));
    graph_colors.push(AllColors.Get("white"));
    graph_colors.push(AllColors.Get("orange"));

    this._state = {
      colors: {
        background_color: AllColors.Get("black"),
        drag_color: AllColors.Get("lightblue"),
        graph_colors: graph_colors,
      },
      bounds: Bounds.FromPoints(-1, 1, -1, 1),
    };

    this._visualizers = new Array<VisualizerInterface>();
  }

  /*******************************************************
   * GETTERS / SETTERS
   *******************************************************/

  get Colors() : any {
    return this._state.colors;
  }

  get Valid() : boolean {
    return false;
  }

  get Bounds() :  Bounds {
    return this._state.bounds;
  }

  HandleDapFile = (content: string) => {
    // We split into lines
    let lines = content.split("\n");
    console.info("Read %d lines", lines.length);

    // We count how many graphs
    let first_line = lines[0];
    if (first_line.lastIndexOf("TSBASE", 0) != 0) {
      throw "Invalid file";
    }

    // We get the base times for each pcap
    let first_split = first_line.split(" ");
    let base = new Array<number>();
    for (var j = 1; j < first_split.length; j += 1) {
      base.push(parseFloat(first_split[j]));
    }


    // We go over the lines
    let graphs = new Array<Array<number>>(base.length);
    for (var i = 0; i < graphs.length; i += 1) {
      graphs[i] = new Array<number>();
    }

    let limit = 40;
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      if (line.lastIndexOf("TSBASE", 0) === 0) {
        console.info("Skipping: %s", line);
        continue;
      }
      if (line.lastIndexOf("OFFST", 0) === 0) {
        console.info("Skipping: %s", line);
        continue;
      }

      let split = line.split(" ");
      let tokens = split.slice(3, split.length);
      if (tokens.length != base.length) {
        console.error("Wrongly formatted line");
        continue;
      }

      // We add the graphs
      let parsed = tokens.map(function(i: string) : number {
        return parseFloat(i);
      });
      for (var j = 0; j < tokens.length - 1; j += 1) {
        graphs[j].push(parsed[j]);
        graphs[j].push(parsed[j + 1] - parsed[j]);
      }
      graphs[graphs.length - 1].push(parsed[0]);
      graphs[graphs.length - 1].push(parsed[parsed.length - 1] - parsed[0]);
    }

    for (var i = 0; i < graphs.length; i += 1) {
      let name = `Graph ${i}`;
      let graph_points = graphs[i];
      this.AddGraph(name, graph_points);
    }
  }

  AddGraph(name: string, points: number[]) : void {
    for (let viz of this._visualizers) {
      viz.AddGraph(name, points);
      viz.ApplyMaxBounds();
    }
  }

  // Applies the graph max bounds
  ApplyMaxBounds() : void {
    for (let canvas_holder of this._canvases) {
      // We want a copy, not a reference
      canvas_holder.renderer.Bounds = this.Bounds.Copy();
    }
  }

  FrameLoop() : void {
    this.Update();
    // TODO(donosoc): Do it so that we only draw when needed, making components
    //                "dirty" the view.
    //                Right now we are always re-rendering (~60 FPS)
    this.Draw();
  }

  /*******************************************
   * DRAWING
   *******************************************/

  private Update() : void {
    UIManagerSingleton.Update();

    for (let viz of this._visualizers) {
      viz.Update();
    }
  }

  private Draw() : void {
    if (!this.Valid) {
      return;
    }

    for (let viz of this._visualizers) {
      viz.Draw();
    }
  }


  SetClosestPoint(pos: Vec2) : void {
    for (let viz of this._visualizers) {
      viz.SetClosestPoint(pos);
    }
  }

  /********************************************************************
   * PRIVATE METHODS
   ********************************************************************/

  // Get a bounds that will be trivially changed in max comparisons
  private _GetMinBounds() : Bounds {
    return Bounds.FromPoints(+g_inf, -g_inf, +g_inf, -g_inf);
  }


  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _canvases: Array<CanvasHolder>;

  // private _renderer: Renderer;            // Manages WebGL rendering
  // private _interaction: Interaction;      // Manages interaction with browser (mostly mouse)
  // private _label_manager: LabelManager;   // Manages interaction with DOM
  // private _axis_manager: AxisManager;     // Manages axis and scales

  // Internal state of the renderer
  private _state: {
    colors: {
      background_color: Color,
      drag_color: Color,
      graph_colors: Array<Color>,
    },
    bounds: Bounds,                       // The containing bounds of all the graphs
    closest_point?: Vec2,                 // The closest point to the mouse (x-wise)
  };


  private _visualizers: Array<VisualizerInterface>;

  private _timing_renderer: Renderer;

  private _canvas_holders: Array<CanvasHolder>;
}

export {PacketDapperViz}
export {PacketDapperVizInterface};
export default PacketDapperVizInterface;
