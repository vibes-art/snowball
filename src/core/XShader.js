var _shaderUID = 1;

class XShader {

  constructor (opts) {
    this.uid = _shaderUID++;
    this.scene = opts.scene;

    this.vertexShaderSource = '';
    this.fragmentShaderSource = '';

    this.resources = {};
    this.attributeLocations = {};
    this.uniformLocations = {};

    this.init(opts);
  }

  init (opts) {
    this.setShaderSource(opts);
    this.compile();
    this.connect();
  }

  setShaderSource (opts) {
    this.defineVertexShader(opts);
    this.defineFragmentShader(opts);
  }

  defineVertexShader (opts) {
    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      uniform mat4 viewMatrix;
      uniform mat4 modelMatrix;
      uniform mat4 normalMatrix;
      uniform mat4 projectionMatrix;

      in vec4 positions;
      in vec3 normals;
      in vec4 colors;
      in vec2 texCoords;
      out vec3 vViewPos;
      out vec4 vWorldPos;
      out vec4 vNormal;
      out vec4 vColor;
      out vec2 vUV;

      void main(void) {
        vViewPos = inverse(viewMatrix)[3].xyz;
        vWorldPos = modelMatrix * positions;
        vNormal = normalMatrix * vec4(normals, 1.0);
        vColor = colors;
        vUV = texCoords;

        gl_Position = projectionMatrix * (viewMatrix * vWorldPos);
      }
    `;
  }

  defineFragmentShader (opts) {
    this.defineFSHeader(opts);
    this.defineFSLightsHeader(opts);
    this.defineFSPointLightsHeader(opts);
    this.defineFSFogHeader(opts);
    this.defineFSMain(opts);
  }

  defineFSHeader (opts) {
    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;
      precision ${PRECISION} sampler2DShadow;

      in vec3 vViewPos;
      in vec4 vWorldPos;
      in vec4 vNormal;
      in vec4 vColor;
      out vec4 fragColor;

      uniform vec3 ambientColor;
      uniform float specularShininess;
      uniform float specularStrength;

      float fresnelSchlick(float cosTheta, float refIndex) {
        float r0 = (1.0 - refIndex) / (1.0 + refIndex);
        r0 = r0 * r0;
        return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
      }
    `;
  }

  defineFSLightsHeader (opts) {
    if (MAX_LIGHTS <= 0) return;

    this.fragmentShaderSource += `
      uniform float attenConst;
      uniform float attenLinear;
      uniform float attenQuad;

      const int MAX_LIGHTS = ${MAX_LIGHTS};
      uniform vec3 lightPositions[MAX_LIGHTS];
      uniform vec3 lightColors[MAX_LIGHTS];
      uniform vec3 lightDirections[MAX_LIGHTS];
      uniform float lightInnerAngles[MAX_LIGHTS];
      uniform float lightOuterAngles[MAX_LIGHTS];
      uniform float lightPowers[MAX_LIGHTS];
    `;

    this.addFSShadowsHeader(opts);

    this.fragmentShaderSource += `
      vec3 computeLightColor(int i, vec3 normalDir, vec3 viewDir, float fresnel) {
        vec3 lightPos = lightPositions[i];
        vec3 lightDir = lightDirections[i]; // from light to lookAtPoint
        vec3 lightColor = lightColors[i];
        float lightPower = lightPowers[i];

        vec3 toFrag = vWorldPos.xyz - lightPos; // from light to frag
        float toFragDist = length(toFrag);
        vec3 toFragDir = normalize(toFrag);

        float spotFactor = 1.0;
        if (lightInnerAngles[i] > 0.0) {
          float cosAngle = dot(lightDir, toFragDir);
          float cosInner = cos(lightInnerAngles[i]);
          float cosOuter = cos(lightOuterAngles[i]);
          if (cosAngle > cosInner) {
            spotFactor = 1.0;
          } else if (cosAngle < cosOuter) {
            spotFactor = 0.0;
          } else {
            spotFactor = smoothstep(cosOuter, cosInner, cosAngle);
          }
        }

        float attenDenom = attenConst + attenLinear * toFragDist + attenQuad * toFragDist * toFragDist;
        float attenuation = lightPower / attenDenom;

        float diffuseFactor = max(dot(normalDir, -lightDir), 0.0);
        vec3 diffuse = vColor.rgb * lightColor * diffuseFactor;

        vec3 reflectDir = reflect(lightDir, normalDir);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularShininess);
        vec3 specular = specularStrength * spec * lightColor * fresnel;

        float shadowFactor = ${(ENABLE_SHADOWS ? 'computeShadow(i)' : '1.0')};
        return spotFactor * attenuation * shadowFactor * (diffuse + specular);
      }
    `;
  }

  addFSShadowsHeader (opts) {
    if (!ENABLE_SHADOWS) return;

    this.fragmentShaderSource += `
      uniform mat4 lightViewProjMatrices[MAX_LIGHTS];
    `;

    var shadowMapStr = `
      uniform sampler2DShadow lightShadowMap{i};
    `;
    for (var i = 0; i < MAX_LIGHTS; i++) {
      this.fragmentShaderSource += shadowMapStr.replace('{i}', i);
    }

    this.fragmentShaderSource += `
      float textureShadowMap(int i, vec3 uvw) {
    `;
    for (var i = 0; i < MAX_LIGHTS; i++) {
      this.fragmentShaderSource += `
        if (i == ${i}) return texture(lightShadowMap${i}, uvw);
      `;
    }
    this.fragmentShaderSource += `
      }
    `;

    this.fragmentShaderSource += `
      float computeShadow(int i) {
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
    `;
  }

