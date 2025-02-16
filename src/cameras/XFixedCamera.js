class XFixedCamera extends XCamera {

  constructor (opts) {
    super(opts);

    this.yaw = 0;
    this.pitch = 0;
    this.quaternion = XQuaternion.get();

    this.mouseScrollUp = null;
    this.mouseScrollDown = null;
    this.lockRotation = false;
  }

  logControls () {
    if (!ENABLE_LOGS) return;

    console.log(` `);
    console.log(`~~~ Fixed Camera Controls ~~~`);
    console.log(`    Click and drag Mouse to rotate`);
    console.log(`    Scroll Mouse Wheel to zoom`);
    console.log(` `);
  }

  onMouseMove (evt, dx, dy) {
    if (this.lockRotation) return;

    var maxAngle = PI / 3;
    var oldYaw = this.yaw;
    var oldPitch = this.pitch;
    var yawDelta = dx * this.sensitivity;
    var pitchDelta = dy * this.sensitivity;

    this.yaw = max(-maxAngle, min(maxAngle, this.yaw + yawDelta));
    yawDelta = this.yaw - oldYaw;
    var qYaw = XQuaternion.fromAxisAngle(UP_VECTOR, yawDelta);

    var localX = XQuaternion.transformVector(this.quaternion, [1, 0, 0]);
    localX = XVector3.normalize(localX);
    this.pitch = max(-maxAngle, min(maxAngle, this.pitch + pitchDelta));
    pitchDelta = this.pitch - oldPitch;
    var qPitch = XQuaternion.fromAxisAngle(localX, pitchDelta);

    var qDelta = XQuaternion.multiply(qYaw, qPitch);
    this.quaternion = XQuaternion.normalize(XQuaternion.multiply(qDelta, this.quaternion));
  }

  onMouseWheel (evt) {
    if (evt.deltaY > 0) {
      this.keysDown[' '] = true;
      this.keysDown['V'] = false;

      if (this.mouseScrollUp !== null) clearTimeout(this.mouseScrollUp);
      this.mouseScrollUp = setTimeout(() => {
        this.keysDown[' '] = false;
        this.mouseScrollUp = null;
      }, 225);
    } else {
      this.keysDown['V'] = true;
      this.keysDown[' '] = false;

      if (this.mouseScrollDown !== null) clearTimeout(this.mouseScrollDown);
      this.mouseScrollDown = setTimeout(() => {
        this.keysDown['V'] = false;
        this.mouseScrollDown = null;
      }, 225);
    }
  }

  onTouch (evt) {
    evt.preventDefault();
    var touch = evt.touches && evt.touches[0];
    if (touch) {
      evt.x = touch.clientX;
      evt.y = touch.clientY;
    }
  }

  onTouchStart (evt) {
    this.onTouch(evt);
    this.onMouseDown(evt);
  }

  onTouchMove (evt) {
    this.onTouch(evt);
    this.onMouseMove(evt);
  }

  onTouchEnd (evt) {
    this.onTouch(evt);
    this.onMouseUp(evt);
  }

  reset () {
    super.reset();

    this.yaw = 0;
    this.pitch = 0;
    this.quaternion = XQuaternion.get();
  }

  onTick (dt, keysDown) {
    this.keysDown = keysDown;

    var movement = [0, 0, 0];
    if (keysDown['V']) { movement[1] -= 2.25; }
    if (keysDown[' ']) { movement[1] += 2.25; }

    this.accelerate(dt, movement);

    super.onTick(dt, keysDown);
  }

}
