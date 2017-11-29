import Renderer from "./renderer";

function CanvasToLocal(dimensions: number[], offset: number[], scale: number[],
                              point: number[]) : number[] {

  // Local (variable space)
  // Convert from pixels to 0.0 -> 1.0
  var temp = [point[0] / dimensions[0],
              point[1] / dimensions[0]];
  temp = temp.map(i => (i * 2.0) - 1.0);

  // De-apply offset and scale
  var local = [(temp[0] - offset[0]) / scale[0],
               (temp[1] + offset[1]) / scale[1]];
  return local;
};

function RendererCanvasToLocal(renderer: Renderer, point: number[]) : number[] {
  var dimensions = [renderer.gl.canvas.width,
                    renderer.gl.canvas.height];
  var offset = renderer.state.offset;
  var scale = renderer.state.scale;
  return CanvasToLocal(dimensions, offset, scale, point);
}

export {CanvasToLocal}
export {RendererCanvasToLocal}
