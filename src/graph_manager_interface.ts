import InteractionInterface from "./interaction_interface";
import {RendererElemId, RendererInterface} from "./renderer_interface";
import LabelManagerInterface from "./label_manager_interface";
import UIManagerInterface from "./ui_manager_interface";

import {Color} from "./colors";
import {Bounds} from "./vectors";

import {Vec2} from "./vectors";

/**
 * GraphInfo
 * ---------
 *
 * Represents the info of a graph
 **/
class GraphInfo {
  name = "";
  elem_id: RendererElemId;      // The points registered with the renderer
  points: Array<Vec2>;          // The points loaded and sorted (by X-axis)
  color: Color;                 // The color on which to render the graph
  bounds: Bounds;               // The max X and Y bounds of this graph
}

interface GraphManagerInterface {
  /* COMPONENTS */
  Interaction: InteractionInterface;
  Renderer: RendererInterface;
  LabelManager: LabelManagerInterface;
  UIManager: UIManagerInterface;

  /* STATE */
  Valid: boolean;
  readonly Graphs: Array<GraphInfo>;

  /* ACTIONS */
  FrameLoop() : void;   /* Update + Draw */
  // Update() : void;
  // Draw() : void;

  SetClosestPoint(point: Vec2) : void;
  // Resets the zoom to the containing bounds
  ApplyMaxBounds() : void;
}

export {GraphInfo};
export {GraphManagerInterface};
export default GraphManagerInterface;
