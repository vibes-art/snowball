class XPassthroughShader extends XShader {

  setShaderSource(opts) {
    this.vertexShaderSource = `#version 300 es
      precision highp float;
      in vec2 positions;
      out vec2 vUv;
      void main(void) {
        vUv = (positions * 0.5) + 0.5; // [-1..1] -> [0..1]
        gl_Position = vec4(positions, 0.0, 1.0);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;
      uniform sampler2D colorsTexture;
      in vec2 vUv;
      out vec4 fragColor;
      void main(void) {
        fragColor = texture(colorsTexture, vUv);
      }
    `;
  }

  connect() {
    this.setUniformLocation('colorsTexture');
  }

}
