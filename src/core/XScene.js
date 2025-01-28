var frameIndex = 0;

class XScene {

  constructor (opts) {
    this.gl = opts.gl;
    this.shader = null;
    this.textureShader = null;

    this.objects = [];
    this.uniforms = {};
    this.lights = {};
    this.matrices = {};
    this.viewport = {};
    this.renderPasses = [];
    this.framebufferObjects = {};
    this.shaderUniformCache = new WeakMap();

    this.onDrawListeners = [];
    this.isDrawing = LIVE_RENDER;
    this.reservedTextureUnitIndex = BASE_SCENE_TEXTURE_UNIT;
    this.drawingTextureUnitIndex = this.reservedTextureUnitIndex;
    this.lastAttribs = [];
    this.lastShader = null;
    this.lastFrontFace = this.gl.CCW;
    this.haveObjectsChanged = false;
    this.needsShaderConnect = false;

    this.addRenderPass(RENDER_PASS_MAIN);
    this.initUniforms(opts);
    this.initLights(opts);
    this.initMatrices(opts);
  };

  initUniforms (opts) {
    var u = this.uniforms;
    u.resolution = new XUniform({ key: UNI_KEY_RESOLUTION, components: 2 });
    u.lightCount = new XUniform({ key: UNI_KEY_DIRECTIONAL_LIGHT_COUNT, components: 1, type: UNI_TYPE_INT });
    u.pointLightCount = new XUniform({ key: UNI_KEY_POINT_LIGHT_COUNT, components: 1, type: UNI_TYPE_INT });
    MATERIAL_TEXTURE_BOOLS.forEach((key) => u[key] = new XUniform({ key, components: 1, type: UNI_TYPE_INT }));
  }

  initLights (opts) {
    var ambientLightColor = (!SHOW_NORMAL_MAPS && opts.ambientLightColor) || AMBIENT_LIGHT;
    var backgroundColor = opts.backgroundColor || BG_COLOR;
    this.lights.ambient = new XLight({ key: UNI_KEY_AMBIENT_LIGHT, color: ambientLightColor });
    this.lights.background = new XLight({ key: UNI_KEY_BACKGROUND_LIGHT, color: backgroundColor });
    this.lights.directional = [];
    this.lights.point = [];

    var fogColor = opts.fogColor || backgroundColor;
    var fogDensity = opts.fogDensity || 0.0001;
    this.uniforms.fogColor = new XUniform({ key: UNI_KEY_FOG_COLOR, components: 3, data: fogColor });
    this.uniforms.fogDensity = new XUniform({ key: UNI_KEY_FOG_DENSITY, components: 1, data: fogDensity });

    var attenConst = opts.attenConst !== undefined ? opts.attenConst : ATTEN_CONST;
    var attenLinear = opts.attenLinear !== undefined ? opts.attenLinear : ATTEN_LINEAR;
    var attenQuad = opts.attenQuad !== undefined ? opts.attenQuad : ATTEN_QUAD;
    this.uniforms.attenConst = new XUniform({ key: UNI_KEY_ATTEN_CONST, components: 1, data: attenConst });
    this.uniforms.attenLinear = new XUniform({ key: UNI_KEY_ATTEN_LINEAR, components: 1, data: attenLinear });
    this.uniforms.attenQuad = new XUniform({ key: UNI_KEY_ATTEN_QUAD, components: 1, data: attenQuad });
  }

  initShadows () {
    this.shadowShader = new XShadowShader({ scene: this });
  }

  initMatrices (opts) {
    this.matrices.projection = new XUniform({ key: UNI_KEY_PROJ_MATRIX, type: UNI_TYPE_MATRIX });
    this.matrices.model = new XUniform({ key: UNI_KEY_MODEL_MATRIX, type: UNI_TYPE_MATRIX });
    this.matrices.view = new XUniform({ key: UNI_KEY_VIEW_MATRIX, type: UNI_TYPE_MATRIX });
    this.matrices.normal = new XUniform({ key: UNI_KEY_NORMAL_MATRIX, type: UNI_TYPE_MATRIX });

    this.matrices.projection.data = opts.projectionMatrix || XMatrix4.get();

    var msx = this.modelScaleX = opts.modelScaleX || 1;
    var msy = this.modelScaleY = opts.modelScaleY || 1;
    var msz = this.modelScaleZ = opts.modelScaleZ || 1;
    this.matrices.model.data = XMatrix4.scale(this.matrices.model.data, msx, msy, msz);
    this.matrices.normal.data = XMatrix4.invert(this.matrices.model.data);
    this.matrices.normal.data = XMatrix4.transpose(this.matrices.normal.data);
  }

