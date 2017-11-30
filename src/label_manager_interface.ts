enum ZoomType {
  VERTICAL,
  HORIZONTAL,
  BOX,
  NONE

}

interface LabelManagerInterface {
  Zoom: ZoomType;

  /* ACTIONS */
  Update() : void;
  Draw() : void;
}

export {ZoomType}
export {LabelManagerInterface}
export default LabelManagerInterface
