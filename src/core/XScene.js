var frameIndex = 0;

class XScene {

  constructor (opts) {
    this.gl = opts.gl;

    this.objects = [];
    this.lights = {};
    this.matrices = {};

    this.onDrawListeners = [];
    this.isDrawing = LIVE_RENDER;

    this.textureUnitIndex = 0;
    this.lastAttribs = [];
    this.lastShader = null;
    this.haveObjectsChanged = false;
    this.needsShaderConnect = false;

    this.renderPasses = [];
    this.addRenderPass(RENDER_PASS_MAIN);

    this.viewport = {};
    this.resolution = new XUniform({ key: UNI_KEY_RESOLUTION, components: 2 });

    this.initLights(opts);
    this.initMatrices(opts);
  };

  initLights (opts) {
    var ambientLightColor = (!SHOW_NORMAL_MAPS && opts.ambientLightColor) || AMBIENT_LIGHT;
    var backgroundColor = opts.backgroundColor || BG_COLOR;

    this.lights.ambient = new XLight({ key: UNI_KEY_AMBIENT_LIGHT, color: ambientLightColor });
    this.lights.background = new XLight({ key: UNI_KEY_BACKGROUND_LIGHT, color: backgroundColor });
    this.lights.directional = [];
    this.lights.point = [];

    this.lightCount = new XUniform({
      key: UNI_KEY_DIRECTIONAL_LIGHT_COUNT,
      type: UNI_TYPE_INT,
      components: 1
    });

    this.pointLightCount = new XUniform({
      key: UNI_KEY_POINT_LIGHT_COUNT,
      type: UNI_TYPE_INT,
      components: 1
    });

    var fogColor = opts.fogColor || backgroundColor;
    var fogDensity = opts.fogDensity || 0.0001;
    this.fog = {
      color: new XUniform({ key: UNI_KEY_FOG_COLOR, components: 3, data: fogColor }),
      density: new XUniform({ key: UNI_KEY_FOG_DENSITY, components: 1, data: fogDensity })
    };

    var attenConst = opts.attenConst !== undefined ? opts.attenConst : ATTEN_CONST;
    var attenLinear = opts.attenLinear !== undefined ? opts.attenLinear : ATTEN_LINEAR;
    var attenQuad = opts.attenQuad !== undefined ? opts.attenQuad : ATTEN_QUAD;
    this.attenuation = {
      const: new XUniform({ key: UNI_KEY_ATTEN_CONST, components: 1, data: attenConst }),
      linear: new XUniform({ key: UNI_KEY_ATTEN_LINEAR, components: 1, data: attenLinear }),
      quad: new XUniform({ key: UNI_KEY_ATTEN_QUAD, components: 1, data: attenQuad }),
    };
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

  addObject (object) {
    this.objects.push(object);
    object.onDraw && this.onDraw(object, (dt) => object.onDraw(dt));
    object.isActive = true;
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

    var shadowFBO = XGLUtils.createDepthFramebuffer(this.gl, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    light.addShadowMapTexture(shadowFBO.depthTexture, this.textureUnitIndex++);

    if (!this.shadowShader) {
      this.shadowShader = new XShadowShader({ scene: this })
    };

    this.addRenderPass(RENDER_PASS_LIGHTS, {
      framebuffer: shadowFBO.framebuffer,
      shader: this.shadowShader,
      uniforms: { lightIndex: light.index },
      viewport: { width: SHADOW_MAP_SIZE, height: SHADOW_MAP_SIZE },
      isBeforeMain: true
    });

    lights.push(light);
    this.lightCount.data = lights.length;
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
    this.pointLightCount.data = pointLights.length;
    this.needsShaderConnect = true;
  }

  enableDraw (isEnabled) {
    this.isDrawing = isEnabled;
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

      if (pass.framebuffer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, pass.framebuffer);
      }

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

      for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var shader = pass.shader || obj.shader;
        var isNewShader = this.lastShader !== shader;

        gl.frontFace(obj.frontFace);

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

        this.applyMatrixUniforms(obj, shader, isNewShader);
        this.applyLightUniforms(shader, isNewShader);

        this.applyUniform(this.resolution, shader, isNewShader);
        this.applyUniforms(this.fog, shader, isNewShader);
        this.applyUniforms(this.attenuation, shader, isNewShader);
        this.applyUniforms(obj, shader, true);
        this.applyUniforms(obj.material, shader, true);
        // render pass uniforms applied last to override any defaults
        // pass true here to always apply render pass specific uniforms
        this.applyUniforms(pass.uniforms, shader, true);

        this.bindBuffers(obj, shader);

        obj.draw();
      }

      if (DEBUG_LIGHTS) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, pass.framebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(
          0, 0, viewport.width, viewport.height,
          0, 0, this.viewport.width, this.viewport.height,
          gl.COLOR_BUFFER_BIT, gl.NEAREST
        );
      }

      if (pass.framebuffer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }

    frameIndex++;

    this.onDrawFinish();
  }

  onDrawFinish () {
    this.needsShaderConnect = false;
    this.haveObjectsChanged = false;

    var objects = this.objects;
    var objectCount = objects.length;
    for (var i = objectCount - 1; i >= 0; i--) {
      var obj = objects[i];
      obj.onDrawFinish && obj.onDrawFinish();
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
        var count = key === 'point' ? this.pointLightCount : this.lightCount;
        this.applyUniform(count, shader, force);
        this.applyLightListUniforms(lightType, shader, force);
      } else {
        this.applyUniform(lightType.color, shader, force);
      }
    }
  }

  applyLightListUniforms (lights, shader, force) {
    for (var i = 0; i < lights.length; i++) {
      var uniforms = lights[i].getUniforms();
      uniforms.forEach((uniform) => this.applyUniform(uniform, shader, force));
    }
  }

  applyUniforms (dictionary, shader, force) {
    if (!dictionary) return;
    if (dictionary.getUniforms) {
      return this.applyUniforms(dictionary.getUniforms(), shader, force);
    }

    for (var key in dictionary) {
      this.applyUniform(dictionary[key], shader, force);
    }
  }

  applyUniform (uniform, shader, force) {
    var location = shader.uniformLocations[uniform.key];
    if (location === NO_SHADER_LOCATION || location === null) return;

    uniform.apply(this.gl, location, force);
  }

  bindBuffers (obj, shader) {
    var gl = this.gl;
    var attributes = obj.attributes;
    var attribs = [];

    for (var key in attributes) {
      var attribute = attributes[key];
      if (!attribute.buffer) continue;

      var target = attribute.bufferTarget ? attribute.bufferTarget : gl.ARRAY_BUFFER;
      gl.bindBuffer(target, attribute.buffer);

      var location = shader.attributeLocations[key];
      if (location === NO_SHADER_LOCATION || location === null) continue;

      var num = attribute.components;
      var type = gl.FLOAT;
      var normalize = false;
      var stride = 0;
      var offset = 0;
      gl.vertexAttribPointer(location, num, type, normalize, stride, offset);
      gl.enableVertexAttribArray(location);
      attribs.push(location);
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
  }

}
