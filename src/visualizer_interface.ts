import {Vec2} from "./vectors";
import GraphInfoInterface from "./graph_info"
import {Color} from "./colors";

import InteractionInterface from "./interaction";
import InternalRendererInterface from "./internal_renderer";

import {PDDataInterface} from "./data";

interface VisualizerInterface {
  readonly Graphs: Array<GraphInfoInterface>;

  Start() : void;

  LoadData(data: PDDataInterface) : void;

  RemoveData() : void;

  UpdateDirtyData(data: PDDataInterface) : void;
  Update() : void;
  Draw() : void;

  readonly Colors : { [K: string]: Color };
  GetColor(key: string) : Color;
  SetColor(key: string, color: Color) : boolean;

  // REACTION TO EVENTS
  SetGlobalInteractionCallback(callback: (i: VisualizerInterface) => void) : void;
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
