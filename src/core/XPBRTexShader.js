class XPBRTexShader extends XPBRShader {

  defineVSHeader (opts) {
    super.defineVSHeader(opts);

    this.vertexShaderSource += `
      in vec3 ${ATTR_KEY_TANGENTS};
      out mat3 vTBN;
    `;
  }

  addVSMainHeader (opts) {
    super.addVSMainHeader(opts);

    // TBN for tangent-space normal maps, assuming tangents, normals, are in model space
    this.vertexShaderSource += `
        vec3 N = normalize((${UNI_KEY_MODEL_MATRIX} * vec4(${ATTR_KEY_NORMALS}, 0.0)).xyz);
        vec3 T = normalize((${UNI_KEY_MODEL_MATRIX} * vec4(${ATTR_KEY_TANGENTS}, 0.0)).xyz);
        T = normalize(T - dot(T, N) * N);
        vec3 B = cross(N, T);
        vTBN = mat3(T, B, N);
    `;
  }

  defineFSHeader (opts) {
    super.defineFSHeader(opts);

    this.fragmentShaderSource += `
      in vec2 vUV;
      in mat3 vTBN;

      uniform sampler2D ${UNI_KEY_ALBEDO_MAP};
      uniform sampler2D ${UNI_KEY_NORMAL_MAP};
      uniform sampler2D ${UNI_KEY_ROUGHNESS_MAP};
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main() {
        vec3 viewDir = normalize(vViewPos - vWorldPos.xyz);
        vec3 normalSample = 2.0 * texture(${UNI_KEY_NORMAL_MAP}, vUV).rgb - 1.0;
        vec3 normalDir = normalize(vTBN * normalSample);

        vec4 texColor = texture(${UNI_KEY_ALBEDO_MAP}, vUV);
        float alpha = texColor.a;
        vec3 tintColor = texColor.rgb;
        vec3 finalColor = vec3(0.0);

        vec3 rmSample = texture(${UNI_KEY_ROUGHNESS_MAP}, vUV).rgb;
        float metal = rmSample.b;
        float rough = clamp(rmSample.g, 0.07, 1.0);
        vec3 F0 = mix(vec3(0.04), tintColor, metal);
    `;
  }

}
