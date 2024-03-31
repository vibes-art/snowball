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

      float fresnelSchlick(float cosTheta, float refIndex) {
        float r0 = (1.0 - refIndex) / (1.0 + refIndex);
        r0 = r0 * r0;
        return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
      }

      void main(void) {
        float specularShininess = 2048.0;
        float specularStrength = 0.75;

        vec3 ambient = color.rgb * ambientColor;
        vec4 transformedNormal = normalMatrix * vec4(normal, 1.0);
        vec3 viewDir = normalize(position.xyz - viewPosition);
        float cosTheta = dot(viewDir, normalize(transformedNormal.xyz));
        float fresnel = fresnelSchlick(cosTheta, 0.05);

        vec3 finalColor = ambient;
        for (int i = 0; i < lightCount; ++i) {
          vec3 directionalVector = lightDirections[i];
          vec3 lightColor = lightColors[i];
          float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
          vec3 reflectDir = reflect(directionalVector, normalize(transformedNormal.xyz));
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularShininess);
          vec3 specular = specularStrength * spec * lightColor * fresnel;
          vec3 diffuse = color.rgb * (lightColor * directional);
          finalColor += diffuse + specular;
        }

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
    this.setUniformLocation(this.scene.lightCount.key);
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
