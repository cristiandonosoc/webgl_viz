let line_vs = `#version 300 es

in vec4 a_position;

uniform mat3 u_matrix;

uniform vec2 u_offset;
uniform vec2 u_scale;

void main() {
  // Multiply the position of the matrix
  // gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);
  gl_Position = vec4(a_position.x + u_offset.x,
                     a_position.y + u_offset.y,
                     0, 1);
}
`;

let line_fs = `#version 300 es
precision mediump float;

uniform vec4 u_color;

out vec4 out_color;

void main() {
  out_color = u_color;
}
`;

var program_state = {
  clear_color: [0, 0, 0, 1],
  offset: [0, 0],
  scale: [0, 0],
  canvas: {
    size: [0, 0]
  },
  mouse: {
    drag_active: false,
    pos: [null, null]
  }
};

function ClearCanvas(gl, color_array) {
  gl.clearColor(color_array[0],
                color_array[1],
                color_array[2],
                1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function UpdateLabels() {
  offsetX = document.getElementById("offset-x");
  offsetX.value = program_state.offset[0];
  offsetY = document.getElementById("offset-y");
  offsetY.value = program_state.offset[1];
}

function Main(canvas) {
  // Get a WebGL context
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    console.log("No webgl2 context. Exiting.");
    return;
  }

  // We resize the canvas
  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  program_state.canvas.size = [gl.canvas.width, gl.canvas.height];

  // We clear the background
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Setup a GLSL program
  var program = webglUtils.createProgramFromSources(gl, [line_vs, line_fs]);

  // Lookup where the vertex data needs to go
  var pos_attrib_loc = gl.getAttribLocation(program, "a_position");

  // Lookup uniforms
  var color_loc = gl.getUniformLocation(program, "u_color");
  var matrix_loc = gl.getUniformLocation(program, "u_matrix");

  var offset_loc = gl.getUniformLocation(program, "u_offset");
  var scale_loc = gl.getUniformLocation(program, "u_scale");

  // Create a buffer and put 2 points on it
  var pos_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);


  var size = 500;
  var positions = new Array(size);
  for (var i = 0; i < size; i += 2) {
    // positions[i] = -1 + 2* (i/(size - 2));
    // positions[i + 1] = 2 * Math.random() - 1;
    offset = -2 + 4 * (i / (size - 2));
    positions[i] = offset;
    positions[i + 1] = offset + 0.3 * Math.random(); - 0.15;
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a Vertex Array Object
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // Turn on the attribute
  gl.enableVertexAttribArray(pos_attrib_loc);
  var vao_size = 2;
  var vao_type = gl.FLOAT;
  var vao_normalize = false;
  var vao_stride = 0;
  var vao_offset = 0;
  gl.vertexAttribPointer(pos_attrib_loc, vao_size, vao_type,
    vao_normalize, vao_stride, vao_offset);

  gl.useProgram(program);
  gl.bindVertexArray(vao);


  gl.uniform4fv(color_loc, [1, 1, 0, 1]);


  requestAnimationFrame(drawScene);

  function drawScene(now) {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    ClearCanvas(gl, program_state.clear_color);
    UpdateLabels();

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    // Set the rotation matrix
    var matrix = m3.rotation(now);
    gl.uniformMatrix3fv(matrix_loc, false, matrix);

    // Set the offset
    gl.uniform2fv(offset_loc, program_state.offset);

    // Draw in red
    gl.uniform4fv(color_loc, [1, 0, 0, 1]);

    // Draw the line
    gl.drawArrays(gl.LINE_STRIP, 0, size/2);

    requestAnimationFrame(drawScene);
  }
}

function SetupInteraction(canvas) {
  document.addEventListener("keydown", function(event) {
    const key_name = event.key;

    speed = 0.01;

    if (key_name == "ArrowLeft") {
      program_state.offset[0] += speed;
    } else if (key_name == "ArrowRight") {
      program_state.offset[0] -= speed;
    }
  });

  canvas.addEventListener("mousedown", MouseDown);
  document.addEventListener("mouseup", MouseUp);
  document.addEventListener("mousemove", MouseMove);
}

function MouseDown(event) {
  program_state.mouse.drag_active = true;
  program_state.mouse.pos = [event.screenX, event.screenY];
}

function MouseUp(event) {
  program_state.mouse.drag_active = false;

}

function MouseMove(event) {
  if (!program_state.mouse.drag_active) {
    return;
  }

  var last_pos = program_state.mouse.pos
  program_state.mouse.pos = [event.screenX, event.screenY]

  var diff = [program_state.mouse.pos[0] - last_pos[0],
              program_state.mouse.pos[1] - last_pos[1]];
  var offset = [diff[0] / program_state.canvas.size[0],
                diff[1] / program_state.canvas.size[1]];

  // We apply the offset
  program_state.offset[0] += offset[0];
  program_state.offset[1] -= offset[1];

  console.log(offset);
}

var canvas = document.getElementById("main-canvas");
SetupInteraction(canvas);
Main(canvas);
