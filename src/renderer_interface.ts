import {Bounds, Vec2} from "./vectors";
import {Color} from "./colors";

enum DrawSpace {
  LOCAL,
  PIXEL
}

/**
 * RendererElemId
 * --------------
 *
 * Identifies an element within the renderer.
 * The renderer will store the data needed to actually render the element
 * (VBO, etc).
 * This is used mainly for issuing the DrawCalls
 **/
interface RendererElemId {
  id: number;
}

interface RendererInterface {
  /* GETTERS / SETTERS */
  Offset: Vec2;
  Scale: Vec2;
  Bounds: Bounds;
  readonly Width: number;
  readonly Height: number;
  readonly Canvas: HTMLCanvasElement;

  /* MANAGING INTERFACE */
  AddGraph(points: number[]) : RendererElemId;
  ResizeCanvas() : void;

  /* RENDERING INTERFACE */
  Clear(color: Color) : void;

  DrawElement(id: RendererElemId, space: DrawSpace, color: Color) : void;

  DrawLine(p1: Vec2, p2: Vec2, space: DrawSpace, color: Color) : void;
  DrawHorizontalLine(y: number, space: DrawSpace, color: Color) : void;
  DrawVerticalLine(x: number, space: DrawSpace, color: Color) : void;

  DrawHorizontalRange(start: number, end: number, space: DrawSpace, color: Color) : void;
  DrawVerticalRange(start: number, end: number, space: DrawSpace, color: Color) : void;

  DrawBox(p1: Vec2, p2: Vec2, space: DrawSpace, color: Color) : void;

  DrawIcon(point: Vec2, space: DrawSpace, color: Color) : void;
}

export {DrawSpace};
export {RendererInterface};
export {RendererElemId};
export default RendererInterface;
