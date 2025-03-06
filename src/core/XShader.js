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
    this.defineVSHeader(opts);
    this.defineVSMain(opts);
  }

  defineVSHeader (opts) {
    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      uniform mat4 ${UNI_KEY_VIEW_MATRIX};
      uniform mat4 ${UNI_KEY_MODEL_MATRIX};
      uniform mat4 ${UNI_KEY_NORMAL_MATRIX};
      uniform mat4 ${UNI_KEY_PROJ_MATRIX};

      in vec3 ${ATTR_KEY_POSITIONS};
      in vec3 ${ATTR_KEY_NORMALS};
      in vec4 ${ATTR_KEY_COLORS};
      in vec2 ${ATTR_KEY_TEX_COORDS};

      out vec3 vViewPos;
      out vec4 vWorldPos;
      out vec4 vNormal;
      out vec4 vColor;
      out vec2 vUV;
    `;
  }

  addVSMainHeader (opts) {
    this.vertexShaderSource += `
      void main() {
        vViewPos = inverse(${UNI_KEY_VIEW_MATRIX})[3].xyz;
        vWorldPos = ${UNI_KEY_MODEL_MATRIX} * vec4(${ATTR_KEY_POSITIONS}, 1.0);
        vNormal = ${UNI_KEY_NORMAL_MATRIX} * vec4(${ATTR_KEY_NORMALS}, 1.0);
        vColor = ${ATTR_KEY_COLORS};
        vUV = ${ATTR_KEY_TEX_COORDS};
    `;
  }

  defineVSMain (opts) {
    this.addVSMainHeader(opts);

    this.vertexShaderSource += `
        gl_Position = ${UNI_KEY_PROJ_MATRIX} * (${UNI_KEY_VIEW_MATRIX} * vWorldPos);
      }
    `;
  }

  defineFragmentShader (opts) {
    this.defineFSHeader(opts);
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

      uniform vec3 ${UNI_KEY_AMBIENT_LIGHT}Color;
      uniform float ${UNI_KEY_SPECULAR_SHININESS};
      uniform float ${UNI_KEY_SPECULAR_STRENGTH};
      uniform float ${UNI_KEY_ATTEN_CONST};
    `;

    this.addFSFunctionHeader(opts);
    this.addFSDirLightsHeader(opts);
    this.addFSSpotLightsHeader(opts);
    this.addFSPointLightsHeader(opts);
    this.addFSFogHeader(opts);
  }

  addFSFunctionHeader (opts) { /* useful override */ }

  addFSDirLightsHeader (opts) {
    if (MAX_DIR_LIGHTS <= 0 || opts.disableLights) return;

    this.fragmentShaderSource += `
      const int MAX_DIR_LIGHTS = ${MAX_DIR_LIGHTS};
      uniform vec3 ${UNI_KEY_DIR_LIGHT}Positions[MAX_DIR_LIGHTS];
      uniform vec3 ${UNI_KEY_DIR_LIGHT}Colors[MAX_DIR_LIGHTS];
      uniform vec3 ${UNI_KEY_DIR_LIGHT}Directions[MAX_DIR_LIGHTS];
      uniform float ${UNI_KEY_DIR_LIGHT}Powers[MAX_DIR_LIGHTS];
    `;

    this.addFSShadowsHeader(UNI_KEY_DIR_LIGHT, MAX_DIR_LIGHTS, opts);

    for (var i = 0; i < MAX_DIR_LIGHTS; i++) {
      this.addFSLightColorCompute(UNI_KEY_DIR_LIGHT, i);
    }
  }

  addFSLightColorCompute (uniKey, i) {
    this.fragmentShaderSource += `
      vec3 ${uniKey}ColorCompute${i}(vec3 normalDir, vec3 viewDir) {
        const int i = ${i};
        vec3 lightPos = ${uniKey}Positions[i];
        vec3 lightDir = ${uniKey}Directions[i]; // from light to lookAtPoint
        vec3 lightColor = ${uniKey}Colors[i];
        float lightPower = ${uniKey}Powers[i] / 3.5; // rough PBR adjust
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

    this.fragmentShaderSource += `
        float attenuation = lightPower / ${UNI_KEY_ATTEN_CONST};

        float diffuseFactor = max(dot(normalDir, -lightDir), 0.0);
        vec3 diffuse = vColor.rgb * lightColor * diffuseFactor;

        vec3 halfDir = normalize(lightDir + viewDir);
        float specular = pow(max(dot(normalDir, halfDir), 0.0), ${UNI_KEY_SPECULAR_SHININESS});
        specular *= ${UNI_KEY_SPECULAR_STRENGTH};

        float shadowFactor = ${(ENABLE_SHADOWS ? `${uniKey}ShadowCompute${i}()` : `1.0`)};
        return attenuation * spotFactor * shadowFactor * (diffuse + specular);
      }
    `;
  }

  addFSSpotLightsHeader (opts) {
    if (MAX_SPOT_LIGHTS <= 0 || opts.disableLights) return;

    this.fragmentShaderSource += `
      const int MAX_SPOT_LIGHTS = ${MAX_SPOT_LIGHTS};
      uniform vec3 ${UNI_KEY_SPOT_LIGHT}Positions[MAX_SPOT_LIGHTS];
      uniform vec3 ${UNI_KEY_SPOT_LIGHT}Colors[MAX_SPOT_LIGHTS];
      uniform vec3 ${UNI_KEY_SPOT_LIGHT}Directions[MAX_SPOT_LIGHTS];
      uniform float ${UNI_KEY_SPOT_LIGHT}Powers[MAX_SPOT_LIGHTS];
      uniform float ${UNI_KEY_SPOT_LIGHT}InnerAngleCosines[MAX_SPOT_LIGHTS];
      uniform float ${UNI_KEY_SPOT_LIGHT}OuterAngleCosines[MAX_SPOT_LIGHTS];
    `;

    this.addFSShadowsHeader(UNI_KEY_SPOT_LIGHT, MAX_SPOT_LIGHTS, opts);

    for (var i = 0; i < MAX_SPOT_LIGHTS; i++) {
      this.addFSLightColorCompute(UNI_KEY_SPOT_LIGHT, i);
    }
  }

  addFSShadowsHeader (uniKey, maxLights, opts) {
    if (!ENABLE_SHADOWS) return;

    this.fragmentShaderSource += `
      uniform mat4 ${uniKey}ViewProjMatrices[${maxLights}];
      uniform sampler2DShadow ${uniKey}ShadowMap[${maxLights}];
    `;

    for (var i = 0; i < maxLights; i++) {
      this.addFSShadowsCompute(uniKey, i);
    }
  }

  addFSShadowsCompute (uniKey, i) {
    this.fragmentShaderSource += `
      float ${uniKey}ShadowCompute${i}() {
        const int i = ${i};
        vec4 lightPos = ${uniKey}ViewProjMatrices[i] * vWorldPos;
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
            float shadowSample = texture(${uniKey}ShadowMap[i], vec3(shadowUVdepth.xy + offset, currentDepth));
            shadowSum += shadowSample;
            samples++;
          }
        }

        float avgShadow = shadowSum / float(samples);
        return avgShadow;
      }
    `;
  }

  addFSPointLightsHeader (opts) {
    if (MAX_POINT_LIGHTS <= 0 || opts.disableLights) return;

    this.fragmentShaderSource += `
      const int MAX_POINT_LIGHTS = ${MAX_POINT_LIGHTS};
      uniform vec3 ${UNI_KEY_POINT_LIGHT}Positions[MAX_POINT_LIGHTS];
      uniform vec3 ${UNI_KEY_POINT_LIGHT}Colors[MAX_POINT_LIGHTS];
      uniform float ${UNI_KEY_POINT_LIGHT}Powers[MAX_POINT_LIGHTS];

      vec3 ${UNI_KEY_POINT_LIGHT}ColorCompute(int i, vec3 normalDir, vec3 viewDir) {
        vec3 pointLightPos = ${UNI_KEY_POINT_LIGHT}Positions[i];
        vec3 pointLightColor = ${UNI_KEY_POINT_LIGHT}Colors[i];
        float pointLightPower = ${UNI_KEY_POINT_LIGHT}Powers[i] / 3.5; // rough PBR adjust

        vec3 toLight = pointLightPos - vWorldPos.xyz;
        vec3 lightDir = normalize(toLight);
        float distance = length(toLight);
        float attenuation = pointLightPower / (distance * distance);

        float diffuseFactor = max(dot(normalDir, lightDir), 0.0);
        vec3 diffuse = vColor.rgb * pointLightColor * diffuseFactor;

        vec3 halfDir = normalize(lightDir + viewDir);
        float specular = pow(max(dot(normalDir, halfDir), 0.0), ${UNI_KEY_SPECULAR_SHININESS});
        specular *= ${UNI_KEY_SPECULAR_STRENGTH};

        return attenuation * (diffuse + specular);
      }
    `;
  }

  addFSFogHeader (opts) {
    if (!ENABLE_FOG) return;

    this.fragmentShaderSource += `
      uniform vec3 ${UNI_KEY_FOG_COLOR};
      uniform float ${UNI_KEY_FOG_DENSITY};

      vec3 fogCompute(vec3 color) {
        float distFromView = length(vWorldPos.xyz - vViewPos);
        float fogFactor = 1.0 - exp(-${UNI_KEY_FOG_DENSITY} * distFromView * distFromView);
        return mix(color, ${UNI_KEY_FOG_COLOR}, clamp(fogFactor, 0.0, 1.0));
      }
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main() {
        vec3 ambient = vColor.rgb * ${UNI_KEY_AMBIENT_LIGHT}Color;
        vec3 normalDir = normalize(vNormal.xyz);
        vec3 viewDir = normalize(vViewPos - vWorldPos.xyz); // frag to camera
        vec3 finalColor = ambient;
        float alpha = vColor.a;
    `;
  }

  defineFSMain (opts) {
    this.addFSMainHeader(opts);

    if (!opts.disableLights) {
      for (var i = 0; i < MAX_DIR_LIGHTS; i++) {
        this.fragmentShaderSource += `
        finalColor += ${UNI_KEY_DIR_LIGHT}ColorCompute${i}(normalDir, viewDir);
        `;
      }

      for (var i = 0; i < MAX_SPOT_LIGHTS; i++) {
        this.fragmentShaderSource += `
        finalColor += ${UNI_KEY_SPOT_LIGHT}ColorCompute${i}(normalDir, viewDir);
        `;
      }

      for (var i = 0; i < MAX_POINT_LIGHTS; i++) {
        this.fragmentShaderSource += `
        finalColor += ${UNI_KEY_POINT_LIGHT}ColorCompute(${i}, normalDir, viewDir);
        `;
      }
    }

    if (ENABLE_FOG) {
      this.fragmentShaderSource += `
        finalColor = fogCompute(finalColor);
      `;
    }

    this.fragmentShaderSource += `
        fragColor = vec4(finalColor, alpha);
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
