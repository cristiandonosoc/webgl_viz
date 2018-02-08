import {Color, AllColors} from "./colors"
import {Bounds, Vec2} from "./vectors";

import VisualizerInterface from "./visualizer_interface";
import GraphVisualizer from "./graph_visualizer"
import TimingVisualizer from "./timing_visualizer";

import {ZoomType, UIManagerSingleton} from "./ui_manager";
import {INFINITY} from "./helpers";

import {PDDataInterface} from "./data";
import DataLoaderInterface from "./data_loader_interface";
import VizLoader from "./viz_loader";
import JsonLoader from "./json_loader";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface PacketDapperVizInterface {
  /* ACTIONS */
  Start() : void;
  FrameLoop() : void;   /* Update + Draw */
  // Update() : void;
  // Draw() : void;

  LoadPDFile(content: string) : boolean;

  // Data Interface
  readonly Data: PDDataInterface;

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

  get Data() : PDDataInterface { return this._data; }

  get Colors() : any {
    return this._state.colors;
  }

  get Running() : boolean {
    return this._running;
  }

  get Bounds() :  Bounds {
    return this._state.bounds;
  }

  LoadPDFile(content: string) : boolean {
    // We load by priority
    let loaders = new Array<DataLoaderInterface>();
    loaders.push(new JsonLoader());
    loaders.push(new VizLoader());

    for (let loader of loaders) {
      console.log("Attemping to load with loader: ", loader.Name);
      let data = loader.ParseFile(content);
      if (data.Valid) {
        this._ProcessLoadedData(data);
        return true;
      }
      console.log("Failed to load with loader: ", loader.Name);
    }

    console.error("No valid loader found");
    return false;
  }

  private _ProcessLoadedData(data: PDDataInterface) : void {
    this._data = data;
    console.log(data);

    // We add the data to the visualizers
    for (let viz of this._visualizers) {
      viz.LoadData(this._data);
    }

    this.ApplyMaxBounds();

    UIManagerSingleton.SetupData(data);
  }

  // Applies the graph max bounds
  ApplyMaxBounds() : void {
    for (let viz of this._visualizers) {
      viz.ApplyMaxBounds();
    }
  }

  FrameLoop() : void {
    if (!this.Running) {
      return;
    }

    this.Update();
    // TODO(donosoc): Do it so that we only draw when needed, making components
    //                "dirty" the view.
    //                Right now we are always re-rendering
    this.Draw();
  }

  /*******************************************
   * DRAWING
   *******************************************/

  private Update() : void {
    if (this.Data.Dirty) {
      this._UpdateDirtyData();
      this.Data.Dirty = false;
    }
    UIManagerSingleton.Update();

    for (let viz of this._visualizers) {
      viz.Update();
    }
  }

  private _UpdateDirtyData() : void {
    for (let viz of this._visualizers) {
      viz.UpdateDirtyData(this.Data);
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
  private _data : PDDataInterface;
}

export {PacketDapperViz}
export {PacketDapperVizInterface};
export default PacketDapperVizInterface;
