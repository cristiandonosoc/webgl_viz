/********************************************
 * VERTEX SHADERS
 ********************************************/

let direct_vs = `
#version 300 es

in vec4 a_position_coord;

uniform vec2 u_offset;
uniform vec2 u_scale;
uniform float u_point_size;

void main() {
  // Scale the position
  vec4 scaled = a_position_coord * vec4(u_scale.xy, 1, 1);
  // We add the offset to the position
  // gl_Position = a_position_coord + vec4(u_offset.xy, 0, 0);
  // gl_Position = a_position_coord + vec4(u_offset.xy, 0, 0) + vec4(u_scale.xy, 0, 0);
  gl_Position = scaled + vec4(u_offset.xy, 0, 0);
  gl_PointSize = u_point_size;
}
`;

let pixel_vs = `
#version 300 es

// Attributes
in vec2 a_position_coord;

// Uniforms
uniform vec2 u_resolution;
uniform float u_point_size;

void main() {
  // Pixels -> [0.0, 1.0]
  vec2 zero_to_one = a_position_coord / u_resolution;

  // // [0.0, 1.0] -> [0.0, 2.0]
  vec2 zero_to_two = zero_to_one * 2.0;

  // // [0.0, 2.0] -> [-1.0, 1.0]
  vec2 clip_space = zero_to_two - 1.0;

  gl_Position = vec4(clip_space, 0, 1);
  gl_PointSize = u_point_size;
}
`;

let graph_vs = `
#version 300 es

in vec4 a_position_coord;

uniform vec2 u_offset;
uniform vec2 u_scale;
uniform float u_point_size;

uniform vec2 u_graph_offset;

void main() {
  // Offset
  vec4 offsetted = a_position_coord + vec4(u_graph_offset.xy, 0, 0);
  // Scale the position
  vec4 scaled = offsetted * vec4(u_scale.xy, 1, 1);
  // We add the offset to the position
  gl_Position = scaled + vec4(u_offset.xy, 0, 0);
  gl_PointSize = u_point_size;
}
`;

let timing_vs = `
#version 300 es

in vec4 a_position_coord;

const int OFFSET_COUNT = 32;

uniform vec2 u_offset;
uniform vec2 u_scale;
uniform float u_point_size;

uniform float u_vertex_offsets[OFFSET_COUNT];
uniform int u_offset_count;

void main() {
  // We get the offset count for this point
  int t = gl_VertexID / u_offset_count;
  int index = gl_VertexID - (u_offset_count * t);
  // We need to wrap in the minor offset buffer
  // if (index >= u_offset_count) {
  //   index -= u_offset_count;
  // }

  // Offset the position
  vec4 offsetted = a_position_coord + vec4(u_vertex_offsets[index], 0, 0, 0);

  // Scale the position
  vec4 scaled = offsetted * vec4(u_scale.xy, 1, 1);
  // We add the offset to the position
  gl_Position = scaled + vec4(u_offset.xy, 0, 0);
  gl_PointSize = u_point_size;
}
`;


/********************************************
 * FRAGMENT SHADERS
 ********************************************/

let simple_fs = `
#version 300 es
precision mediump float;

// Uniforms
uniform vec4 u_color;

// Outputs
out vec4 out_color;

void main() {
  out_color = u_color;
}
`;

let point_sprite_fs = `
#version 300 es
precision mediump float;

// Uniforms
uniform sampler2D u_sampler;
uniform vec4 u_color;

// Outputs
out vec4 out_color;

void main() {
  vec4 tex_color = texture(u_sampler, gl_PointCoord);
  if (tex_color.a == 0.0) {
    out_color = u_color;
  } else {
    out_color = vec4(0,0,0,0);
  }
}
`;

enum VertexShaders {
  NONE,
  DIRECT,
  PIXEL,
  GRAPH,
  TIMING,
};

enum FragmentShaders {
  NONE,
  SIMPLE,
  POINT_SPRITE,
}


class ShaderRegistry {
  shaders: any;
  constructor() {
    this.shaders = {
      vertex: {},
      fragment: {}
    };

    // Add Vertex Shaders
    this.shaders.vertex[VertexShaders.DIRECT] = direct_vs;
    this.shaders.vertex[VertexShaders.PIXEL] = pixel_vs;
    this.shaders.vertex[VertexShaders.GRAPH] = graph_vs;
    this.shaders.vertex[VertexShaders.TIMING] = timing_vs;

    // Add Fragment Shaders
    this.shaders.fragment[FragmentShaders.SIMPLE] = simple_fs;
    this.shaders.fragment[FragmentShaders.POINT_SPRITE] = point_sprite_fs;
  }

  GetVSSource(shader_id: VertexShaders) : string {
    var shader : string = this.shaders.vertex[shader_id];
    if (shader) {
      shader = shader.trim();
    } else {
      console.error("Could not find vertex shader: ",  shader_id);
      throw "ERROR IN SHADER LOOKUP";
    }
    return shader;
  }

  GetFSSource(shader_id: FragmentShaders) : string {
    var shader : string = this.shaders.fragment[shader_id];
    if (shader) {
      shader = shader.trim();
    } else {
      console.error("Could not find fragment shader: ",  shader_id);
      throw "ERROR IN SHADER LOOKUP";
    }
    return shader;
  }
};


// We create the singleton
var AllShaders = new ShaderRegistry();
console.log(AllShaders);

export {VertexShaders, FragmentShaders};
export {AllShaders};
export default AllShaders;
