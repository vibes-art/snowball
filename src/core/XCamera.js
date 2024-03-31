var DEFAULT_SENSITIVITY = 0.0005;

class XCamera extends XMovableModel {

  constructor (opts) {
    super(opts);

    this.sensitivity = opts.sensitivity || DEFAULT_SENSITIVITY;
    this.rotation = opts.rotation || [0, 0, 0];
    this.positionInitial = this.position.slice();
    this.rotationInitial = this.rotation.slice();

    ENABLE_LOGS && this.logControls();
  }

  logControls () {}

  reset () {
    this.position = this.positionInitial.slice();
    this.rotation = this.rotationInitial.slice();
    this.stop();
  }

  getViewMatrix () {
    var viewMatrix = XMatrix4.get();
    viewMatrix = XMatrix4.translate(viewMatrix, this.position[0], this.position[1], this.position[2]);
    viewMatrix = XMatrix4.rotateY(viewMatrix, this.rotation[0]);
    viewMatrix = XMatrix4.rotateX(viewMatrix, this.rotation[1]);
    return XMatrix4.invert(viewMatrix);
  }

  onKeyDown (evt) {}
  onKeyUp (evt) {}
  onMouseDown (evt) {}
  onMouseMove (evt, dx, dy) {}
  onMouseUp (evt) {}
  onMouseWheel (evt) {}
  onTouchStart (evt) {}
  onTouchMove (evt) {}
  onTouchEnd (evt) {}

}
