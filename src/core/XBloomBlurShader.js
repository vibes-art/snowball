class XBloomBlurShader extends XSourceTexShader {

  init (opts) {
    this.isHorizontal = opts.isHorizontal || false;

    super.init(opts);
  }

  defineFSHeader (opts) {
    super.defineFSHeader(opts);

    this.fragmentShaderSource += `
      uniform float ${UNI_KEY_TEXTURE_SIZE};
    `;
  }

  defineFSMain (opts) {
    var directionalText = this.isHorizontal
      ? 'vec2 uv = vUV + vec2(float(i) * offset, 0.0);'
      : 'vec2 uv = vUV + vec2(0.0, float(i) * offset);';

    this.fragmentShaderSource += `
      void main() {
        float offset = 1.0 / ${UNI_KEY_TEXTURE_SIZE};
        vec3 result = vec3(0.0);

        float[11] kernel = float[](
          0.0005, 0.0024, 0.0092, 0.0278, 0.0656,
          0.1210, 0.0656, 0.0278, 0.0092, 0.0024, 0.0005
        );

        int halfK = 5;
        for (int i = -halfK; i <= halfK; i++) {
          float w = kernel[i + halfK];
          ${directionalText}
          result += w * texture(${UNI_KEY_SOURCE_TEXTURE}, uv).rgb;
        }

        // for now 0.5 alpha indicates additive to XCombineShader
        fragColor = vec4(result, 0.5);
      }
    `;
  }

  connect () {
    super.connect();
    this.setUniformLocation(UNI_KEY_TEXTURE_SIZE);
  }

}
