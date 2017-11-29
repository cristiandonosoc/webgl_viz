import Renderer from "./renderer";

/* Canvas -> Local */

function CanvasToLocal(dimensions: number[], offset: number[], scale: number[],
                              point: number[]) : number[] {

  // Local (variable space)
  // Convert from pixels to 0.0 -> 1.0
  var temp = [point[0] / dimensions[0],
              point[1] / dimensions[1]];
  temp = temp.map(i => (i * 2.0) - 1.0);

  // De-apply offset and scale
  var local = [(temp[0] - offset[0]) / scale[0],
               (temp[1] - offset[1]) / scale[1]];
  return local;
};

function RendererCanvasToLocal(renderer: Renderer, point: number[]) : number[] {
  var dimensions = [renderer.gl.canvas.width,
                    renderer.gl.canvas.height];
  var offset = renderer.state.offset;
  var scale = renderer.state.scale;
  return CanvasToLocal(dimensions, offset, scale, point);
}

/* Local -> Canvas */

function LocalToCanvas(dimensions: number[], offset: number[], scale: number[], point: number[]) : number[] {
  // Re-apply offset and scale
  var temp = [(point[0] * scale[0]) + offset[0],
              (point[1] * scale[1]) + offset[1]];
  // [-1, -1] -> [0, 1]
  temp = temp.map(i => (i + 1.0) / 2.0);

  // Multiply by the dimensions
  var canvas_pos = [temp[0] * dimensions[0],
                    temp[1] * dimensions[1]];
  return canvas_pos;
}

function RendererLocalToCanvas(renderer: Renderer, point: number[]) : number[] {
  var dimensions = [renderer.gl.canvas.width,
                    renderer.gl.canvas.height];
  var offset = renderer.state.offset;
  var scale = renderer.state.scale;
  return LocalToCanvas(dimensions, offset, scale, point);
}

export {CanvasToLocal}
export {RendererCanvasToLocal}
export {LocalToCanvas}
export {RendererLocalToCanvas}
