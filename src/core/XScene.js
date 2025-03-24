var frameIndex = 0;

var OBJECT_RENDER_SORT = function (a, b) {
  if (a.alpha >= 1 && b.alpha >= 1) {
    // performance optimization for opaque objects
    var shaderDiff = a.shader.uid - b.shader.uid;
    if (shaderDiff === 0) {
      var aMatUID = (a.material && a.material.uid) || 0;
      var bMatUID = (b.material && b.material.uid) || 0;
      return aMatUID - bMatUID;
    }
    return shaderDiff;
  } else if (a.alpha >= 1) {
    return -1;
  } else if (b.alpha >= 1) {
    return 1;
  } else {
    return b.distanceFromCamera - a.distanceFromCamera;
  }
};

var FRUSTUM_CULL_PASSES = [RENDER_PASS_MAIN];

class XScene {

  constructor (opts) {
    this.gl = opts.gl;
    this.shader = null;
    this.textureShader = null;

    this.objects = [];
    this.uniforms = {};
    this.lights = {};
    this.fonts = {};
    this.shadowShaders = {};
    this.matrices = {};
    this.viewport = {};
    this.renderPasses = [];
    this.framebufferObjects = {};
    this.shaderUniformCache = new WeakMap();

    this.onDrawListeners = [];
    this.isDrawing = true;
    this.reservedTextureUnitIndex = BASE_SCENE_TEXTURE_UNIT;
    this.drawingTextureUnitIndex = this.reservedTextureUnitIndex;
    this.lastAttribs = [];
    this.lastShader = null;
    this.lastMaterial = null;
    this.lastFrontFace = this.gl.CCW;
    this.currentProjViewMatrix = null;
    this.haveObjectsChanged = false;
    this.needsShaderConnect = false;
    this.appliedObjectMatrices = false;

    this.addRenderPass(RENDER_PASS_MAIN, {
      framebufferKey: RENDER_PASS_MAIN
    });

    this.initUniforms(opts);
    this.initLights(opts);
    this.initFog(opts);
    this.initMatrices(opts);

    // debugging stats
    this.stats = {};
    this.stats.drawCalls = 0;
    this.stats.uniformCalls = 0;
    this.stats.uniformSkips = 0;
    this.stats.programCalls = 0;
    this.stats.objectsCulled = 0;
  };

  initUniforms (opts) {
    this.addUniform(UNI_KEY_SPECULAR_SHININESS, { components: 1, data: 128.0 });
    this.addUniform(UNI_KEY_SPECULAR_STRENGTH, { components: 1, data: 0.5 });
    this.addUniform(UNI_KEY_RESOLUTION, { components: 2 });
  }

  addUniform (key, opts) {
    opts = opts || {};
    opts.key = key;
    this.uniforms[key] = new XUniform(opts);
  }

  initLights (opts) {
    var ambColor = (!SHOW_NORMAL_MAPS && opts.ambientLightColor) || AMBIENT_LIGHT;
    var bgColor = opts.backgroundColor || BG_COLOR;
    this.lights[UNI_KEY_AMBIENT_LIGHT] = new XLight({ gl: this.gl, key: UNI_KEY_AMBIENT_LIGHT, color: ambColor });
    this.lights[UNI_KEY_BACKGROUND_LIGHT] = new XLight({ gl: this.gl, key: UNI_KEY_BACKGROUND_LIGHT, color: bgColor });
    this.lights[UNI_KEY_DIR_LIGHT] = [];
    this.lights[UNI_KEY_SPOT_LIGHT] = [];
    this.lights[UNI_KEY_POINT_LIGHT] = [];

    var attenConst = opts.attenConst !== undefined ? opts.attenConst : ATTEN_CONST;
    this.addUniform(UNI_KEY_ATTEN_CONST, { components: 1, data: attenConst });
  }

