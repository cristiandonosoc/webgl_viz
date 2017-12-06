import GraphManager from "./graph_manager"

// We "cast" the instance"
var canvas = <HTMLCanvasElement> document.getElementById("main-canvas");
var x_axis = <HTMLCanvasElement> document.getElementById("main-canvas-x-axis");
var y_axis = <HTMLCanvasElement> document.getElementById("main-canvas-y-axis");
var manager = new GraphManager(canvas, x_axis, y_axis);

// We add some points
// var size = 500;
// var positions = new Array(size);
// for (var i = 0; i < size; i += 2) {
//   // positions[i] = -1 + 2* (i/(size - 2));
//   // positions[i + 1] = 2 * Math.random() - 1;
//   var offset = -2 + 4 * (i / (size - 2));
//   positions[i] = offset;
//   positions[i + 1] = offset + 0.3 * Math.random(); - 0.15;
// }

import {GetPositions} from "./test_points";


// We set the controllers
document.getElementById("control-expand").addEventListener("click", (event) => {
  manager.ApplyMaxBounds();
  requestAnimationFrame(ProcessFrame);
});

document.getElementById("control-load-default-data").addEventListener("click", (event) => {
  let graphs = GetPositions();
  for (let graph of graphs) {
    manager.AddGraph(graph);
  }
  requestAnimationFrame(ProcessFrame);
});

document.getElementById("control-file").addEventListener("change", (event: any) => {
  console.log("Creating FileReader");
  let reader = new FileReader();
  reader.addEventListener("loadend", (event: any) => {
    console.log("Loaded file");
    manager.HandleDapFile(reader.result);
    console.log("Processed dap file");
    requestAnimationFrame(ProcessFrame);
  });
  reader.readAsText(event.target.files[0]);
});

function ProcessFrame(time: number) {
  manager.FrameLoop();
}

requestAnimationFrame(ProcessFrame);
