class XIsometricCamera extends XCamera {

  constructor (opts) {
    super(opts);

    this.sensitivity = opts.sensitivity !== undefined ? opts.sensitivity : 0;

    this.isoAngles = opts.isoAngles || {
      yaw: 45 * PI / 180,
      pitch: 35.264 * PI / 180
    };
  }

  logControls () {
    console.log(` `);
    console.log(`~~~ Isometric Camera Controls ~~~`);
    console.log(`    W, A, S, D, V, and Space to pan Camera`);
    console.log(` `);
  }

  onMouseMove (evt, dx, dy) {
    // set sensitivity to 0 to disable
    this.isoAngles.yaw += dx * this.sensitivity;
  }

  onTick (dt, keysDown) {
    var movement = [0, 0, 0];
    if (keysDown['W']) { movement[2] += 1; }
    if (keysDown['S']) { movement[2] -= 1; }
    if (keysDown['A']) { movement[0] -= 1; }
    if (keysDown['D']) { movement[0] += 1; }
    if (keysDown['V']) { movement[1] -= 1; }
    if (keysDown[' ']) { movement[1] += 1; }

    movement = XVector3.normalize(movement);

    this.accelerate(dt, movement);

    super.onTick(dt, keysDown);
  }

  getViewMatrix () {
    var viewMatrix = XMatrix4.get();
    viewMatrix = XMatrix4.translate(viewMatrix, this.position[0], this.position[1], this.position[2]);
    viewMatrix = XMatrix4.rotateY(viewMatrix, this.isoAngles.yaw);
    viewMatrix = XMatrix4.rotateX(viewMatrix, this.isoAngles.pitch);
    return XMatrix4.invert(viewMatrix);
  }

}
