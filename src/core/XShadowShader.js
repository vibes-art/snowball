class XShadowShader extends XShader {

  setShaderSource (opts) {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      uniform mat4 modelMatrix;
      uniform int lightIndex;
      uniform mat4 lightViewProjMatrices[${MAX_LIGHTS}];

      in vec4 positions;
      in vec3 normals;
      in vec4 colors;
      out vec4 position;
      out vec3 normal;
      out vec4 color;

      void main(void) {
        position = modelMatrix * positions;
        // normal = normals;
        // color = colors;

        gl_Position = lightViewProjMatrices[lightIndex] * position;
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;

      // in vec4 color;
      // layout(location = 0) out vec4 debugColor;

      void main(void) {
        // debugColor = color;
      }
    `;
  }

}
