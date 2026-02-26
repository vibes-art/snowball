class XTextShadowShader extends XShadowShader {

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

      uniform vec4 ${UNI_KEY_BASE_COLOR};
      uniform float ${UNI_KEY_THICKNESS};
      uniform float ${UNI_KEY_TEXT_SHADOW_ALPHA_CUTOFF};
      uniform sampler2D ${UNI_KEY_SOURCE_TEXTURE};
    `;

    if (DEBUG_LIGHTS) {
      this.fragmentShaderSource += `
        in vec4 vColor;
        layout(location = 0) out vec4 debugColor;
      `;
    }

    this.fragmentShaderSource += `
      float median(float r, float g, float b) {
        return max(min(r, g), min(max(r, g), b));
      }
    `;
  }

  defineFSMain (opts) {
    var mode = opts.mode || TEXT_SHADOW_MODE_SDF_BINARY;
    var isSdfAA = mode === TEXT_SHADOW_MODE_SDF_AA;
    var sdfClip = `
      if (signedDistance <= 0.0 || alpha < ${UNI_KEY_TEXT_SHADOW_ALPHA_CUTOFF}) {
        discard;
      }
    `;

    if (isSdfAA) {
      sdfClip = `
      float edgeWidth = max(fwidth(signedDistance), 0.00001);
      float coverage = smoothstep(-edgeWidth, edgeWidth, signedDistance);
      if (coverage * alpha < ${UNI_KEY_TEXT_SHADOW_ALPHA_CUTOFF}) {
        discard;
      }
      `;
    }

    var debugMain = DEBUG_LIGHTS ? `debugColor = vColor;` : ``;
    this.fragmentShaderSource += `
      void main() {
        vec3 texColor = texture(${UNI_KEY_SOURCE_TEXTURE}, vUV).rgb;
        float signedDistance = median(texColor.r, texColor.g, texColor.b) - 0.5 + ${UNI_KEY_THICKNESS};
        float alpha = vAlpha * ${UNI_KEY_BASE_COLOR}.a;
        ${sdfClip}
        ${debugMain}
      }
    `;
  }

}
