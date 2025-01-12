var DEFAULT_SENSITIVITY = 0.0005;

class XCamera extends XMovableModel {

  constructor (opts) {
    super(opts);

    this.sensitivity = opts.sensitivity || DEFAULT_SENSITIVITY;
    this.rotation = opts.rotation || [0, 0, 0];
    this.positionInitial = this.position.slice();
    this.rotationInitial = this.rotation.slice();

    this.lookAtPoint = opts.lookAtPoint || null;
    this.lookAtPointInitial = opts.lookAtPoint ? opts.lookAtPoint.slice() : null;
    this.lookAtMatrix = null;
    if (this.lookAtPoint) {
      this.lookAt(this.lookAtPoint);
    }

    ENABLE_LOGS && this.logControls();
  }

  logControls () {}

  reset () {
    this.position = this.positionInitial.slice();

    if (this.lookAtPointInitial) {
      this.lookAt(this.lookAtPointInitial);
    } else {
      this.setRotation(this.rotationInitial.slice());
    }

    this.stop();
  }

  lookAt (lookAtPoint) {
    this.lookAtPoint = lookAtPoint.slice();
    this.lookAtMatrix = XMatrix4.lookAt(this.position, this.lookAtPoint, UP_VECTOR);
    this.rotation = this.getRotationFromMatrix(XMatrix4.invert(this.lookAtMatrix));
  }

  getRotationFromMatrix (m) {
    var yaw = atan2(-m[2], m[10]);
    var pitch = -asin(m[9]);
    return [yaw, pitch, 0];
  }

  setRotation (rotation) {
    this.rotation = rotation;
    this.lookAtPoint = null;
    this.lookAtMatrix = null;
  }

  getViewMatrix () {
    if (this.lookAtMatrix) {
      return this.lookAtMatrix;
    }

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
