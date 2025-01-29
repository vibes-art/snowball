class XFinalColorShader extends XShader {

  setShaderSource (opts) {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      in vec2 positions;
      out vec2 vUV;

      void main() {
        vUV = (positions * 0.5) + 0.5;
        gl_Position = vec4(positions, 0.0, 1.0);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec2 vUV;
      out vec4 fragColor;

      uniform float exposure;
      uniform sampler2D colorsTexture;

      vec3 ACESFilm(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      void main(void) {
        vec3 finalColor = texture(colorsTexture, vUV).rgb;
    `;

    if (ENABLE_TONE_MAPPING) {
      this.fragmentShaderSource += `
        if (exposure > 0.0) {
          finalColor *= exposure;
        }

        finalColor = ACESFilm(finalColor);
      `;
    }

    if (ENABLE_HDR) {
      this.fragmentShaderSource += `
        finalColor = pow(finalColor, vec3(1.0 / 2.2));
      `;
    }

    this.fragmentShaderSource += `
        fragColor = vec4(finalColor, 1.0);
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_COLORS_TEXTURE);
    this.setUniformLocation(UNI_KEY_EXPOSURE);
  }

}
