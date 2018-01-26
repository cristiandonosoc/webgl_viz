import {Vec2} from "./vectors";
import GraphInfoInterface from "./graph_info"

interface VisualizerInterface {
  readonly Graphs: Array<GraphInfoInterface>;

  Start() : void;
  AddGraph(name: string, points: number[]) : void;
  Update() : void;
  Draw() : void;

  SetClosestPoint(point: Vec2) : void;
  ApplyMaxBounds() : void;
}

export {VisualizerInterface};
export default VisualizerInterface;