  addRenderPass (type, opts) {
    opts = opts || {};
    opts.uniforms = opts.uniforms || {};

    var isBeforeMain = opts.isBeforeMain || false;
    var pass = { type, ...opts, isFirstDraw: true };

    if (isBeforeMain) {
      this.renderPasses.unshift(pass);
    } else {
      this.renderPasses.push(pass);
    }
  }

  getRenderPass (type) {
    for (var i = 0; i < this.renderPasses.length; i++) {
      var pass = this.renderPasses[i];
      if (pass.type === type) {
        return pass;
      }
    }
  }

  removeRenderPass (type, framebuffer) {
    for (var i = this.renderPasses.length - 1; i >= 0; i--) {
      var pass = this.renderPasses[i];
      if (pass.type === type) {
        if (!framebuffer || framebuffer === pass.framebuffer) {
          this.renderPasses.splice(i, 1);
        }
      }
    }
  }

  addFramebuffer (key, opts) {
    opts = opts || {};

    opts.gl = this.gl;
    opts.key = key;
    opts.width = opts.width || this.viewport.width;
    opts.height = opts.height || this.viewport.height;
    opts.scale = opts.scale || 1;

    return this.framebufferObjects[key] = new XFramebufferObject(opts);
  }

  setPrimaryShaders (shader, textureShader) {
    this.shader = shader;
    this.textureShader = textureShader || shader;
  }

  updateObjectShader (object) {
    if (!object.shader || object.shader === this.shader) {
      if (object.material && object.material.useTextures) {
        object.setShader({ shader: this.textureShader });
      }
    }

    if (!object.shader || object.shader === this.textureShader) {
      if (!object.material || !object.material.useTextures) {
        object.setShader({ shader: this.shader });
      }
    }
  }

  addObject (object) {
    object.onDraw && this.onDraw(object, (dt) => object.onDraw(dt));
    object.isActive = true;
    !object.shader && this.updateObjectShader(object);

    this.objects.push(object);
    this.haveObjectsChanged = true;
  };

  removeObject (object) {
    if (!object.isActive) return;

    var index = this.objects.indexOf(object);
    if (index >= 0) {
      this.objects.splice(index, 1);
    }

    if (object.onDrawCB) {
      index = this.onDrawListeners.indexOf(object.onDrawCB);
      if (index >= 0) {
        this.onDrawListeners.splice(index, 1);
      }
    }

    object.isActive = false;
    this.haveObjectsChanged = true;
  }

