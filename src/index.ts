import GraphManager from "./graph_manager"

// We "cast" the instance"
var canvas = <HTMLCanvasElement> document.getElementById("main-canvas");
var manager = new GraphManager(canvas);

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

import positions from "./test_points";

// We add our positions
manager.AddGraph(positions);

// We set the controllers
document.getElementById("control-expand").addEventListener("click", (event) => {
  manager.ApplyMaxBounds();
  requestAnimationFrame(DrawScene);
});


// We create a fast "game-loop"
function DrawScene(time: number) {
  manager.Draw();
}



requestAnimationFrame(DrawScene);
