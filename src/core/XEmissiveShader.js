class XEmissiveShader extends XShader {

  setShaderSource (opts) {
    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      uniform mat4 viewMatrix;
      uniform mat4 modelMatrix;
      uniform mat4 projectionMatrix;

      in vec4 positions;
      in vec4 colors;

      out vec3 vViewPos;
      out vec4 vWorldPos;
      out vec4 vColor;

      void main(void) {
        vViewPos = inverse(viewMatrix)[3].xyz;
        vWorldPos = modelMatrix * positions;
        vColor = colors;

        gl_Position = projectionMatrix * (viewMatrix * vWorldPos);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec3 vViewPos;
      in vec4 vWorldPos;
      in vec4 vColor;

      out vec4 fragColor;

      const int MAX_POINT_LIGHTS = ${MAX_POINT_LIGHTS};
      uniform vec3 ${UNI_KEY_POINT_LIGHT}Positions[MAX_POINT_LIGHTS];
      uniform float ${UNI_KEY_POINT_LIGHT}Radii[MAX_POINT_LIGHTS];

      uniform float emission;

      vec4 computeEmission(int i, vec4 color) {
        vec3 pointLightPos = ${UNI_KEY_POINT_LIGHT}Positions[i];
        float pointLightRadius = ${UNI_KEY_POINT_LIGHT}Radii[i];

        vec3 toFrag = vWorldPos.xyz - pointLightPos;
        float toFragDist = length(toFrag);
        vec3 N = normalize(toFrag);
        vec3 V = normalize(vWorldPos.xyz - vViewPos);
        float facing = clamp(dot(-N, V), 0.0, 1.0);

        if (toFragDist < pointLightRadius) {
          return vec4(mix(vColor.rgb, vec3(1.0), facing * facing * facing), 1.0);
        } else {
          return color;
        }
      }

      void main(void) {
        vec4 finalColor = vec4(0.0);
    `;

    for (var i = 0; i < MAX_POINT_LIGHTS; i++) {
      this.fragmentShaderSource += `
        finalColor = computeEmission(${i}, finalColor);
      `;
    }

    this.fragmentShaderSource += `
        fragColor = vec4(finalColor.rgb * emission, finalColor.a);
      }
    `;
  }

}
