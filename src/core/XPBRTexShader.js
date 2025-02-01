class XPBRTexShader extends XShader {

  setShaderSource (opts) {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      uniform mat4 viewMatrix;
      uniform mat4 modelMatrix;
      uniform mat4 normalMatrix;
      uniform mat4 projectionMatrix;

      in vec4 positions;
      in vec3 normals;
      in vec4 colors;
      in vec2 texCoords;
      in vec3 tangents;

      out vec3 vViewPos;
      out vec4 vWorldPos;
      out vec4 vNormal;
      out vec4 vColor;
      out vec2 vUV;
      out mat3 vTBN;

      void main(void) {
        vViewPos = inverse(viewMatrix)[3].xyz;
        vWorldPos = modelMatrix * positions;
        vNormal = normalMatrix * vec4(normals, 1.0);
        vColor = colors;
        vUV = texCoords;

        // TBN for tangent-space normal maps, assuming tangents, normals, are in model space
        vec3 N = normalize((modelMatrix * vec4(normals, 0.0)).xyz);
        vec3 T = normalize((modelMatrix * vec4(tangents, 0.0)).xyz);
        // Re-orthonormalize T if needed
        T = normalize(T - dot(T, N) * N);
        vec3 B = cross(N, T);
        vTBN = mat3(T, B, N);

        gl_Position = projectionMatrix * (viewMatrix * vWorldPos);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;
      precision mediump sampler2DShadow;

      in vec3 vViewPos;
      in vec4 vWorldPos;
      in vec4 vNormal;
      in vec4 vColor;
      in vec2 vUV;
      in mat3 vTBN;

      out vec4 fragColor;

      const int MAX_LIGHTS = ${MAX_LIGHTS};
      uniform int lightCount;
      uniform vec3 lightPositions[MAX_LIGHTS];
      uniform vec3 lightColors[MAX_LIGHTS];
      uniform vec3 lightDirections[MAX_LIGHTS];
      uniform float lightInnerAngles[MAX_LIGHTS];
      uniform float lightOuterAngles[MAX_LIGHTS];
      uniform float lightPowers[MAX_LIGHTS];
    `;

    for (var i = 0; i < MAX_LIGHTS; i++) {
      this.fragmentShaderSource += `
        uniform sampler2DShadow lightShadowMap${i};`;
    }

    this.fragmentShaderSource += `
      uniform mat4 lightViewProjMatrices[MAX_LIGHTS];

      const int MAX_POINT_LIGHTS = ${MAX_POINT_LIGHTS};
      uniform int pointLightCount;
      uniform vec3 pointLightPositions[MAX_POINT_LIGHTS];
      uniform vec3 pointLightColors[MAX_POINT_LIGHTS];
      uniform vec3 pointLightFixedAxes[MAX_POINT_LIGHTS];
      uniform float pointLightPowers[MAX_POINT_LIGHTS];
      uniform float pointLightRadii[MAX_POINT_LIGHTS];

      uniform vec3 ambientColor;
      uniform vec3 fogColor;
      uniform float fogDensity;
      uniform float attenConst;
      uniform float attenLinear;
      uniform float attenQuad;

      uniform vec4 baseColor;
      uniform float metallic;
      uniform float roughness;
      uniform int hasAlbedoMap;
      uniform int hasNormalMap;
      uniform int hasRoughnessMap;
      uniform sampler2D albedoMap;
      uniform sampler2D normalMap;
      uniform sampler2D roughnessMap;

      float DistributionGGX(vec3 N, vec3 H, float roughness) {
        float a = roughness * roughness;
        float a2 = a * a;
        float NdotH = max(dot(N, H), 0.0);
        float denom = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
        return a2 / (3.14159265359 * denom * denom);
      }

      float GeometrySchlickGGX(float NdotV, float roughness) {
        float r = (roughness + 1.0);
        float k = (r * r) / 8.0;
        float denom = NdotV * (1.0 - k) + k;
        return NdotV / denom;
      }

      float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        float ggx2 = GeometrySchlickGGX(NdotV, roughness);
        float ggx1 = GeometrySchlickGGX(NdotL, roughness);
        return ggx1 * ggx2;
      }

      vec3 fresnelSchlick(float cosTheta, vec3 F0) {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
      }

      float textureShadowMap(int i, vec3 uvw) {
    `;

    for (var i = 0; i < MAX_LIGHTS; i++) {
      this.fragmentShaderSource += `
        if (i == ${i}) return texture(lightShadowMap${i}, uvw);`;
    }

    this.fragmentShaderSource += `
      }

      float computeShadow(int i, vec4 vWorldPos) {
        vec4 lightPos = lightViewProjMatrices[i] * vWorldPos;
        vec3 ndc = lightPos.xyz / lightPos.w;
        vec3 shadowUVdepth = ndc * 0.5 + 0.5;

        float bias = 0.0008;
        float currentDepth = shadowUVdepth.z - bias;

        float texelSize = 0.5 / ${SHADOW_MAP_SIZE}.0;
        float shadowSum = 0.0;
        int samples = 0;

        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            float shadowSample = textureShadowMap(i, vec3(shadowUVdepth.xy + offset, currentDepth));
            shadowSum += shadowSample;
            samples++;
          }
        }

        float avgShadow = shadowSum / float(samples);
        return avgShadow;
      }

      void main(void) {
        vec3 normalDir = normalize(vNormal.xyz);
        vec3 viewDir = normalize(vViewPos - vWorldPos.xyz);

        vec4 texColor = baseColor;
        float alpha = baseColor.a;

        if (hasAlbedoMap > 0) {
          texColor = texture(albedoMap, vUV);
          alpha = texColor.a;
        }

        vec3 tintColor = texColor.rgb * vColor.rgb;
        vec3 finalColor = vec3(0.0);

        vec3 N = normalize(vTBN[2]);
        if (hasNormalMap > 0) {
          vec3 normalSample = texture(normalMap, vUV).rgb;
          normalSample = normalSample * 2.0 - 1.0;
          N = normalize(vTBN * normalSample);
          normalDir = N;
        }

        float roughVal = roughness;
        float metalVal = metallic;
        if (hasRoughnessMap > 0) {
          vec3 rmSample = texture(roughnessMap, vUV).rgb;
          roughVal = rmSample.g;
          metalVal = rmSample.b;
        }

        float roughnessClamped = clamp(roughVal, 0.07, 1.0);
        vec3 F0 = mix(vec3(0.04), tintColor, metalVal);

        for (int i = 0; i < lightCount; i++) {
          vec3 lightPos = lightPositions[i];
          vec3 lightDir = lightDirections[i]; // from light to lookAtPoint
          vec3 lightColor = lightColors[i];
          float lightPower = lightPowers[i];

          vec3 toFrag = vWorldPos.xyz - lightPos; // from light to frag
          float toFragDist = length(toFrag);
          vec3 toFragDir = normalize(toFrag);

          vec3 toLight = lightPos - vWorldPos.xyz; // from frag to light
          float toLightDist = length(toLight);
          vec3 toLightDir = normalize(toLight);
          vec3 halfDir = normalize(viewDir + toLightDir);

          float attenDenom = attenConst + attenLinear * toLightDist + attenQuad * toLightDist * toLightDist;
          float attenuation = lightPower / attenDenom;
          vec3 radiance = lightColor * attenuation; 

          // Cook-Torrance BRDF
          float NDF = DistributionGGX(normalDir, halfDir, roughnessClamped);
          float G = GeometrySmith(normalDir, viewDir, toLightDir, roughnessClamped);
          vec3 F = fresnelSchlick(max(dot(halfDir, viewDir), 0.0), F0);
          float NdotL = max(dot(normalDir, toLightDir), 0.0);
          float denom = 4.0 * max(dot(normalDir, viewDir), 0.0) * NdotL + 0.001;
          vec3 specular = (NDF * G * F) / denom;

          vec3 kS = F;
          vec3 kD = vec3(1.0) - kS;
          kD *= (1.0 - metalVal);

          vec3 diffuse = kD * tintColor.rgb / 3.14159265359; 

          float cosAngle = dot(lightDir, toFragDir);
          float cosInner = cos(lightInnerAngles[i]);
          float cosOuter = cos(lightOuterAngles[i]);
          float spotFactor = 1.0;
          if (lightInnerAngles[i] > 0.0) {
            if (cosAngle > cosInner) {
              spotFactor = 1.0;
            } else if (cosAngle < cosOuter) {
              spotFactor = 0.0;
            } else {
              spotFactor = smoothstep(cosOuter, cosInner, cosAngle);
            }
          }

          float shadowFactor = 1.0;
          if (${ENABLE_SHADOWS}) {
            shadowFactor = computeShadow(i, vWorldPos);
          }

          finalColor += spotFactor * radiance * shadowFactor * (diffuse + specular) * NdotL;
        }

        for (int i = 0; i < pointLightCount; i++) {
          vec3 pointLightPos = pointLightPositions[i];
          vec3 pointLightColor = pointLightColors[i];
          vec3 pointLightFixedAxes = pointLightFixedAxes[i];
          float pointLightPower = pointLightPowers[i];
          float pointLightRadius = pointLightRadii[i];

          float toLightX = pointLightFixedAxes[0] != 0.0 ? pointLightFixedAxes[0] : pointLightPos.x - vWorldPos.x;
          float toLightY = pointLightFixedAxes[1] != 0.0 ? pointLightFixedAxes[1] : pointLightPos.y - vWorldPos.y;
          float toLightZ = pointLightFixedAxes[2] != 0.0 ? pointLightFixedAxes[2] : pointLightPos.z - vWorldPos.z;
          vec3 toLight = vec3(toLightX, toLightY, toLightZ);
          vec3 toLightDir = normalize(toLight);
          float toLightDist = length(toLight);
          vec3 halfDir = normalize(viewDir + toLightDir);

          float attenuation = pointLightPower / (toLightDist * toLightDist);
          vec3 radiance = pointLightColor * attenuation; 

          float sphereFactor = pointLightRadius / toLightDist;
          float combinedRoughness = sqrt(roughnessClamped * roughnessClamped + sphereFactor * sphereFactor);

          // Cook-Torrance BRDF
          float NDF = DistributionGGX(normalDir, halfDir, combinedRoughness);
          float G = GeometrySmith(normalDir, viewDir, toLightDir, combinedRoughness);
          vec3 F = fresnelSchlick(max(dot(halfDir, viewDir), 0.0), F0);
          float NdotL = max(dot(normalDir, toLightDir), 0.0);
          float denom = 4.0 * max(dot(normalDir, viewDir), 0.0) * NdotL + 0.001;
          vec3 specular = (NDF * G * F) / denom;

          vec3 kS = F;
          vec3 kD = vec3(1.0) - kS;
          kD *= (1.0 - metalVal);

          vec3 diffuse = kD * tintColor.rgb / 3.14159265359; 

          finalColor += radiance * (diffuse + specular) * NdotL;
        }

        float distFromView = length(vWorldPos.xyz - vViewPos);
        float fogFactor = 1.0 - exp(-fogDensity * distFromView * distFromView);
        finalColor = mix(finalColor, fogColor, clamp(fogFactor, 0.0, 1.0));

        vec3 ambient = ambientColor * tintColor;
        vec3 ambientScale = vec3(1.0 - finalColor.rgb);
        fragColor = vec4(finalColor + ambientScale * ambient, alpha);
      }
    `;
  }

}
