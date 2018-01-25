import {PacketDapperViz} from "./packet_dapper_viz"

// We "cast" the instance"

var canvas = <HTMLCanvasElement> document.getElementById("graph-canvas");
var x_axis = <HTMLCanvasElement> document.getElementById("graph-canvas-x-axis");
var y_axis = <HTMLCanvasElement> document.getElementById("graph-canvas-y-axis");
var labels = <HTMLCanvasElement> document.getElementById("graph-canvas-labels");

let graph_canvas_container = <HTMLElement> document.getElementById("graph-canvas-container");
let timing_canvas_container = <HTMLElement> document.getElementById("timing-canvas-container");

var manager = new PacketDapperViz(graph_canvas_container, timing_canvas_container);

import {GetPositions} from "./test_points";

// We set the controllers
document.getElementById("control-expand").addEventListener("click", (event) => {
  manager.ApplyMaxBounds();
  requestAnimationFrame(ProcessFrame);
});

document.getElementById("control-load-default-data").addEventListener("click", (event) => {
  let graphs = GetPositions();
  for (var i = 0; i < graphs.length; i += 1) {
    let name = `Graph ${i}`;
    let graph = graphs[i];
    manager.AddGraph(name, graph);
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
  requestAnimationFrame(ProcessFrame);
}

requestAnimationFrame(ProcessFrame);
