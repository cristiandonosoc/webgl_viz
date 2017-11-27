// import * as AllShaders from "./shaders.js";
import AllShaders from "./shaders";
import GraphRenderer from "./graph_renderer"

// We "cast" the instance"
var canvas = <HTMLCanvasElement> document.getElementById("main-canvas");
var renderer = new GraphRenderer(canvas);

// We add some points
var size = 500;
var positions = new Array(size);
for (var i = 0; i < size; i += 2) {
  // positions[i] = -1 + 2* (i/(size - 2));
  // positions[i + 1] = 2 * Math.random() - 1;
  var offset = -2 + 4 * (i / (size - 2));
  positions[i] = offset;
  positions[i + 1] = offset + 0.3 * Math.random(); - 0.15;
}

// We add our positions
renderer.AddPoints(positions);

// We create a fast "game-loop"
function DrawScene(time: any) {
  renderer.Draw();
  requestAnimationFrame(DrawScene);
}

requestAnimationFrame(DrawScene);
