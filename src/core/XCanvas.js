var CANVAS_2D = '2d';
var CANVAS_WEBGL = 'webgl2';

class XCanvas {

  constructor (opts) {
    this.type = opts.type || CANVAS_WEBGL;
    this.width = opts.width || 0;
    this.height = opts.height || 0;

    this.onTickListener = null;
    this.keysDown = {};
    this.isInitialized = false;
    this.isLiveRendering = true;
    this.skipFlush = false;
    this.acceptInput = false;
    this.isDragging = false;
    this.dragLast = { x: 0, y: 0 };
    this.isWindowFit = this.width === 0;

    window.onload = () => this.init();
  }

  init () {
    this.hasSavedOutput = false;

    this.setDimensions();

    var hasWorkingGL = true;
    if (!this.isInitialized) {
      this.createElements();
      this.listenForInput();
      hasWorkingGL = this.checkGL();
    }

    if (hasWorkingGL) {
      this.resizeCanvas();
      this.initScene();
      this.isInitialized = true;
    }
  }

  initScene (opts) {
    opts = opts || {};
    opts.projectionMatrix = this.getProjectionMatrix();

    this.scene = new XScene({ gl: this.gl, ...opts });

    this.initLights(opts);
    this.initShader(opts);
    this.initCamera(opts);

    this.onNextFrame(() => this.initObjects());
  }

  initLights (opts) {
    this.scene.addLight({
      color: [0.5, 0.5, 0.5, 1],
      direction: [-0.5, 1, -0.25]
    });
  }

  initShader (opts) {
    this.shader = new XShader({ scene: this.scene });
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

  initObjects () {
    this.onNextFrame(() => this.prepareRenderLoop());
  }

  prepareRenderLoop () {
    this.skipFlush = false;
    this.acceptInput = true;

    this.onTickListener = (dt, dtReal) => this.draw(dt, dtReal);
    XClock.onTick(this.onTickListener);
  }

  reset (isError) {
    this.skipFlush = true;

    this.scene && this.scene.remove();
    this.scene = null;

    XClock.reset();
    this.onTickListener = null;

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
    this.width = this.isWindowFit ? this.windowWidth : this.width;
    this.height = this.isWindowFit ? this.windowHeight : this.height;
    this.dragSensitivity = PI / this.width;
  }

  createElements () {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.gl = this.canvas.getContext(this.type);
    document.body.appendChild(this.canvas);

    this.canvas.addEventListener('webglcontextlost', (evt) => {
      evt.preventDefault();
      console.error("WebGL context lost!");
      this.reset(true);
    }, false);

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
      console.log('Floating point textures fallback triggered.');
      this.reset(false);
      return false;
    }

    var colorBufferFloatExt = gl.getExtension('EXT_color_buffer_float');
    if (!colorBufferFloatExt) {
      console.error('EXT_color_buffer_float is not supported!');
    };

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

    var scale = this.windowHeight / height;
    canvas.style.scale = scale;
    canvas.style.top = '0';
    canvas.style.left = floor((this.windowWidth - width) / 2) + 'px';
    canvas.style.bottom = '0';
    canvas.style.right = '0';
    canvas.style.margin = 'auto';
    canvas.style.position = 'absolute';

    if (canvas === this.canvas) {
      this.gl.viewport(0, 0, width, height);
      this.scene && (this.scene.matrices.projection.data = this.getProjectionMatrix());
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
  onTouchStart (evt) { this.camera && this.camera.onTouchStart(evt); }
  onTouchMove (evt) { this.camera && this.camera.onTouchMove(evt); }
  onTouchEnd (evt) { this.camera && this.camera.onTouchEnd(evt); }

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

    this.gl.flush();
    this.gl.finish();

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
        XUtils.downloadCanvas(outputCanvas, outputName, (blob) => callback(blob));
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
    this.updateCamera(dtReal);
    this.scene.draw(dt);
  }

}
