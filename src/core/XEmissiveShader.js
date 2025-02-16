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
      uniform int pointLightCount;
      uniform vec3 pointLightPositions[MAX_POINT_LIGHTS];
      uniform float pointLightRadii[MAX_POINT_LIGHTS];

      uniform float emission;

      void main(void) {
        vec3 finalSphereColor = vec3(0.0);
        float finalAlpha = 0.0;

        for (int i = 0; i < pointLightCount; i++) {
          vec3 pointLightPos = pointLightPositions[i];
          float pointLightRadius = pointLightRadii[i];

          vec3 toFrag = vWorldPos.xyz - pointLightPos;
          float toFragDist = length(toFrag);
          vec3 N = normalize(toFrag);
          vec3 V = normalize(vWorldPos.xyz - vViewPos);
          float facing = clamp(dot(-N, V), 0.0, 1.0);

          if (toFragDist < pointLightRadius) {
            finalSphereColor = mix(vColor.rgb, vec3(1.0), facing * facing * facing);
            finalAlpha = 1.0;
            break;
          }
        }

        vec3 emissive = finalSphereColor * emission;
        fragColor = vec4(emissive, finalAlpha);
      }
    `;
  }

}
