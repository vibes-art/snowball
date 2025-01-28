class XPassthroughShader extends XShader {

  setShaderSource (opts) {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      in vec2 positions;
      out vec2 vUV;

      void main(void) {
        vUV = (positions * 0.5) + 0.5; // [-1..1] -> [0..1]
        gl_Position = vec4(positions, 0.0, 1.0);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec2 vUV;
      out vec4 fragColor;

      uniform sampler2D colorsTexture;

      void main(void) {
        fragColor = texture(colorsTexture, vUV);
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_COLORS_TEXTURE);
  }

}