  initFog (opts) {
    if (!ENABLE_FOG) return;

    var bgColor = opts.backgroundColor || BG_COLOR;
    var fogColor = opts.fogColor || bgColor;
    var fogDensity = opts.fogDensity || 0.0001;
    this.addUniform(UNI_KEY_FOG_COLOR, { components: 3, data: fogColor });
    this.addUniform(UNI_KEY_FOG_DENSITY, { components: 1, data: fogDensity });
  }

  getShadowShader (uniformKey, maxLights) {
    var shader = this.shadowShaders[uniformKey];

    if (!shader) {
      shader = this.shadowShaders[uniformKey] = new XShadowShader({
        scene: this, uniformKey, maxLights
      });
    }

    return shader;
  }

  getTextShader () {
    if (this.textShader) return this.textShader;
    return this.textShader = new XTextShader({ scene: this });
  }

  initMatrices (opts) {
    this.matrices.projection = new XUniform({ key: UNI_KEY_PROJ_MATRIX, type: UNI_TYPE_MATRIX });
    this.matrices.model = new XUniform({ key: UNI_KEY_MODEL_MATRIX, type: UNI_TYPE_MATRIX });
    this.matrices.view = new XUniform({ key: UNI_KEY_VIEW_MATRIX, type: UNI_TYPE_MATRIX });
    this.matrices.normal = new XUniform({ key: UNI_KEY_NORMAL_MATRIX, type: UNI_TYPE_MATRIX });

    this.matrices.projection.data = opts.projectionMatrix || XMatrix4.get();

    this.matrices.normal.data = XMatrix4.invert(this.matrices.model.data);
    this.matrices.normal.data = XMatrix4.transpose(this.matrices.normal.data);
  }

  setViewMatrix (viewMatrix) {
    this.matrices.view.data = viewMatrix;

    var invView = XMatrix4.invert(viewMatrix);
    this.cameraPosition = [invView[12], invView[13], invView[14]];
  }

