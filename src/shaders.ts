/********************************************
 * VERTEX SHADERS
 ********************************************/

let direct_vs = `
#version 300 es

// Attributes
in vec4 a_position_coord;

// Uniforms
uniform vec2 u_offset;
uniform vec2 u_scale;

void main() {
  // We add the offset to the position
  gl_Position = a_position_coord + vec4(u_offset.xy, 0, 0);
}
`;

let pixel_vs = `
#version 300 es

// Attributes
in vec2 a_position_coord;

// Uniforms
uniform vec2 u_resolution;

void main() {
  // Pixels -> [0.0, 1.0]
  vec2 zero_to_one = a_position_coord / u_resolution;

  // // [0.0, 1.0] -> [0.0, 2.0]
  vec2 zero_to_two = zero_to_one * 2.0;

  // // [0.0, 2.0] -> [-1.0, 1.0]
  vec2 clip_space = zero_to_two - 1.0;

  gl_Position = vec4(clip_space, 0, 1);
}
`;

let point_sprite_vs = `
#version 300 es
precision highp float;

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

/********************************************
 * FRAGMENT SHADERS
 ********************************************/

let direct_fs = `
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

let pixel_fs = `
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

// Outputs
out vec4 out_color;

void main() {
  vec4 tex_color = texture(u_sampler, gl_PointCoord);
  out_color = tex_color;
}
`;


class ShaderRegistry {
  shaders: any;
  constructor() {
    this.shaders = {
      vertex: {
        direct: direct_vs,
        pixel: pixel_vs,
        point_sprite: point_sprite_vs,
      },
      fragment: {
        direct: direct_fs,
        pixel: pixel_fs,
        point_sprite: point_sprite_fs,
      }
    };
  }

  private GetShader(type: string, shader_name: string) {
    var shader = this.shaders[type][shader_name];
    if (shader) {
      shader = shader.trim();
    }
    return shader;
  }

  GetVertexShader(shader_name: string) {
    return this.GetShader("vertex", shader_name);
  }

  GetFragmentShader(shader_name: string) {
    return this.GetShader("fragment", shader_name);
  }
};


var AllShaders = new ShaderRegistry();
export default AllShaders;
