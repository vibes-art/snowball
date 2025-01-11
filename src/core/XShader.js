class XShader {

  constructor (opts) {
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
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      uniform mat4 modelMatrix;
      uniform mat4 viewMatrix;
      uniform mat4 projectionMatrix;

      in vec4 positions;
      in vec3 normals;
      in vec4 colors;
      out vec4 position;
      out vec3 normal;
      out vec4 color;
      out vec3 viewPosition;

      void main(void) {
        position = modelMatrix * positions;
        normal = normals;
        color = colors;
        viewPosition = inverse(viewMatrix)[3].xyz;

        gl_Position = projectionMatrix * (viewMatrix * position);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;
      precision mediump sampler2DShadow;

      uniform mat4 normalMatrix;
      uniform vec3 ambientColor;

      in vec4 position;
      in vec3 normal;
      in vec4 color;
      in vec3 viewPosition;
      out vec4 fragColor;

      const int MAX_LIGHTS = ${MAX_LIGHTS};
      uniform int lightCount;
      uniform vec3 lightDirections[MAX_LIGHTS];
      uniform vec3 lightColors[MAX_LIGHTS];
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

      uniform vec3 fogColor;
      uniform float fogDensity;

      float fresnelSchlick(float cosTheta, float refIndex) {
        float r0 = (1.0 - refIndex) / (1.0 + refIndex);
        r0 = r0 * r0;
        return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
      }

      float textureShadowMap(int i, vec3 uvw) {
    `;

    for (var i = 0; i < MAX_LIGHTS; i++) {
      this.fragmentShaderSource += `
        if (i == ${i}) return texture(lightShadowMap${i}, uvw);`;
    }

    this.fragmentShaderSource += `
      }

      float computeShadow(int i, vec4 worldPos) {
        vec4 lightPos = lightViewProjMatrices[i] * worldPos;
        vec3 ndc = lightPos.xyz / lightPos.w;
        vec3 shadowUVdepth = ndc * 0.5 + 0.5;

        float bias = 0.001;
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
        return 1.0 - avgShadow;
      }

      void main(void) {
        float specularShininess = 256.0;
        float specularStrength = 0.05;

        vec3 ambient = color.rgb * ambientColor;
        vec4 transformedNormal = normalMatrix * vec4(normal, 1.0);
        vec3 normalDir = normalize(transformedNormal.xyz);
        vec3 viewDir = normalize(position.xyz - viewPosition);
        float cosTheta = dot(viewDir, normalDir);
        float fresnel = fresnelSchlick(cosTheta, 0.05);

        vec3 finalColor = ambient;
        for (int i = 0; i < lightCount; ++i) {
          vec3 lightDir = -lightDirections[i];
          vec3 lightColor = lightColors[i];

          float diffuseFactor = max(abs(dot(normalDir, lightDir)), 0.0);
          vec3 diffuse = color.rgb * lightColor * diffuseFactor;

          vec3 reflectDir = reflect(lightDir, normalDir);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularShininess);
          vec3 specular = specularStrength * spec * lightColor * fresnel;

          float shadowFactor = computeShadow(i, position);
          finalColor += (1.0 - shadowFactor) * (diffuse + specular);
        }

        for (int i = 0; i < pointLightCount; ++i) {
          vec3 pointLightPos = pointLightPositions[i];
          vec3 pointLightColor = pointLightColors[i];

          vec3 toLight = pointLightPos - position.xyz;
          vec3 lightDir = normalize(toLight);
          float distance = length(toLight);
          float attenuation = 1.0 / (distance * distance);

          float diffuseFactor = max(dot(normalDir, lightDir), 0.0);
          vec3 diffuse = color.rgb * pointLightColor * diffuseFactor;

          vec3 reflectDir = reflect(lightDir, normalDir);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularShininess);
          vec3 specular = specularStrength * spec * pointLightColor * fresnel;

          vec3 pointLightContrib = attenuation * (diffuse + specular);
          finalColor += pointLightContrib;
        }

        float distFromView = length(position.xyz - viewPosition);
        float fogFactor = 1.0 - exp(-fogDensity * distFromView * distFromView);
        finalColor = mix(finalColor, fogColor, clamp(fogFactor, 0.0, 1.0));
        fragColor = vec4(finalColor, color.a);
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
    this.locateGlobalUniforms(this.scene.fog);

    this.setUniformLocation(this.scene.lightCount.key);
    this.setUniformLocation(this.scene.pointLightCount.key);
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
