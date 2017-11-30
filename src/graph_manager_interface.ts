import InteractionInterface from "./interaction_interface";
import RendererInterface from "./renderer_interface";
import LabelManagerInterface from "./label_manager_interface";

import {Vec2} from "./vectors";

interface GraphManagerInterface {
  /* COMPONENTS */
  interaction: InteractionInterface;
  renderer: RendererInterface;
  label_manager: LabelManagerInterface;

  /* STATE */
  Valid: boolean;

  /* ACTIONS */
  Draw() : void;
  SetClosestPoint(point: Vec2) : void;
  // Resets the zoom to the containing bounds
  ApplyMaxBounds() : void;
}

export default GraphManagerInterface;
