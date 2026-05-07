class XAlphaShadowShader extends XShadowShader {

  defineVSHeader (opts) {
    var uniformKey = opts.uniformKey;
    var maxLights = opts.maxLights;

    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      uniform mat4 ${UNI_KEY_MODEL_MATRIX};
      uniform int ${uniformKey}Index;
      uniform mat4 ${uniformKey}ViewProjMatrices[${maxLights}];

      in vec4 ${ATTR_KEY_POSITIONS};
      in vec2 ${ATTR_KEY_TEX_COORDS};
      in vec4 ${ATTR_KEY_COLORS};

      out vec2 vUV;
      out float vAlpha;
    `;

    if (DEBUG_LIGHTS) {
      this.vertexShaderSource += `
        out vec4 vColor;
      `;
    }
  }

  addVSMainHeader (opts) {
    this.vertexShaderSource += `
      void main() {
        vUV = ${ATTR_KEY_TEX_COORDS};
        vAlpha = ${ATTR_KEY_COLORS}.a;
    `;

    if (DEBUG_LIGHTS) {
      this.vertexShaderSource += `
        vColor = ${ATTR_KEY_COLORS};
      `;
    }
  }

  defineFSHeader (opts) {
    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec2 vUV;
      in float vAlpha;

      uniform float ${UNI_KEY_SHADOW_ALPHA_CUTOFF};
      uniform int ${UNI_KEY_SHADOW_ALPHA_MODE};
      uniform sampler2D ${UNI_KEY_ALBEDO_MAP};
    `;

    if (DEBUG_LIGHTS) {
      this.fragmentShaderSource += `
        in vec4 vColor;
        layout(location = 0) out vec4 debugColor;
      `;
    }
  }

  defineFSMain (opts) {
    var debugMain = DEBUG_LIGHTS ? `debugColor = vColor;` : ``;
    this.fragmentShaderSource += `
      float getShadowAlphaDitherThreshold (vec2 fragCoord) {
        int x = int(mod(fragCoord.x, 4.0));
        int y = int(mod(fragCoord.y, 4.0));
        int index = x + y * 4;
        float[16] bayer4 = float[16](
          0.0, 8.0, 2.0, 10.0,
          12.0, 4.0, 14.0, 6.0,
          3.0, 11.0, 1.0, 9.0,
          15.0, 7.0, 13.0, 5.0
        );

        return (bayer4[index] + 0.5) / 16.0;
      }

      void main() {
        vec2 texSize = vec2(textureSize(${UNI_KEY_ALBEDO_MAP}, 0));
        if (texSize.x <= 1.0 && texSize.y <= 1.0) discard;

        float alpha = texture(${UNI_KEY_ALBEDO_MAP}, vUV).a * vAlpha;
        float cutoff = ${UNI_KEY_SHADOW_ALPHA_CUTOFF};

        if (${UNI_KEY_SHADOW_ALPHA_MODE} == ${SHADOW_ALPHA_MODE_DITHER}) {
          float alphaRange = max(1.0 - cutoff, 0.0001);
          float normalizedAlpha = clamp((alpha - cutoff) / alphaRange, 0.0, 1.0);
          if (normalizedAlpha <= 0.0) discard;

          float threshold = getShadowAlphaDitherThreshold(gl_FragCoord.xy);
          if (normalizedAlpha < threshold) discard;
        } else if (alpha < cutoff) {
          discard;
        }

        ${debugMain}
      }
    `;
  }

}
