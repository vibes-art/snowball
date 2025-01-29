var CANVAS_2D = '2d';
var CANVAS_WEBGL = 'webgl2';

class XCanvas {

  constructor (opts) {
    this.type = opts.type || CANVAS_WEBGL;
    this.canvasOpts = opts.canvasOpts || {
      antialias: USE_MSAA,
      depth: true,
      alpha: false
    };

    this.useSupersampleAA = this.type === CANVAS_WEBGL
      && !this.canvasOpts.antialias
      && AA_SUPERSAMPLE > 1;
    this.scaleAA = this.useSupersampleAA ? AA_SUPERSAMPLE : 1;
    this.width = ceil(this.scaleAA * (opts.width || 0));
    this.height = ceil(this.scaleAA * (opts.height || 0));
    this.isWindowFit = this.width === 0;

    this.canvas = null;
    this.ctx = null;
    this.onTickListener = null;
    this.keysDown = {};
    this.isInitialized = false;
    this.hasSavedOutput = false;
    this.isLiveRendering = true;
    this.skipFlush = false;
    this.acceptInput = false;
    this.isDragging = false;
    this.dragLast = { x: 0, y: 0 };
    this.effects = [];

    window.onload = () => this.init();
  }

  get gl () {
    return this.type === CANVAS_WEBGL ? this.ctx : null;
  }

  init () {
    this.setDimensions();

    var isWebGL = this.type === CANVAS_WEBGL;
    var hasWorkingGL = isWebGL;
    if (!this.isInitialized) {
      this.createElements();
      this.listenForInput();
      hasWorkingGL = hasWorkingGL && this.checkGL();
    }

    if (isWebGL) {
      hasWorkingGL && this.initScene();
    } else {
      this.prepareRenderLoop();
    }

    this.resizeCanvas();

    this.isInitialized = true;
  }

  initScene (opts) {
    opts = opts || {};
    opts.projectionMatrix = this.getProjectionMatrix();

    this.scene = new XScene({ gl: this.gl, ...opts });

    this.initLights(opts);
    this.initShader(opts);
    this.initCamera(opts);
    this.initEffects(opts);

    if (this.useSupersampleAA) {
      this.initFullscreenQuad(opts);
    }

    // process effect links after all render passes and FBOs are initialized
    for (var i = 0; i < this.effects.length; i++) {
      var effect = this.effects[i];
      effect.queuedFBOUniformLinks.forEach(link => {
        this.scene.framebufferObjects[link.fboKey].linkUniform(link.uniform);
      });
      effect.queuedFBOUniformLinks.length = 0;
    }

    this.onNextFrame(() => this.initObjects());
  }

  initLights (opts) {
    this.scene.addLight({
      color: [0.5, 0.5, 0.5, 1],
      direction: [-0.5, 1, -0.25]
    });
  }

  initShader (opts) {
    if (!this.shader) {
      if (USE_PBR) {
        this.shader = new XPBRShader({ scene: this.scene });
        this.textureShader = new XPBRTexShader({ scene: this.scene });
      } else {
        this.shader = new XShader({ scene: this.scene });
        this.textureShader = null;
      }
    }

    this.scene.setPrimaryShaders(this.shader, this.textureShader);
  }

  initCamera (opts) {
    this.camera = new XCamera({
      sensitivity: this.dragSensitivity,
      position: opts.cameraPosition,
      rotation: opts.cameraRotation,
      velocityMax: opts.cameraVelocityMax,
      accelTime: opts.cameraAccelTime
    });
  }

  initEffects (opts) {
    if (ENABLE_BLOOM) {
      this.effects.push(new XBloomEffect({
        scene: this.scene,
        width: this.width,
        height: this.height,
        threshold: 1,
        intensity: 0.07,
        scale: 0.5
      }));
    }
  }

  initFullscreenQuad (opts) {
    this.fullscreenQuad = new XQuad({
      gl: this.gl,
      scene: this.scene,
      shader: new XPassthroughShader({ scene: this.scene }),
      vertices: [
        { position: [-1, -1, 0], color: [1, 1, 1, 1] },
        { position: [ 1, -1, 0], color: [1, 1, 1, 1] },
        { position: [ 1,  1, 0], color: [1, 1, 1, 1] },
        { position: [-1,  1, 0], color: [1, 1, 1, 1] }
      ]
    });

    this.fullscreenQuad.enableRenderPass(RENDER_PASS_LIGHTS, false);
    this.fullscreenQuad.enableRenderPass(RENDER_PASS_MAIN, false);
    this.fullscreenQuad.enableRenderPass(RENDER_PASS_BLOOM_EXTRACT, ENABLE_BLOOM);
    this.fullscreenQuad.enableRenderPass(RENDER_PASS_BLOOM_BLUR_HORZ, ENABLE_BLOOM);
    this.fullscreenQuad.enableRenderPass(RENDER_PASS_BLOOM_BLUR_VERT, ENABLE_BLOOM);
    this.fullscreenQuad.enableRenderPass(RENDER_PASS_BLOOM_COMBINE, ENABLE_BLOOM);
    this.fullscreenQuad.enableRenderPass(RENDER_PASS_ANTIALIAS, true);

    var mainRenderPass = this.scene.getRenderPass(RENDER_PASS_MAIN);
    mainRenderPass.framebufferKey = RENDER_PASS_MAIN;

    var fbo = this.scene.addFramebuffer(RENDER_PASS_MAIN, {
      width: this.width,
      height: this.height
    });

    var linkFBO = ENABLE_BLOOM ? this.scene.framebufferObjects[RENDER_PASS_BLOOM_COMBINE] : fbo;
    linkFBO.linkAttribute(this.fullscreenQuad, ATTR_KEY_COLORS);

    this.scene.addRenderPass(RENDER_PASS_ANTIALIAS);
  }