  defineFSPointLightsHeader (opts) {
    if (MAX_POINT_LIGHTS <= 0) return;

    this.fragmentShaderSource += `
      const int MAX_POINT_LIGHTS = ${MAX_POINT_LIGHTS};
      uniform vec3 pointLightPositions[MAX_POINT_LIGHTS];
      uniform vec3 pointLightColors[MAX_POINT_LIGHTS];
      uniform float pointLightPowers[MAX_POINT_LIGHTS];

      vec3 computerPointLightColor(int i, vec3 normalDir, vec3 viewDir, float fresnel) {
        vec3 pointLightPos = pointLightPositions[i];
        vec3 pointLightColor = pointLightColors[i];
        float pointLightPower = pointLightPowers[i];

        vec3 toLight = pointLightPos - vWorldPos.xyz;
        vec3 lightDir = normalize(toLight);
        float distance = length(toLight);
        float attenuation = pointLightPower / (distance * distance);

        float diffuseFactor = max(dot(normalDir, lightDir), 0.0);
        vec3 diffuse = vColor.rgb * pointLightColor * diffuseFactor;

        vec3 reflectDir = reflect(-lightDir, normalDir);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularShininess);
        vec3 specular = specularStrength * spec * pointLightColor * fresnel;

        return attenuation * (diffuse + specular);
      }
    `;
  }

  defineFSFogHeader (opts) {
    if (!ENABLE_FOG) return;

    this.fragmentShaderSource += `
      uniform vec3 fogColor;
      uniform float fogDensity;

      vec3 computeFog(vec3 color) {
        float distFromView = length(vWorldPos.xyz - vViewPos);
        float fogFactor = 1.0 - exp(-fogDensity * distFromView * distFromView);
        return mix(color, fogColor, clamp(fogFactor, 0.0, 1.0));
      }
    `;
  }

  defineFSMain (opts) {
    this.fragmentShaderSource += `
      void main(void) {
        vec3 ambient = vColor.rgb * ambientColor;
        vec3 normalDir = normalize(vNormal.xyz);
        vec3 viewDir = normalize(vViewPos - vWorldPos.xyz); // frag to camera

        float cosTheta = dot(viewDir, normalDir);
        float fresnel = fresnelSchlick(cosTheta, 0.05);
        vec3 finalColor = ambient;
    `;

    for (var i = 0; i < MAX_LIGHTS; i++) {
      this.fragmentShaderSource += `
        finalColor += computeLightColor(${i}, normalDir, viewDir, fresnel);
      `;
    }

    for (var i = 0; i < MAX_POINT_LIGHTS; i++) {
      this.fragmentShaderSource += `
        finalColor += computerPointLightColor(${i}, normalDir, viewDir, fresnel);
      `;
    }

    if (ENABLE_FOG) {
      this.fragmentShaderSource += `
        finalColor = computeFog(finalColor);
      `;
    }

    this.fragmentShaderSource += `
        fragColor = vec4(finalColor, vColor.a);
      }
    `;
  }

  compile () {
    var vsSrc = this.vertexShaderSource;
    var fsSrc = this.fragmentShaderSource;
    this.resources = XGLUtils.initShaderProgram(this.scene.gl, vsSrc, fsSrc);
  }

  connect () {
    this.locateGlobalUniforms(this.scene.matrices);
    this.locateGlobalUniforms(this.scene.lights);
    this.locateGlobalUniforms(this.scene.uniforms);
  }

  connectObject (obj) {
    this.locateAttributes(obj);
    this.locateUniforms(obj);
  }

  locateAttributes (obj) {
    for (var key in obj.attributes) {
      var attribute = obj.attributes[key];
      if (attribute.useTexture) continue;
      this.setAttributeLocation(key);
    }
  }

  locateUniforms (obj) {
    for (var key in obj.uniforms) {
      this.setUniformLocation(key);
    }

    if (obj.material) {
      this.locateUniforms(obj.material);
    }
  }

  locateGlobalUniforms (dictionary) {
    for (var key in dictionary) {
      var uniform = dictionary[key];

      if (uniform.getUniforms) {
        this.locateGlobalUniforms(uniform.getUniforms());
        continue;
      }

      if (uniform.length) {
        this.locateGlobalUniforms(uniform);
        continue;
      }

      this.setUniformLocation(uniform.key);
    }
  }

  setAttributeLocation (key) {
    var attributeLocation = this.attributeLocations[key];
    if (attributeLocation === undefined) {
      this.attributeLocations[key] = this.scene.gl.getAttribLocation(this.getProgram(), key);
    }
  }

  setUniformLocation (key) {
    var uniformLocation = this.uniformLocations[key];
    if (uniformLocation === undefined) {
      this.uniformLocations[key] = this.scene.gl.getUniformLocation(this.getProgram(), key);
    }
  }

  getProgram () {
    return this.resources.shaderProgram;
  }

  remove () {
    if (!this.resources) return;

    this.scene.gl.deleteProgram(this.resources.shaderProgram);
    this.scene.gl.deleteShader(this.resources.vertexShader);
    this.scene.gl.deleteShader(this.resources.fragmentShader);

    this.resources = null;
  }

}
