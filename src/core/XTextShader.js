class XTextShader extends XShader {

  addFSFunctionHeader (opts) {
    super.addFSFunctionHeader(opts);

    this.fragmentShaderSource += `
      in vec2 vUV;

      uniform vec4 ${UNI_KEY_BASE_COLOR};
      uniform float ${UNI_KEY_THICKNESS};
      uniform float ${UNI_KEY_SOFTNESS};
      uniform sampler2D ${UNI_KEY_SOURCE_TEXTURE};

      float median(float r, float g, float b) {
        return max(min(r, g), min(max(r, g), b));
      }

      float screenPxRange() {
        vec2 unitRange = vec2(2.0) / vec2(textureSize(${UNI_KEY_SOURCE_TEXTURE}, 0));
        vec2 screenTexSize = vec2(1.0) / fwidth(vUV);
        return max(0.5 * dot(unitRange, screenTexSize), 1.0);
      }
    `;
  }

  addFSMainHeader (opts) {
    super.addFSMainHeader(opts);

    this.fragmentShaderSource += `
        vec4 baseColor = ${UNI_KEY_BASE_COLOR};
        vec3 texColor = texture(${UNI_KEY_SOURCE_TEXTURE}, vUV).rgb;
        float signedDistance = median(texColor.r, texColor.g, texColor.b);
        float screenPxDistance = screenPxRange() * (signedDistance - 0.5 + ${UNI_KEY_THICKNESS});
        float alphaEdge = screenPxDistance + 0.5;
        float opacity = smoothstep(0.0 - ${UNI_KEY_SOFTNESS}, 1.0 + ${UNI_KEY_SOFTNESS}, alphaEdge);

        finalColor = mix(vec3(0.0), baseColor.rgb, opacity);
        alpha *= (baseColor.a * opacity);
    `;
  }

}