  addLight (opts) {
    var lights = this.lights.directional;
    if (lights.length >= MAX_LIGHTS) {
      console.warn(`MAX_LIGHTS exceeded, ignoring addLight call.`);
      return;
    }

    opts = opts || {};
    opts.key = UNI_KEY_DIRECTIONAL_LIGHT;
    opts.index = lights.length;

    var light;
    if (opts.type === LIGHT_SPOT) {
      light = new XSpotLight(opts);
    } else {
      light = new XLight(opts);
    }

    if (ENABLE_SHADOWS) {
      var shadowFBO = XGLUtils.createDepthFramebuffer(this.gl, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
      light.addShadowMapTexture(shadowFBO.depthTexture, this.reserveTextureUnit());

      if (!this.shadowShader) {
        this.initShadows();
      };

      this.addRenderPass(RENDER_PASS_LIGHTS, {
        framebuffer: shadowFBO.framebuffer,
        shader: this.shadowShader,
        uniforms: { lightIndex: light.index },
        viewport: { width: SHADOW_MAP_SIZE, height: SHADOW_MAP_SIZE },
        isBeforeMain: true
      });
    }

    lights.push(light);

    this.uniforms.lightCount.data = lights.length;
    this.needsShaderConnect = true;
  }

  addPointLight (opts) {
    var pointLights = this.lights.point;
    if (pointLights.length >= MAX_POINT_LIGHTS) {
      console.warn(`MAX_POINT_LIGHTS exceeded, ignoring addPointLight call.`);
      return;
    }

    opts = opts || {};
    opts.key = UNI_KEY_POINT_LIGHT;
    opts.index = pointLights.length;

    var pos = opts.position || [0, 0, 0];
    pos[0] *= this.modelScaleX;
    pos[1] *= this.modelScaleY;
    pos[2] *= this.modelScaleZ;
    opts.position = pos;

    pointLights.push(new XLight(opts));

    this.uniforms.pointLightCount.data = pointLights.length;
    this.needsShaderConnect = true;
  }

  reserveTextureUnit () {
    return this.reservedTextureUnitIndex++;
  }

  getDrawingTextureUnit () {
    return this.drawingTextureUnitIndex++;
  }

  enableDraw (isEnabled) {
    this.isDrawing = isEnabled;
  }

  onResize (width, height, projectionMatrix) {
    this.viewport.width = width;
    this.viewport.height = height;
    this.uniforms.resolution.data = [width, height];
    this.matrices.projection.data = projectionMatrix;

    for (var key in this.framebufferObjects) {
      this.framebufferObjects[key].onResize(width, height);
    }
  }

  onDraw (object, cb) {
    object.onDrawCB = cb;
    this.onDrawListeners.push(cb);
  }

  draw (dt) {
    var len = this.onDrawListeners.length;
    for (var i = len - 1; i >= 0; i--) {
      this.onDrawListeners[i](dt);
    }

    if (!this.isDrawing) return;

    var gl = this.gl;
    for (var passIndex = 0; passIndex < this.renderPasses.length; passIndex++) {
      var pass = this.renderPasses[passIndex];
      if (DEBUG_LIGHTS && pass.type !== RENDER_PASS_LIGHTS) continue;

      var framebuffer = pass.framebuffer || null;
      if (pass.framebufferKey) {
        framebuffer = this.framebufferObjects[pass.framebufferKey].framebuffer;
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

      var viewport = pass.viewport || this.viewport;
      gl.viewport(0, 0, viewport.width, viewport.height);

      var bgc = this.lights.background.getColor();
      gl.clearColor(bgc[0], bgc[1], bgc[2], 1.0);

      if (pass.isFirstDraw) {
        pass.isFirstDraw = false;
        gl.clearDepth(1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
      }

      if (pass.type === RENDER_PASS_MAIN) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
      } else {
        gl.disable(gl.CULL_FACE);
      }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      var objects = this.objects.slice();
      for (var o = objects.length - 1; o >= 0; o--) {
        var obj = objects[o];
        if (!obj.renderPasses[pass.type]) {
          objects.splice(o, 1);
        }
      }

      if (VERBOSE) {
        console.log(` `);
        console.log(`frameIndex ${frameIndex} passIndex ${passIndex} passType ${pass.type}`);
        console.log(`... objects ${objects.length}`);

        var shader = pass.shader;
        if (shader) {
          console.log(`... shader attributes`);
          var attr = shader.attributeLocations;
          for (var key in attr) {
            if (attr[key] === undefined || attr[key] === null) continue;
            console.log(`... ... ${key} ${attr[key]}`);
          }

          console.log(`... shader uniforms`);
          var uni = shader.uniformLocations;
          for (var key in uni) {
            if (uni[key] === undefined || uni[key] === null) continue;
            console.log(`... ... ${key} ${uni[key]}`);
          }
        }
      }

      var isNewPass = true;

      for (var i = 0; i < objects.length; i++) {
        // reset with each object
        this.drawingTextureUnitIndex = this.reservedTextureUnitIndex;

        var obj = objects[i];
        var shader = pass.shader || obj.shader;
        var isNewShader = isNewPass || this.lastShader !== shader;

        if (obj.frontFace !== this.lastFrontFace) {
          gl.frontFace(obj.frontFace);
          this.lastFrontFace = obj.frontFace;
        }

        if ((this.needsShaderConnect || this.haveObjectsChanged) && isNewShader) {
          shader.connect();
          if (obj.shader !== shader) {
            shader.connectObject(obj);
          };
        }

        if (isNewShader || this.haveObjectsChanged) {
          gl.useProgram(shader.getProgram());
          this.lastShader = shader;
        }

        // apply object matrices, with fallback to scene matrices
        this.applyMatrixUniforms(obj, shader, isNewShader);
        // apply all the scene's light uniforms
        this.applyLightUniforms(shader, isNewShader);
        // apply object and material uniforms
        this.applyUniforms(obj, shader, isNewShader);
        if (obj.material) {
          this.applyUniforms(obj.material, shader, isNewShader);
          MATERIAL_TEXTURE_BOOLS.forEach((key, idx) => {
            var matKey = MATERIAL_TEXTURE_MAPS[idx];
            this.uniforms[key].data = obj.material[matKey].texture ? 1 : 0;
          });
        }
        // apply global scene uniforms
        this.applyUniforms(this.uniforms, shader, isNewShader);
        // render pass uniforms applied last to override any defaults
        this.applyUniforms(pass.uniforms, shader, isNewShader);

        this.applyAttributes(obj, shader);

        obj.draw();

        isNewPass = false;
      }

      if (DEBUG_LIGHTS && framebuffer) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(
          0, 0, viewport.width, viewport.height,
          0, 0, this.viewport.width, this.viewport.height,
          gl.COLOR_BUFFER_BIT, gl.NEAREST
        );
      }

      if (framebuffer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }

    // debugger;

    this.onDrawFinish();
  }

  onDrawFinish () {
    frameIndex++;

    this.needsShaderConnect = false;
    this.haveObjectsChanged = false;

    var objectCount = this.objects.length;
    for (var i = objectCount - 1; i >= 0; i--) {
      this.objects[i].onDrawFinish();
    }

    for (var key in this.uniforms) {
      this.uniforms[key].isDirty = false;
    }

    for (var key in this.matrices) {
      this.matrices[key].isDirty = false;
    }

    for (var key in this.lights) {
      var lightType = this.lights[key];
      if (lightType.length !== undefined) {
        for (var i = 0; i < lightType.length; i++) {
          lightType[i].getUniforms().forEach(uniform => uniform.isDirty = false);
        }
      } else {
        lightType.color.isDirty = false;
      }
    }

    for (var i = 0; i < this.renderPasses.length; i++) {
      var uniforms = this.renderPasses[i].uniforms;
      for (var key in uniforms) {
        uniforms[key].isDirty = false;
      }
    }
  }

  applyMatrixUniforms (obj, shader, force) {
    for (var key in this.matrices) {
      var objMatrix = obj.matrices && obj.matrices[key];
      var srcMatrix = objMatrix || this.matrices[key];
      this.applyUniform(srcMatrix, shader, force);
    }
  }

  applyLightUniforms (shader, force) {
    for (var key in this.lights) {
      var lightType = this.lights[key];
      if (lightType.length !== undefined) {
        this.applyUniformsList(lightType, shader, force);
      } else {
        this.applyUniform(lightType.color, shader, force);
      }
    }
  }

  applyUniforms (dictionary, shader, force) {
    if (!dictionary) return;

    if (dictionary.getUniforms) {
      this.applyUniforms(dictionary.getUniforms(), shader, force);
    } else {
      for (var key in dictionary) {
        this.applyUniform(dictionary[key], shader, force);
      }
    }
  }

  applyUniformsList (list, shader, force) {
    if (!list.length) return;

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item.getUniforms) {
        this.applyUniformsList(item.getUniforms(), shader, force);
      } else {
        this.applyUniform(item, shader, force)
      }
    }
  }