  initObjects () {
    this.onNextFrame(() => this.prepareRenderLoop());
  }

  prepareRenderLoop () {
    this.skipFlush = this.type === CANVAS_2D;
    this.acceptInput = true;

    this.onTickListener = (dt, dtReal) => this.draw(dt, dtReal);
    XClock.onTick(this.onTickListener);
  }

  reset (isError) {
    this.skipFlush = true;
    this.hasSavedOutput = false;

    this.scene && this.scene.remove();
    this.scene = null;

    XClock.reset();
    XTimeline.reset();
    this.onTickListener = null;
    this.shader = null;
    this.textureShader = null;

    setTimeout(() => this.init(), 0);
  }

  flushScene () {
    if (this.skipFlush || !this.isLiveRendering) return;

    this.scene.enableDraw(true);
    this.updateCamera(0);
    this.scene.draw(0);
    this.scene.enableDraw(this.isLiveRendering);
    this.gl.flush();
    this.gl.finish();
  }

  onNextFrame (callback) {
    this.flushScene();
    XClock.onNextTick(callback);
  }

  setDimensions () {
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;
    this.width = this.isWindowFit ? ceil(this.scaleAA * this.windowWidth) : this.width;
    this.height = this.isWindowFit ? ceil(this.scaleAA * this.windowHeight) : this.height;
    this.dragSensitivity = PI / this.windowWidth;
  }

  createElements () {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext(this.type, this.canvasOpts);
    document.body.appendChild(this.canvas);

    this.setResizeHandler();
  }

  checkGL () {
    var gl = this.gl;
    if (gl === null) {
      console.error('Error: No WebGL');
      return false;
    };

    var floatTextureLinearExt = gl.getExtension('OES_texture_float_linear');
    if (!floatTextureLinearExt && USE_FLOATING_POINT_TEXTURES) {
      USE_FLOATING_POINT_TEXTURES = false;
      console.warn('Floating point textures fallback triggered.');
      this.reset(false);
      return false;
    }

    var colorBufferFloatExt = gl.getExtension('EXT_color_buffer_float');
    if (!colorBufferFloatExt) {
      COLOR_BUFFER_FLOAT_ENABLED = false;
      console.warn('EXT_color_buffer_float is not supported!');
    };

    var colorBufferHalfFloatExt = gl.getExtension('EXT_color_buffer_half_float');
    if (!colorBufferHalfFloatExt) {
      COLOR_BUFFER_HALF_FLOAT_ENABLED = false;
      console.warn('EXT_color_buffer_half_float is not supported!');
    };

    this.canvas.addEventListener('webglcontextlost', (evt) => {
      evt.preventDefault();
      console.error("WebGL context lost!");
      this.reset(true);
    }, false);

    return true;
  }

  setResizeHandler () {
    window.addEventListener('resize', () => {
      this.setDimensions();
      this.resizeCanvas();
    }, true);
  }

  resizeCanvas (canvas, width, height) {
    canvas = canvas || this.canvas;
    width = width || this.width;
    height = height || this.height;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (canvas === this.canvas) {
      var scaledWidth = ceil(width / this.scaleAA);
      var scaledHeight = ceil(height / this.scaleAA);
      var x = (this.windowWidth - scaledWidth) / 2;
      var y = (this.windowHeight - scaledHeight) / 2;
      canvas.style.left = x + 'px';
      canvas.style.top = y + 'px';
      canvas.style.width = scaledWidth + 'px';
      canvas.style.height = scaledHeight + 'px';
      canvas.style.margin = 'none';
      canvas.style.position = 'absolute';

      this.gl && this.onGLResize(width, height);
    }
  }

  onGLResize (width, height) {
    this.gl.viewport(0, 0, width, height);

    if (this.scene) {
      this.scene.onResize(width, height, this.getProjectionMatrix());
      this.effects.forEach(effect => effect.onResize(width, height));
    }
  }

  getProjectionMatrix () {
    var fieldOfView = CAMERA_FOV;
    var aspect = this.canvas.width / this.canvas.height;
    var zNear = CAMERA_Z_NEAR;
    var zFar = CAMERA_Z_FAR;
    return XMatrix4.perspective(fieldOfView, aspect, zNear, zFar);
  }

