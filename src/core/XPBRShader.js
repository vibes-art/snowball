class XPBRShader extends XShader {

  addFSFunctionHeader (opts) {
    this.fragmentShaderSource += `
      uniform vec4 ${UNI_KEY_BASE_COLOR};
      uniform vec4 ${UNI_KEY_EMISSIVE_COLOR};
      uniform float ${UNI_KEY_METALLIC};
      uniform float ${UNI_KEY_ROUGHNESS};
    `;

    if (!opts.disableLights) {
      this.fragmentShaderSource += `
        float DistributionGGX(vec3 N, vec3 H, float rough) {
          float a = rough * rough;
          float a2 = a * a;
          float NdotH = max(dot(N, H), 0.0);
          float denom = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
          return a2 / (3.14159265359 * denom * denom);
        }

        float GeometrySchlickGGX(float NdotV, float rough) {
          float r = (rough + 1.0);
          float k = (r * r) / 8.0;
          float denom = NdotV * (1.0 - k) + k;
          return NdotV / denom;
        }

        float GeometrySmith(vec3 N, vec3 V, vec3 L, float rough) {
          float NdotV = max(dot(N, V), 0.0);
          float NdotL = max(dot(N, L), 0.0);
          float ggx2 = GeometrySchlickGGX(NdotV, rough);
          float ggx1 = GeometrySchlickGGX(NdotL, rough);
          return ggx1 * ggx2;
        }

        vec3 fresnelSchlick(float cosTheta, vec3 F0) {
          return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
        }
      `;
    }
  }

  addFSPointLightsHeader (opts) {
    if (MAX_POINT_LIGHTS <= 0 || opts.disableLights) return;

    this.fragmentShaderSource += `
      const int MAX_POINT_LIGHTS = ${MAX_POINT_LIGHTS};
      uniform vec3 ${UNI_KEY_POINT_LIGHT}Positions[MAX_POINT_LIGHTS];
      uniform vec3 ${UNI_KEY_POINT_LIGHT}Colors[MAX_POINT_LIGHTS];
      uniform float ${UNI_KEY_POINT_LIGHT}Powers[MAX_POINT_LIGHTS];
      uniform float ${UNI_KEY_POINT_LIGHT}Radii[MAX_POINT_LIGHTS];
    `;

    for (var i = 0; i < MAX_POINT_LIGHTS; i++) {
      this.addFSLightColorCompute(UNI_KEY_POINT_LIGHT, i);
    }
  }

  addFSLightColorCompute (uniKey, i) {
    var attenuation = uniKey === UNI_KEY_POINT_LIGHT
      ? `float attenuation = lightPower / (toLightDist * toLightDist);`
      : `float attenuation = lightPower / ${UNI_KEY_ATTEN_CONST};`;

    var lightProp = uniKey === UNI_KEY_POINT_LIGHT
      ? `float lightRadius = ${uniKey}Radii[i];`
      : `vec3 lightDir = ${uniKey}Directions[i]; // from light to lookAtPoint`;

    var combinedRoughness = uniKey === UNI_KEY_POINT_LIGHT
      ? `
        float sphereFactor = lightRadius / toLightDist;
        float combinedRoughness = sqrt(rough * rough + sphereFactor * sphereFactor);
      `
      : `
        float combinedRoughness = rough;
      `;

    this.fragmentShaderSource += `
      vec3 ${uniKey}ColorCompute${i}(vec3 color, vec3 normalDir, vec3 viewDir, float rough, float metal, vec3 F0) {
        const int i = ${i};
        vec3 lightPos = ${uniKey}Positions[i];
        vec3 lightColor = ${uniKey}Colors[i];
        float lightPower = ${uniKey}Powers[i];
        ${lightProp}

        vec3 toLight = lightPos - vWorldPos.xyz; // from frag to light
        float toLightDist = length(toLight);
        vec3 toLightDir = normalize(toLight);
        vec3 halfDir = normalize(viewDir + toLightDir);

        ${attenuation}
        vec3 radiance = lightColor * attenuation; 

        ${combinedRoughness}

        // Cook-Torrance BRDF
        float NDF = DistributionGGX(normalDir, halfDir, combinedRoughness);
        float G = GeometrySmith(normalDir, viewDir, toLightDir, combinedRoughness);
        vec3 F = fresnelSchlick(max(dot(halfDir, viewDir), 0.0), F0);
        float NdotL = max(dot(normalDir, toLightDir), 0.0);
        float denom = 4.0 * max(dot(normalDir, viewDir), 0.0) * NdotL + 0.001;
        vec3 specular = (NDF * G * F) / denom;

        vec3 kD = vec3(1.0) - F;
        kD *= (1.0 - metal);
        vec3 diffuse = kD * color.rgb / 3.14159265359;
    `;

    if (uniKey === UNI_KEY_SPOT_LIGHT) {
      this.fragmentShaderSource += `
        vec3 toFrag = vWorldPos.xyz - lightPos; // from light to frag
        vec3 toFragDir = normalize(toFrag);
        float cosAngle = dot(lightDir, toFragDir);
        float cosInner = ${UNI_KEY_SPOT_LIGHT}InnerAngleCosines[i];
        float cosOuter = ${UNI_KEY_SPOT_LIGHT}OuterAngleCosines[i];
        float spotFactor = smoothstep(cosOuter, cosInner, cosAngle);
      `;
    } else {
      this.fragmentShaderSource += `
        float spotFactor = 1.0;
      `;
    }

    var enableShadows = ENABLE_SHADOWS && uniKey !== UNI_KEY_POINT_LIGHT;
    this.fragmentShaderSource += `
        float shadowFactor = ${(enableShadows ? `${uniKey}ShadowCompute${i}()` : `1.0`)};
    `;

    this.fragmentShaderSource += `
        return spotFactor * radiance * shadowFactor * (diffuse + specular) * NdotL;
      }
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main() {
        vec3 normalDir = normalize(vNormal.xyz);
        vec3 viewDir = normalize(vViewPos - vWorldPos.xyz);
        vec3 tintColor = ${UNI_KEY_BASE_COLOR}.rgb * vColor.rgb;
        vec3 finalColor = ${UNI_KEY_EMISSIVE_COLOR}.rgb;

        float alpha = ${UNI_KEY_BASE_COLOR}.a;
        float metal = ${UNI_KEY_METALLIC};
        float rough = clamp(${UNI_KEY_ROUGHNESS}, 0.07, 1.0);
        vec3 F0 = mix(vec3(0.04), tintColor, metal);
    `;
  }

  defineFSMain (opts) {
    this.addFSMainHeader(opts);

    if (!opts.disableLights) {
      for (var i = 0; i < MAX_DIR_LIGHTS; i++) {
        this.fragmentShaderSource += `
        finalColor += ${UNI_KEY_DIR_LIGHT}ColorCompute${i}(tintColor, normalDir, viewDir, rough, metal, F0);
        `;
      }

      for (var i = 0; i < MAX_SPOT_LIGHTS; i++) {
        this.fragmentShaderSource += `
        finalColor += ${UNI_KEY_SPOT_LIGHT}ColorCompute${i}(tintColor, normalDir, viewDir, rough, metal, F0);
        `;
      }

      for (var i = 0; i < MAX_POINT_LIGHTS; i++) {
        this.fragmentShaderSource += `
        finalColor += ${UNI_KEY_POINT_LIGHT}ColorCompute${i}(tintColor, normalDir, viewDir, rough, metal, F0);
        `;
      }
    } else {
      this.fragmentShaderSource += `
        finalColor = tintColor;
      `;
    }

    if (ENABLE_FOG) {
      this.fragmentShaderSource += `
        finalColor = fogCompute(finalColor);
      `;
    }

    if (!opts.disableLights) {
      this.fragmentShaderSource += `
        vec3 ambient = ${UNI_KEY_AMBIENT_LIGHT}Color * tintColor;
        vec3 ambientScale = vec3(clamp(1.0 - finalColor.rgb, 0.0, 1.0));
        fragColor = vec4(finalColor + ambientScale * ambient, alpha);
      }
      `;
    } else {
      this.fragmentShaderSource += `
        vec3 ambient = ${UNI_KEY_AMBIENT_LIGHT}Color * finalColor;
        fragColor = vec4(ambient, alpha);
      }
      `;
    }
  }

}
