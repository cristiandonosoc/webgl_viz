import {Bounds, Vec2} from "./vectors";
import {Color} from "./colors";

enum DrawSpace {
  LOCAL,
  PIXEL
}

interface RendererInterface {
  /* GETTERS / SETTERS */
  offset: Vec2;
  scale: Vec2;
  bounds: Bounds;
  readonly width: number;
  readonly height: number;
  readonly canvas: HTMLCanvasElement;

  /* MANAGING INTERFACE */
  AddGraph(points: number[]) : void;
  ResizeCanvas() : void;

  /* RENDERING INTERFACE */
  Clear(color: Color) : void;

  DrawGraph(space: DrawSpace, color: Color) : void;

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
export default RendererInterface;
