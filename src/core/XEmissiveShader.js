class XEmissiveShader extends XShader {

  setShaderSource (opts) {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      uniform mat4 viewMatrix;
      uniform mat4 modelMatrix;
      uniform mat4 projectionMatrix;

      in vec4 positions;
      in vec4 colors;

      out vec4 vColor;

      void main(void) {
        vec4 worldPos = modelMatrix * positions;
        vColor = colors;

        gl_Position = projectionMatrix * (viewMatrix * worldPos);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec4 vColor;

      out vec4 fragColor;

      uniform float emission;

      void main(void) {
        fragColor = vec4(vColor.rgb * emission, vColor.a);
      }
    `;
  }

}
