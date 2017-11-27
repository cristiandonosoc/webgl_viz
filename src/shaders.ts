/********************************************
 * VERTEX SHADERS
 ********************************************/

let graph_line_vs = `
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

/********************************************
 * FRAGMENT SHADERS
 ********************************************/

let graph_line_fs = `
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

class ShaderRegistry {
  shaders: any;
  constructor() {
    this.shaders = {
      vertex: {
        graph_line: graph_line_vs
      },
      fragment: {
        graph_line: graph_line_fs
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
