// import * as AllShaders from "./shaders.js";
import AllShaders from "./shaders";

console.log("VERTEX SHADER");
console.log(AllShaders.GetVertexShader("graph_line"));
console.log("FRAGMENT SHADER");
console.log("--------------");
console.log(AllShaders.GetFragmentShader("graph_line"));
console.log("--------------");
console.log("NULL SHADER");
console.log(AllShaders.GetFragmentShader("asdsad"));
