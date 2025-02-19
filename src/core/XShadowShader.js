class XShadowShader extends XShader {

  defineVSHeader (opts) {
    var uniformKey = opts.uniformKey;
    var maxLights = opts.maxLights;

    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      uniform mat4 ${UNI_KEY_MODEL_MATRIX};
      uniform int ${uniformKey}Index;
      uniform mat4 ${uniformKey}ViewProjMatrices[${maxLights}];

      in vec4 ${ATTR_KEY_POSITIONS};
    `;

    if (DEBUG_LIGHTS) {
      this.vertexShaderSource += `
      in vec4 ${ATTR_KEY_COLORS};
      out vec4 vColor;
      `;
    }
  }

  addVSMainHeader (opts) {
    this.vertexShaderSource += `
      void main() {
    `;

    if (DEBUG_LIGHTS) {
      this.vertexShaderSource += `
        vColor = ${ATTR_KEY_COLORS};
      `;
    }
  }

  defineVSMain (opts) {
    this.addVSMainHeader(opts);

    var uniformKey = opts.uniformKey;
    var viewProjKey = `${uniformKey}ViewProjMatrices[${uniformKey}Index]`;
    this.vertexShaderSource += `
        gl_Position = ${viewProjKey} * ${UNI_KEY_MODEL_MATRIX} * ${ATTR_KEY_POSITIONS};
      }
    `;
  }

  defineFSHeader (opts) {
    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;
    `;

    if (DEBUG_LIGHTS) {
      this.fragmentShaderSource += `
        in vec4 vColor;
        layout(location = 0) out vec4 debugColor;
      `;
    }
  }

  defineFSMain (opts) {
    var fragMain = DEBUG_LIGHTS ? `debugColor = vColor;` : ``;
    this.fragmentShaderSource += `
      void main() {
        ${fragMain}
      }
    `;
  }

}