  applyUniform (uniform, shader, force) {
    var location = shader.uniformLocations[uniform.key];
    if (location === NO_SHADER_LOCATION || location === null) return;

    if (uniform.texture && !uniform.isReservedTextureUnit) {
      uniform.data = this.getDrawingTextureUnit();
    }

    var uniformMap = this.shaderUniformCache.get(shader);
    if (!uniformMap) {
      uniformMap = new Map();
      this.shaderUniformCache.set(shader, uniformMap);
    }

    var lastUniform = uniformMap.get(location);
    if (!force && !uniform.isDirty && lastUniform === uniform) {
      VERBOSE && console.log(`uniform SKIPPED: ${this.key}, ${location}, ${this.data}`);
      return;
    }

    uniformMap.set(location, uniform);
    uniform.apply(this.gl, location, force);
    VERBOSE && console.log(`uniform: ${this.key}, ${location}, ${this.data}`);
  }

  applyAttributes (obj, shader) {
    var attributes = obj.attributes;
    var attribs = [];

    for (var key in attributes) {
      var attribute = attributes[key];
      var location = shader.attributeLocations[key];
      var usedAttribs = attribute.bind(this, location);
      usedAttribs && attribs.push(location);
    }

    this.disableLastAttribs(attribs);
    this.lastAttribs = attribs;
  }

  disableLastAttribs (attribs) {
    attribs = attribs || [];

    var gl = this.gl;
    for (var i = 0; i < this.lastAttribs.length; i++) {
      var lastAttrib = this.lastAttribs[i];
      if (attribs.indexOf(lastAttrib) === -1) {
        gl.disableVertexAttribArray(lastAttrib);
      }
    }
  }

  remove () {
    var objCount = this.objects.length;
    var shaders = [];

    for (var i = objCount - 1; i >= 0; i--) {
      var obj = this.objects[i];
      if (obj.shader && shaders.indexOf(obj.shader) === -1) {
        shaders.push(obj.shader);
      }

      obj.remove();
    }

    var shaderCount = shaders.length;
    for (var i = shaderCount - 1; i >= 0; i--) {
      var shader = shaders[i];
      shader.remove();
    }

    this.disableLastAttribs();

    this.shaderUniformCache = null;
  }

}
