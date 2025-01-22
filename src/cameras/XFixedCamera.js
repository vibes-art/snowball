class XFixedCamera extends XCamera {

  constructor (opts) {
    super(opts);

    this.modelOffset = [0, 0, 0];
    this.modelRotation = [0, 0, 0];
    this.totalRotation = [0, 0, 0];
    this.isModelRotated = false;
    this.mouseScrollUp = null;
    this.mouseScrollDown = null;
  }

  logControls () {
    console.log(` `);
    console.log(`~~~ Fixed Camera Controls ~~~`);
    console.log(`    Click and drag Mouse to rotate`);
    console.log(`    Scroll Mouse Wheel to zoom`);
    console.log(` `);
  }

  onMouseMove (evt, dx, dy) {
    var rotBounds = PI / 2;
    var lastRotationX = this.totalRotation[0];
    var lastRotationY = this.totalRotation[1];
    var lastRotationZ = this.totalRotation[2];
    var horizontalInfluence = cos(lastRotationY);
    var verticalInfluence = cos(lastRotationX);
    var rotationInfluenceX = dx * this.sensitivity * horizontalInfluence;
    var rotationInfluenceY = dy * this.sensitivity * verticalInfluence;
    var rotationInfluenceZ = dx * this.sensitivity * (1 - horizontalInfluence);

    var mox = this.modelOffset[0] + rotationInfluenceX + lastRotationX;
    if (mox >= -rotBounds && mox <= rotBounds) {
      this.modelOffset[0] += rotationInfluenceX;
    }

    var moy = this.modelOffset[1] + rotationInfluenceY + lastRotationY;
    if (moy >= -rotBounds && moy <= rotBounds) {
      this.modelOffset[1] += rotationInfluenceY;
    }

    var moz = this.modelOffset[2] + rotationInfluenceZ + lastRotationZ;
    if (moz >= -rotBounds && moz <= rotBounds) {
      this.modelOffset[2] += rotationInfluenceZ;
    }

    var finalRotationX = max(-rotBounds, min(rotBounds, this.modelOffset[0] + lastRotationX));
    var finalRotationY = max(-rotBounds, min(rotBounds, this.modelOffset[1] + lastRotationY));
    var finalRotationZ = max(-rotBounds, min(rotBounds, this.modelOffset[2] + lastRotationZ));
    this.modelRotation = [finalRotationX, finalRotationY, finalRotationZ];
    this.isModelRotated = true;
  }

  onMouseUp (evt) {
    this.totalRotation[0] += this.modelOffset[0];
    this.totalRotation[1] += this.modelOffset[1];
    this.totalRotation[2] += this.modelOffset[2];
    this.modelOffset = [0, 0, 0];
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

    this.modelOffset = [0, 0, 0];
    this.totalRotation = [0, 0, 0];
    this.modelRotation = [0, 0, 0];
    this.isModelRotated = false;
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