  listenForInput () {
    document.addEventListener("keydown", (evt) => this.onKeyDown(evt), false);
    document.addEventListener("keyup", (evt) => this.onKeyUp(evt), false);
    window.addEventListener("mousedown", (evt) => this.onMouseDown(evt));
    window.addEventListener("mousemove", (evt) => this.onMouseMove(evt));
    window.addEventListener("mouseup", (evt) => this.onMouseUp(evt));
    window.addEventListener("wheel", (evt) => this.onMouseWheel(evt));
    window.addEventListener("touchstart", (evt) => this.onTouchStart(evt), { passive: false });
    window.addEventListener("touchmove", (evt) => this.onTouchMove(evt), { passive: false });
    window.addEventListener("touchend", (evt) => this.onTouchEnd(evt), { passive: false });
    window.addEventListener("touchcancel", (evt) => this.onTouchEnd(evt), { passive: false });
  }

  onKeyDown (evt) {
    if (!this.acceptInput) return;

    var key = evt.key.toUpperCase();
    this.keysDown[key] = true;

    this.camera && this.camera.onKeyDown(evt);

    return key;
  }

  onKeyUp (evt) {
    if (!this.acceptInput) return;

    var key = evt.key.toUpperCase();
    this.keysDown[key] = false;

    this.camera && this.camera.onKeyUp(evt);

    return key;
  }

  onMouseDown (evt) {
    if (!this.acceptInput) return;

    this.isDragging = true;
    this.dragLast.x = evt.x;
    this.dragLast.y = evt.y;

    this.camera && this.camera.onMouseDown(evt);
  }

  onMouseMove (evt) {
    if (!this.acceptInput || !this.isDragging) return;

    var dx = evt.x - this.dragLast.x;
    var dy = evt.y - this.dragLast.y;
    this.dragLast.x = evt.x;
    this.dragLast.y = evt.y;

    this.camera && this.camera.onMouseMove(evt, dx, dy);
  }

  onMouseUp (evt) {
    if (!this.acceptInput) return;

    this.isDragging = false;

    this.camera && this.camera.onMouseUp(evt);
  }

  onMouseWheel (evt) { this.camera && this.camera.onMouseWheel(evt); }

  // by default, touch events mimic mouse events
  onTouchStart (touchEvt) {
    touchEvt.preventDefault();

    var touch = touchEvt.touches[0];
    if (touch) {
      this.onMouseDown({
        x: touch.clientX,
        y: touch.clientY
      });
    }
  }

  onTouchMove (touchEvt) {
    touchEvt.preventDefault();

    var touch = touchEvt.touches[0];
    if (touch) {
      this.onMouseMove({
        x: touch.clientX,
        y: touch.clientY
      });
    }
  }

  onTouchEnd (touchEvt) {
    var touch = touchEvt.changedTouches[0];
    if (touch) {
      this.onMouseUp({
        x: touch.clientX,
        y: touch.clientY
      });
    }
  }

  saveOutput (opts) {
    opts = opts || {};
    var srcX = opts.srcX || 0;
    var srcY = opts.srcY || 0;
    var srcWidth = opts.srcWidth || this.width;
    var srcHeight = opts.srcHeight || this.height;
    var destWidth = opts.destWidth || this.width;
    var destHeight = opts.destHeight || this.height;
    var name = opts.name || 'output';
    var callback = opts.callback || null;

    if (this.gl) {
      this.gl.flush();
      this.gl.finish();
    }

    var renderCanvas = document.createElement('canvas');
    var renderCtx = renderCanvas.getContext(CANVAS_2D);
    renderCanvas.width = destWidth;
    renderCanvas.height = destHeight;
    renderCtx.drawImage(this.canvas,
      srcX, srcY, srcWidth, srcHeight,
      0, 0, destWidth, destHeight);

    XUtils.processImage(renderCanvas, destWidth, destHeight, (outputCanvas) => {
      if (!IS_HEADLESS) {
        var outputName = `${name}.png`;
        XUtils.downloadCanvas(outputCanvas, outputName, (blob) => callback && callback(blob));
      } else {
        document.body.removeChild(this.canvas);
        document.body.appendChild(outputCanvas);
        this.resizeCanvas(outputCanvas, destWidth, destHeight);
      }
    });
  }

  clearInput () {
    this.keysDown = {};
    this.isDragging = false;
    this.dragLast = { x: 0, y: 0 };
  }

  resetCamera () {
    this.clearInput();
    this.camera.reset();
  }

  stopCamera () {
    this.clearInput();
    this.camera.stop();
  }

  updateCamera (dt) {
    this.camera.onTick(dt, this.keysDown);
    this.scene.matrices.view.data = this.camera.getViewMatrix();
  }

  draw (dt, dtReal) {
    if (this.gl) {
      this.updateCamera(dtReal);
      this.scene.draw(dt);
    }
  }

}
