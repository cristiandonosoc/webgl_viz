enum ZoomType {
  NONE,
  VERTICAL,
  HORIZONTAL,
  BOX
}

interface UIManagerInterface {
  Zoom: ZoomType;


  /* ACTIONS */
  Update() : void;
  Draw() : void;
}

export {ZoomType}
export {UIManagerInterface}
export default UIManagerInterface;