  addRenderPass (type, opts) {
    opts = opts || {};
    opts.uniforms = opts.uniforms || {};
    opts.textures = opts.textures || {};

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
    return null;
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

  getSourceFramebuffer (index) {
    index = index !== undefined ? index : this.renderPasses.length - 1;

    var sourceFBO = null;
    var lastPass = this.renderPasses[index];

    if (lastPass && lastPass.type) {
      var lastFBO = this.framebufferObjects[lastPass.type];
      if (lastFBO) {
        sourceFBO = lastFBO;
      } else {
        return this.getSourceFramebuffer(index - 1);
      }
    }

    return sourceFBO;
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

  addDirectionalLight (opts) {
    return this.addLight(UNI_KEY_DIR_LIGHT, XLight, MAX_DIR_LIGHTS, opts);
  }

  addSpotLight (opts) {
    return this.addLight(UNI_KEY_SPOT_LIGHT, XSpotLight, MAX_SPOT_LIGHTS, opts);
  }

  addPointLight (opts) {
    return this.addLight(UNI_KEY_POINT_LIGHT, XPointLight, MAX_POINT_LIGHTS, opts);
  }

  addLight (key, lightClass, maxLights, opts) {
    var lights = this.lights[key];
    if (lights.length >= maxLights) {
      console.warn(`Max ${key} exceeded, ignoring addLight call.`);
      return null;
    }

    this.needsShaderConnect = true;

    opts = opts || {};
    opts.gl = this.gl;
    opts.key = key;
    opts.index = lights.length;

    var light = new lightClass(opts);
    if (key !== UNI_KEY_POINT_LIGHT) this.addShadowsForLight(light, maxLights);
    lights.push(light);
    return light;
  }

  addShadowsForLight (light, maxLights) {
    if (!ENABLE_SHADOWS) return;

    var shadowFBO = XGLUtils.createDepthFramebuffer(this.gl, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    light.addShadowMapTexture(shadowFBO.depthTexture, this.reserveTextureUnit());

    this.addRenderPass(RENDER_PASS_SHADOWS, {
      framebuffer: shadowFBO.framebuffer,
      shader: this.getShadowShader(light.key, maxLights),
      uniforms: { lightIndex: light.index },
      viewport: { width: SHADOW_MAP_SIZE, height: SHADOW_MAP_SIZE },
      isBeforeMain: true
    });
  }

  getLight (key, index) {
    return this.lights[key][index];
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

  getFont (path, onLoad, type) {
    type = type || 'png';

    var cachedFont = this.fonts[path];
    if (cachedFont) {
      return onLoad(cachedFont);
    }

    XUtils.fetchJSON(`${path}data.json`, data => {
      var font = this.fonts[path] = new XFont({
        gl: this.gl,
        data: data,
        atlasPath: `${path}atlas.${type}`
      });

      onLoad(font);
    });
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
    var cpuStart = performance.now();
    this.stats.drawCalls = 0;
    this.stats.uniformCalls = 0;
    this.stats.uniformSkips = 0;
    this.stats.programCalls = 0;
    this.stats.objectsCulled = 0;

    var len = this.onDrawListeners.length;
    for (var i = len - 1; i >= 0; i--) {
      this.onDrawListeners[i](dt);
    }

    if (!this.isDrawing) return;

    var proj = this.matrices.projection.data;
    var view = this.matrices.view.data;
    this.currentProjViewMatrix = XMatrix4.multiply(proj, view);
    var frustumPlanes = XMatrix4.extractFrustumPlanes(this.currentProjViewMatrix);

    var gl = this.gl;

    if (DEBUG_LOGS) {
      var ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if (ext) {
        if (this.glQuery) {
          var available = gl.getQueryParameter(this.glQuery, gl.QUERY_RESULT_AVAILABLE);
          var disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
          if (available && !disjoint) {
            var timeElapsedNs = gl.getQueryParameter(this.glQuery, gl.QUERY_RESULT);
            var timeElapsedMs = timeElapsedNs / 1e6;  // convert ns => ms
            console.log('GPU time for last frame: ' + timeElapsedMs + ' ms');
            this.glQuery = null;
          }
        } else if (frameIndex % 60 === 0) {
          this.glQuery = gl.createQuery();
          gl.beginQuery(ext.TIME_ELAPSED_EXT, this.glQuery);
          this.queryEnded = false;
        }
      }
    }

    for (var passIndex = 0; passIndex < this.renderPasses.length; passIndex++) {
      var pass = this.renderPasses[passIndex];
      if (DEBUG_LIGHTS && pass.type !== RENDER_PASS_SHADOWS) continue;

      var framebuffer = pass.framebuffer || null;
      if (pass.framebufferKey) {
        var fbo = this.framebufferObjects[pass.framebufferKey];
        if (fbo && fbo.framebuffer) {
          framebuffer = fbo.framebuffer;
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

      var viewport = pass.viewport || this.viewport;
      var scale = viewport.scale || 1;
      var width = scale * (viewport.width || this.viewport.width);
      var height = scale * (viewport.height || this.viewport.height);
      gl.viewport(0, 0, width, height);

      var bgc = this.lights[UNI_KEY_BACKGROUND_LIGHT].getColor();
      gl.clearColor(bgc[0], bgc[1], bgc[2], 1.0);

      if (pass.isFirstDraw) {
        pass.isFirstDraw = false;
        gl.clearDepth(1.0);
        gl.enable(gl.BLEND);
        gl.depthFunc(gl.LEQUAL);
      }

      if (pass.type === RENDER_PASS_MAIN) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      } else {
        gl.disable(gl.CULL_FACE);
        gl.blendFunc(gl.ONE, gl.ZERO);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      }

      var objects = [];
      var objectCount = this.objects.length;
      for (var o = 0; o < objectCount; o++) {
        var obj = this.objects[o];
        if (!obj.renderPasses[pass.type] || !obj.isActive) continue;

        if (FRUSTUM_CULL_PASSES.indexOf(pass.type) !== -1) {
          if (!obj.ignoreFrustumCulling && !obj.isInFrustum(frustumPlanes)) {
            this.stats.objectsCulled++;
            continue;
          }
        }

        objects.push(obj);
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

      objects.forEach(obj => obj.updateCameraDistance(this.cameraPosition));
      objects.sort(OBJECT_RENDER_SORT);

      for (var i = 0; i < objects.length; i++) {
        // reset with each object
        this.drawingTextureUnitIndex = this.reservedTextureUnitIndex;

        var obj = objects[i];
        var material = obj.material;
        var shader = pass.shader || obj.shader;
        var isNewShader = isNewPass || this.lastShader !== shader;
        var isNewMaterial = isNewShader || this.lastMaterial !== material;

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
          this.stats.programCalls++;
          this.lastShader = shader;

          // apply global scene uniforms only once per shader
          this.applySceneMatrixUniforms(shader, isNewShader);
          this.applyLightUniforms(shader, isNewShader);
          this.applyUniforms(this.uniforms, shader, isNewShader);
          // render pass uniforms applied last to override any defaults
          this.applyUniforms(pass.uniforms, shader, isNewShader);
          this.bindTextures(pass.textures, shader, isNewShader);
        }

        // apply object matrices, or switch back to scene matrices
        this.applyObjectMatrixUniforms(obj, shader, isNewShader);

        // apply object uniforms
        this.applyUniforms(obj, shader, isNewShader);

        // apply material uniforms
        if (material && isNewMaterial) {
          this.applyUniforms(material, shader, isNewShader);
          this.lastMaterial = material;
        }

        this.applyAttributes(obj, shader);

        obj.draw();
        this.stats.drawCalls++;

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

    var cpuEnd = performance.now();
    var cpuTime = cpuEnd - cpuStart;
    if (DEBUG_LOGS && frameIndex % 60 === 0) {
      console.log(`Frame #${frameIndex} CPU draw time: ${cpuTime.toFixed(2)} ms`);
      console.log(`passes: ${this.renderPasses.length}`);
      console.log(`drawCalls: ${this.stats.drawCalls}`);
      console.log(`uniformCalls: ${this.stats.uniformCalls}`);
      console.log(`uniformSkips: ${this.stats.uniformSkips}`);
      console.log(`programCalls: ${this.stats.programCalls}`);
      console.log(`objectsCulled: ${this.stats.objectsCulled}`);
    }

    if (DEBUG_LOGS) {
      if (!this.queryEnded) {
        this.queryEnded = true;
        ext && gl.endQuery(ext.TIME_ELAPSED_EXT);
      }
    }
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

  applySceneMatrixUniforms (shader, force) {
    for (var key in this.matrices) {
      this.applyUniform(this.matrices[key], shader, force);
    }
  }

  replaceObjectMatricesWithScene (shader, force) {
    this.applyUniform(this.matrices.model, shader, force);
    this.applyUniform(this.matrices.normal, shader, force);
  }

  applyObjectMatrixUniforms (obj, shader, force) {
    var matrices = obj.matrices;
    if (!matrices && this.appliedObjectMatrices) {
      this.appliedObjectMatrices = false;
      return this.replaceObjectMatricesWithScene(shader, force);
    };

    for (var key in matrices) {
      this.applyUniform(matrices[key], shader, force);
    }

    this.appliedObjectMatrices = true;
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

    if (dictionary.getTextures) {
      this.bindTextures(dictionary.getTextures(), shader, force);
    }

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

      if (item.getTextures) {
        this.bindTextures(item.getTextures(), shader, force);
      }

      if (item.getUniforms) {
        this.applyUniformsList(item.getUniforms(), shader, force);
      } else {
        this.applyUniform(item, shader, force)
      }
    }
  }

  bindTextures (textures, shader, force) {
    if (textures.length) {
      textures.forEach((texture) => this.bindTexture(texture, shader, force));
    } else {
      for (var key in textures) {
        this.bindTexture(textures[key], shader, force);
      }
    }
  }

  bindTexture (texture, shader, force) {
    var uniform = texture.uniform;
    if (!this.shouldApplyUniform(uniform, shader, force, !texture.isReservedTextureUnit)) return;

    var location = shader.uniformLocations[uniform.key];
    texture.bind(location);
  }

  applyUniform (uniform, shader, force) {
    if (!this.shouldApplyUniform(uniform, shader, force, false)) return;

    var location = shader.uniformLocations[uniform.key];
    uniform.apply(this.gl, location);

    this.stats.uniformCalls++;
    VERBOSE && location && console.log(`uniform: ${uniform.key}, ${location}, ${uniform.data}`);
  }

  shouldApplyUniform (uniform, shader, force, isDrawingTextureUnit) {
    var location = shader.uniformLocations[uniform.key];
    if (location === NO_SHADER_LOCATION || location === null) {
      return false;
    }

    if (isDrawingTextureUnit) {
      uniform.data = this.getDrawingTextureUnit();
    }

    var uniformMap = this.shaderUniformCache.get(shader);
    if (!uniformMap) {
      uniformMap = new Map();
      this.shaderUniformCache.set(shader, uniformMap);
    }

    var canSkip = !force && !uniform.isDirty;
    if (canSkip) {
      var lastUniform = uniformMap.get(location);
      if (lastUniform && XUtils.areValuesEqual(lastUniform.data, uniform.data)) {
        VERBOSE && console.log(`uniform SKIPPED: ${uniform.key}, ${location}, ${uniform.data}`);
        this.stats.uniformSkips++;
        return false;
      }
    }

    uniformMap.set(location, uniform);
    return true;
  }

  applyAttributes (obj, shader) {
    var attributes = obj.attributes;
    var attribs = [];

    for (var key in attributes) {
      var attribute = attributes[key];
      var locKey = attribute.useTexture ? attribute.texture.uniform.key : key;
      var locSrc = attribute.useTexture ? shader.uniformLocations : shader.attributeLocations;
      var location = locSrc[locKey];
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

  selectObjects (screenX, screenY) {
    var ndcX = (screenX / this.viewport.width) * 2 - 1;
    var ndcY = 1 - (screenY / this.viewport.height) * 2;
    var nearClip = [ndcX, ndcY, -1, 1];
    var farClip = [ndcX, ndcY,  1, 1];

    var invProjView = XMatrix4.invert(this.currentProjViewMatrix);
    var nw4 = XMatrix4.multiplyWithVector(invProjView, nearClip);
    var fw4 = XMatrix4.multiplyWithVector(invProjView, farClip);
    var nearWorld = [nw4[0] / nw4[3], nw4[1] / nw4[3], nw4[2] / nw4[3]];
    var farWorld = [fw4[0] / fw4[3], fw4[1] / fw4[3], fw4[2] / fw4[3]];

    var rayOrigin = nearWorld;
    var rayDir = XVector3.normalize(XVector3.subtract(farWorld, nearWorld));

    var hitObjects = [];
    for (var i = 0; i < this.objects.length; i++) {
      var obj = this.objects[i];
      if (!obj.vertexCount || !obj.isActive) continue;

      var collisionDist = obj.intersectsRay(rayOrigin, rayDir);
      if (collisionDist === null) continue;

      hitObjects.push({ obj, collisionDist });
    }

    hitObjects.sort((a, b) => a.collisionDist - b.collisionDist);

    return hitObjects;
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

    for (var key in this.framebufferObjects) {
      this.framebufferObjects[key].remove();
    }

    this.shaderUniformCache = null;
  }

}
