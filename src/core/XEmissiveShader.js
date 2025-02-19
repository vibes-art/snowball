class XEmissiveShader extends XShader {

  defineFSHeader (opts) {
    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec3 vViewPos;
      in vec4 vWorldPos;
      in vec4 vColor;

      out vec4 fragColor;

      uniform float emission;
    `;

    this.addFSPointLightsHeader(opts);
  }

  addFSPointLightsHeader (opts) {
    this.fragmentShaderSource += `
      const int MAX_POINT_LIGHTS = ${MAX_POINT_LIGHTS};
      uniform vec3 ${UNI_KEY_POINT_LIGHT}Positions[MAX_POINT_LIGHTS];
      uniform float ${UNI_KEY_POINT_LIGHT}Radii[MAX_POINT_LIGHTS];

      vec4 ${UNI_KEY_POINT_LIGHT}EmissionCompute(int i, vec4 color) {
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
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main() {
        vec4 finalColor = vec4(0.0);
    `;
  }

  defineFSMain (opts) {
    this.addFSMainHeader(opts);

    for (var i = 0; i < MAX_POINT_LIGHTS; i++) {
      this.fragmentShaderSource += `
        finalColor = ${UNI_KEY_POINT_LIGHT}EmissionCompute(${i}, finalColor);
      `;
    }

    this.fragmentShaderSource += `
        fragColor = vec4(finalColor.rgb * emission, finalColor.a);
      }
    `;
  }

}
