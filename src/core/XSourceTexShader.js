class XSourceTexShader extends XShader {

  defineVSHeader (opts) {
    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec2 ${ATTR_KEY_POSITIONS};
      out vec2 vUV;
    `;
  }

  addVSMainHeader (opts) {
    this.vertexShaderSource += `
      void main() {
        vUV = (${ATTR_KEY_POSITIONS} * 0.5) + 0.5;
    `;
  }

  defineVSMain (opts) {
    this.addVSMainHeader(opts);

    this.vertexShaderSource += `
        gl_Position = vec4(${ATTR_KEY_POSITIONS}, 0.0, 1.0);
      }
    `;
  }

  defineFSHeader (opts) {
    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec2 vUV;
      out vec4 fragColor;

      uniform sampler2D ${UNI_KEY_SOURCE_TEXTURE};
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main() {
        vec3 finalColor = texture(${UNI_KEY_SOURCE_TEXTURE}, vUV).rgb;
    `;
  }

  defineFSMain (opts) {
    this.addFSMainHeader(opts);

    this.fragmentShaderSource += `
        fragColor = vec4(finalColor, 1.0);
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_SOURCE_TEXTURE);
  }

}
