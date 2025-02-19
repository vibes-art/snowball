class XFinalColorShader extends XSourceTexShader {

  defineFragmentShader (opts) {
    super.defineFragmentShader(opts);

    this.fragmentShaderSource = this.fragmentShaderSource.replace(
      new RegExp(UNI_KEY_SOURCE_TEXTURE, 'g'),
      UNI_KEY_COLORS_TEXTURE
    );
  }

  defineFSHeader (opts) {
    super.defineFSHeader(opts);

    this.fragmentShaderSource += `
      uniform float ${UNI_KEY_EXPOSURE};

      vec3 ACESFilm(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }
    `;
  }

  addFSMainHeader (opts) {
    super.addFSMainHeader(opts);

    if (ENABLE_TONE_MAPPING) {
      this.fragmentShaderSource += `
        if (${UNI_KEY_EXPOSURE} > 0.0) {
          finalColor *= ${UNI_KEY_EXPOSURE};
        }

        finalColor = ACESFilm(finalColor);
      `;
    }

    if (ENABLE_HDR) {
      this.fragmentShaderSource += `
        finalColor = pow(finalColor, vec3(1.0 / 2.2));
      `;
    }
  }

  connect () {
    this.setUniformLocation(UNI_KEY_COLORS_TEXTURE);
    this.setUniformLocation(UNI_KEY_EXPOSURE);
  }

}
