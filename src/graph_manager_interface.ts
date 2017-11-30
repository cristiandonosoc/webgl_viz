import InteractionInterface from "./interaction_interface";
import RendererInterface from "./renderer_interface";
import LabelManager from "./label_manager";

import {Vec2} from "./vectors";

interface GraphManagerInterface {
  /* COMPONENTS */
  interaction: InteractionInterface;
  renderer: RendererInterface;
  label_manager: LabelManager;

  /* STATE */
  Valid: boolean;

  /* ACTIONS */
  Draw() : void;
  SetClosestPoint(point: Vec2) : void;
  // Resets the zoom to the containing bounds
  ApplyMaxBounds() : void;
}

export default GraphManagerInterface;
