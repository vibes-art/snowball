class XBloomBlurShader extends XShader {

  init (opts) {
    this.isHorizontal = opts.isHorizontal || false;

    super.init(opts);
  }

  setShaderSource () {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      in vec2 positions;
      out vec2 vUV;

      void main() {
        vUV = (positions * 0.5) + 0.5;
        gl_Position = vec4(positions, 0.0, 1.0);
      }
    `;

    var directionalText = this.isHorizontal
      ? 'vec2 uv = vUV + vec2(float(i) * offset, 0.0);'
      : 'vec2 uv = vUV + vec2(0.0, float(i) * offset);';

    this.fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec2 vUV;
      out vec4 fragColor;

      uniform sampler2D sourceTexture;
      uniform float textureSize;

      void main() {
        float offset = 1.0 / textureSize;
        vec3 result = vec3(0.0);

        float[9] kernel = float[](0.05, 0.09, 0.12, 0.15, 0.18, 0.15, 0.12, 0.09, 0.05);
        int halfK = 4;

        for (int i = -halfK; i <= halfK; i++) {
          float w = kernel[i + halfK];

          ${directionalText}

          result += w * texture(sourceTexture, uv).rgb;
        }

        fragColor = vec4(result, 1.0);
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_SOURCE_TEXTURE);
    this.setUniformLocation(UNI_KEY_TEXTURE_SIZE);
  }

}


