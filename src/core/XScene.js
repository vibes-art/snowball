class XScene {

  constructor (opts) {
    this.gl = opts.gl;

    this.objects = [];
    this.lights = {};
    this.matrices = {};
    this.onDrawListeners = [];
    this.lastAttribs = [];
    this.lastShader = null;
    this.lastObject = null;
    this.lastObjectCount = 0;
    this.isFirstDraw = true;
    this.isDrawing = LIVE_RENDER;

    this.initializeLights(opts);
    this.initializeMatrices(opts);
  };

  initializeLights (opts) {
    var ambientLightColor = (!SHOW_NORMAL_MAPS && opts.ambientLightColor) || AMBIENT_LIGHT;
    var backgroundColor = opts.backgroundColor || BG_COLOR;
    this.lights.ambient = new XLight({ key: 'ambient', color: ambientLightColor });
    this.lights.background = new XLight({ key: 'background', color: backgroundColor });
    this.lights.directional = [];
    this.lightCount = new XUniform({
      key: 'lightCount',
      type: UNIFORM_TYPE_INT,
      components: 1
    });
  }

  initializeMatrices (opts) {
    this.matrices.projection = new XUniform({ key: 'projectionMatrix', type: UNIFORM_TYPE_MATRIX });
    this.matrices.model = new XUniform({ key: 'modelMatrix', type: UNIFORM_TYPE_MATRIX });
    this.matrices.view = new XUniform({ key: 'viewMatrix', type: UNIFORM_TYPE_MATRIX });
    this.matrices.normal = new XUniform({ key: 'normalMatrix', type: UNIFORM_TYPE_MATRIX });

    this.matrices.projection.data = opts.projectionMatrix || XMatrix4.get();

    var msx = opts.modelScaleX || 1;
    var msy = opts.modelScaleY || 1;
    var msz = opts.modelScaleZ || 1;
    this.matrices.model.data = XMatrix4.scale(this.matrices.model.data, msx, msy, msz);
    this.matrices.normal.data = XMatrix4.invert(this.matrices.model.data);
    this.matrices.normal.data = XMatrix4.transpose(this.matrices.normal.data);
  }

  addObject (object) {
    this.objects.push(object);
    object.onDraw && this.onDraw(object, (dt) => object.onDraw(dt));
    object.isActive = true;
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
  }

  addLight (opts) {
    var lights = this.lights.directional;
    if (lights.length >= MAX_LIGHTS) {
      console.warn(`MAX_LIGHTS exceeded, ignoring addLight call.`);
      return;
    }

    opts = opts || {};
    opts.key = `light`;
    opts.index = lights.length;
    opts.direction = XUtils.normalize(opts.direction);
    lights.push(new XLight(opts));
    this.lightCount.data = lights.length;
  }

  enableDraw (isEnabled) {
    this.isDrawing = isEnabled;
  }

  onDraw (object, cb) {
    object.onDrawCB = cb;
    this.onDrawListeners.push(cb);
  }

  draw (dt) {
    var logDetails = VERBOSE && Math.random() < 0.01;
    var len = this.onDrawListeners.length;
    logDetails && console.log("draw listeners: ", len);
    for (var i = len - 1; i >= 0; i--) {
      this.onDrawListeners[i](dt);
    }

    if (!this.isDrawing) return;

    var gl = this.gl;
    var bgc = this.lights.background.getColor();
    gl.clearColor(bgc[0], bgc[1], bgc[2], 1.0);

    if (this.isFirstDraw) {
      this.isFirstDraw = false;
      gl.clearDepth(1.0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var objects = this.objects;
    var objectCount = objects.length;
    var hasObjectDiff = objectCount !== this.lastObjectCount;
    this.lastObjectCount = objectCount;
    logDetails && console.log("obj count: ", objectCount);

    for (var i = 0; i < objectCount; i++) {
      var obj = objects[i];
      var shader = obj.shader;
      var shouldRefresh = i === 0 && hasObjectDiff;
      var shouldBindBuffers = shouldRefresh;
      var isNewShader = this.lastShader !== shader;

      if (isNewShader || shouldRefresh) {
        gl.useProgram(shader.getProgram());
        this.lastShader = shader;
        shouldBindBuffers = true;
      }

      this.applyMatrixUniforms(obj, shader, isNewShader);
      this.applyLightUniforms(shader, isNewShader);
      this.applyObjectUniforms(obj, shader, isNewShader);

      if (shouldBindBuffers || this.lastObject !== obj || obj.isDirty) {
        this.bindBuffers(obj, shader);
        this.lastObject = obj;
      }

      obj.draw();
    }

    this.onDrawFinish();
  }

  onDrawFinish () {
    var objects = this.objects;
    var objectCount = objects.length;
    for (var i = objectCount - 1; i >= 0; i--) {
      var obj = objects[i];
      obj.onDrawFinish && obj.onDrawFinish();
    }
  }

  applyMatrixUniforms (obj, shader, isNewShader) {
    for (var key in this.matrices) {
      var objMatrix = obj.matrices && obj.matrices[key];
      var srcMatrix = objMatrix || this.matrices[key];
      this.applyUniform(srcMatrix, shader, isNewShader);
    }
  }

  applyLightUniforms (shader, isNewShader) {
    for (var key in this.lights) {
      var lightType = this.lights[key];
      if (lightType.length !== undefined) {
        this.applyDirectionalLightUniforms(lightType, shader, isNewShader);
      } else {
        this.applyUniform(lightType.color, shader, isNewShader);
      }
    }
  }

  applyDirectionalLightUniforms (directionalLights, shader, isNewShader) {
    this.applyUniform(this.lightCount, shader, isNewShader);

    for (var i = 0; i < directionalLights.length; i++) {
      this.applyUniform(directionalLights[i].direction, shader, isNewShader);
      this.applyUniform(directionalLights[i].color, shader, isNewShader);
    }
  }

  applyObjectUniforms (obj, shader, isNewShader) {
    for (var key in obj.uniforms) {
      this.applyUniform(obj.uniforms[key], shader, isNewShader);
    }
  }

  applyUniform (uniform, shader, isNewShader) {
    if (!isNewShader && !uniform.isDirty) return;

    var location = shader.uniformLocations[uniform.key];
    if (location === NO_SHADER_LOCATION) return;

    uniform.apply(this.gl, location);
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
      if (location === NO_SHADER_LOCATION) continue;

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
