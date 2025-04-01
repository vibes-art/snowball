class XTexShader extends XShader {

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

  defineFragmentShader (opts) {
    super.defineFragmentShader(opts);

    this.fragmentShaderSource = this.fragmentShaderSource.replace(
      /vColor.rgb/g,
      'texColor.rgb'
    );

    this.fragmentShaderSource = this.fragmentShaderSource.replace(
      /vColor.a/g,
      'texColor.a'
    );

    this.fragmentShaderSource = this.fragmentShaderSource.replace(
      /vec3 viewDir\) {/g,
      'vec3 viewDir, vec4 texColor) {'
    );

    this.fragmentShaderSource = this.fragmentShaderSource.replace(
      /, viewDir\);/g,
      ', viewDir, texColor);'
    );
  }

  defineFSHeader (opts) {
    super.defineFSHeader(opts);

    this.fragmentShaderSource += `
      in vec2 vUV;
      in mat3 vTBN;

      uniform sampler2D ${UNI_KEY_ALBEDO_MAP};
      uniform sampler2D ${UNI_KEY_NORMAL_MAP};
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main() {
        vec3 viewDir = normalize(vViewPos - vWorldPos.xyz);
        vec3 normalSample = 2.0 * texture(${UNI_KEY_NORMAL_MAP}, vUV).rgb - 1.0;
        vec3 normalDir = normalize(vTBN * normalSample);

        vec4 texColor = texture(${UNI_KEY_ALBEDO_MAP}, vUV);
        vec3 ambient = texColor.rgb * ${UNI_KEY_AMBIENT_LIGHT}Color;
        vec3 finalColor = ambient;
        float alpha = texColor.a * vColor.a;
    `;
  }

}
