import InteractionInterface from "./interaction_interface";
import RendererInterface from "./renderer_interface";
import LabelManagerInterface from "./label_manager_interface";

import {Vec2} from "./vectors";

interface GraphManagerInterface {
  /* COMPONENTS */
  Interaction: InteractionInterface;
  Renderer: RendererInterface;
  LabelManager: LabelManagerInterface;

  /* STATE */
  Valid: boolean;

  /* ACTIONS */
  Draw() : void;
  SetClosestPoint(point: Vec2) : void;
  // Resets the zoom to the containing bounds
  ApplyMaxBounds() : void;
}

export default GraphManagerInterface;
