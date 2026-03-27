export const shaders = {
  vertex: `#version 300 es
    precision highp float;

    uniform vec2 u_position;
    uniform float u_size;

    const vec2 positions[4] = vec2[](
      vec2(-1, -1),
      vec2(1, -1),
      vec2(-1, 1),
      vec2(1, 1)
    );

    out vec2 v_texCoord;

    void main() {
      vec2 pos = positions[gl_VertexID];
      v_texCoord = pos * 0.5 + 0.5;
      
      vec2 screenPos = u_position * 2.0 - 1.0;
      vec2 finalPos = screenPos + pos * u_size / vec2(800.0, 600.0);
      
      gl_Position = vec4(finalPos, 0.0, 1.0);
    }
  `,

  fragment: `#version 300 es
    precision highp float;

    uniform vec3 u_color;

    in vec2 v_texCoord;
    out vec4 fragColor;

    void main() {
      float dist = length(v_texCoord - vec2(0.5));
      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
      fragColor = vec4(u_color, alpha);
    }
  `
};