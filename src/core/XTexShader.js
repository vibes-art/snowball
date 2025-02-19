class XTexShader extends XShader {

  defineVSHeader (opts) {
    super.defineVSHeader(opts);

    this.vertexShaderSource += `
      in vec3 tangents;
      out mat3 vTBN;
    `;
  }

  addVSMainHeader (opts) {
    super.addVSMainHeader(opts);

    this.vertexShaderSource += `
        // TBN for tangent-space normal maps, assuming tangents, normals, are in model space
        vec3 N = normalize((modelMatrix * vec4(normals, 0.0)).xyz);
        vec3 T = normalize((modelMatrix * vec4(tangents, 0.0)).xyz);
        // Re-orthonormalize T if needed
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

      uniform sampler2D albedoMap;
      uniform sampler2D normalMap;
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main(void) {
        vec3 viewDir = normalize(vViewPos - vWorldPos.xyz);
        vec3 normalSample = 2.0 * texture(normalMap, vUV).rgb - 1.0;
        vec3 normalDir = normalize(vTBN * normalSample);

        vec4 texColor = texture(albedoMap, vUV);
        vec3 ambient = texColor.rgb * ambientColor;
        vec3 finalColor = ambient;
    `;
  }

}
