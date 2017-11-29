import {Renderer} from "./renderer";
import {Bounds, Vec2} from "./vectors";

/* Canvas -> Local */

function CanvasToLocal(dimensions: Vec2, offset: Vec2, scale: Vec2,
                       point: Vec2) : Vec2 {

  // Local (variable space)
  // Convert from pixels to 0.0 -> 1.0
  var temp = [point.x / dimensions.x,
              point.y / dimensions.y];
  temp = temp.map(i => (i * 2.0) - 1.0);

  // De-apply offset and scale
  var local = new Vec2((temp[0] - offset.x) / scale.x,
                       (temp[1] - offset.y) / scale.y);
  return local;
};

function RendererCanvasToLocal(renderer: Renderer, point: Vec2) : Vec2 {
  var dimensions = new Vec2(renderer.gl.canvas.width,
                            renderer.gl.canvas.height);
  var offset = renderer.offset;
  var scale = renderer.scale;
  return CanvasToLocal(dimensions, offset, scale, point);
}

/* Local -> Canvas */

function LocalToCanvas(dimensions: Vec2, offset: Vec2, scale: Vec2,
                       point: Vec2) : Vec2 {
  // Re-apply offset and scale
  var temp = [(point.x * scale.x) + offset.x,
              (point.y * scale.y) + offset.y];
  // [-1, -1] -> [0, 1]
  temp = temp.map(i => (i + 1.0) / 2.0);

  // Multiply by the dimensions
  var canvas_pos = new Vec2(temp[0] * dimensions.x,
                            temp[1] * dimensions.y);
  return canvas_pos;
}

function RendererLocalToCanvas(renderer: Renderer, point: Vec2) : Vec2 {
  var dimensions = new Vec2(renderer.gl.canvas.width,
                            renderer.gl.canvas.height);
  var offset = renderer.offset;
  var scale = renderer.scale;
  return LocalToCanvas(dimensions, offset, scale, point);
}

function RendererCalculateBounds(renderer: Renderer) : Bounds {
  // We transform the points
  // bottom-left
  let tbl = RendererCanvasToLocal(renderer, new Vec2(0, 0));
  // top-right
  let tr = new Vec2(renderer.gl.canvas.width, renderer.gl.canvas.height);
  let ttr = RendererCanvasToLocal(renderer, tr);

  return Bounds.FromPoints(tbl.x, ttr.x, tbl.y, ttr.y);
}

export {CanvasToLocal}
export {RendererCanvasToLocal}
export {LocalToCanvas}
export {RendererLocalToCanvas}
export {RendererCalculateBounds}
