import {Color, AllColors} from "./colors"
import {Bounds, Vec2} from "./vectors";

import VisualizerInterface from "./visualizer_interface";
import GraphVisualizer from "./graph_visualizer"
import TimingVisualizer from "./timing_visualizer";

import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {INFINITY} from "./helpers";

import {DataLoader} from "./data_loader";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface PacketDapperVizInterface {
  /* ACTIONS */
  Start() : void;
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

class PacketDapperViz implements PacketDapperVizInterface {
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/

  constructor(graph_canvas_container: HTMLElement,
              timing_canvas_container: HTMLElement) {
    this._SetupState();

    let ctx = this;
    function viz_callback(v: VisualizerInterface) : void {
      ctx._VisualizerInteractionCallback(v);
    }

    // Create visualizers
    //
    this._visualizers.push(new GraphVisualizer(graph_canvas_container, viz_callback));
    this._visualizers.push(new TimingVisualizer(timing_canvas_container, viz_callback));
    console.log("LOADED VISUALIZERS");
  }

  private _VisualizerInteractionCallback(v: VisualizerInterface) : void {
    for (let viz of this._visualizers) {
      if (viz.Id != v.Id) {
        viz.ReactToOtherVisualizer(v);
      }
    }
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
    this._running = false;
  }

  /*******************************************************
   * PUBLIC INTERFACE
   *******************************************************/

  Start() : void {
    this._running = true;
    for (let viz of this._visualizers) {
      viz.Start();
    }
  }

  get Colors() : any {
    return this._state.colors;
  }

  get Running() : boolean {
    return this._running;
  }

  get Bounds() :  Bounds {
    return this._state.bounds;
  }

  HandleDapFile = (content: string) => {


    let a = new DataLoader();
    a.ParseFile("test", content);


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
    }

    this.ApplyMaxBounds();
  }

  // Applies the graph max bounds
  ApplyMaxBounds() : void {
    for (let viz of this._visualizers) {
      viz.ApplyMaxBounds();
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
    if (!this.Running) {
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
    return Bounds.FromPoints(+INFINITY, -INFINITY, +INFINITY, -INFINITY);
  }

  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _running: boolean;

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
}

export {PacketDapperViz}
export {PacketDapperVizInterface};
export default PacketDapperVizInterface;
