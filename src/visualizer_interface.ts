import {Vec2} from "./vectors";
import GraphInfoInterface from "./graph_info"

import InteractionInterface from "./interaction";
import InternalRendererInterface from "./internal_renderer";

interface VisualizerInterface {
  readonly Graphs: Array<GraphInfoInterface>;

  Start() : void;
  AddGraph(name: string, points: number[]) : void;
  Update() : void;
  Draw() : void;

  SetInteractionCallback(callback: (i: VisualizerInterface) => void) : void;
  ReactToOtherVisualizer(v: VisualizerInterface) : void;

  SetClosestPoint(point: Vec2) : void;
  ApplyMaxBounds() : void;

  // GETTERS
  readonly Id : number;
  readonly Interaction : InteractionInterface;
  readonly Renderer: InternalRendererInterface;
}

export {VisualizerInterface};
export default VisualizerInterface;
