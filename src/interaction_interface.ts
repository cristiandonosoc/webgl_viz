import {MouseButtons, MousePosition} from "./mouse";

interface InteractionInterface {

  ZoomDragging: boolean;

  /* MOUSE */
  // Current Mouse Position
  CurrentMousePos: MousePosition;
  // Current Button Pressed
  CurrentMouseButton: MouseButtons;

  // Last Position mouse was pressed
  DownMousePos: MousePosition;
  // Last Position the mouse was released
  UpMousePos: MousePosition;

  /* KEYS */
  CtrlPressed: boolean;
}

export default InteractionInterface;
