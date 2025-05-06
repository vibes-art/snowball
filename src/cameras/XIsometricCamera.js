class XIsometricCamera extends XCamera {

  constructor (opts) {
    super(opts);

    this.sensitivity = opts.sensitivity !== undefined ? opts.sensitivity : 0;

    this.isoAngles = opts.isoAngles || {
      yaw: 45 * PI / 180,
      pitch: 35.264 * PI / 180
    };

    this.moveSpeed = opts.moveSpeed !== undefined ? opts.moveSpeed : 0.01;
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
    var move = [0, 0, 0];
    if (keysDown['W']) { move[2] -= 1; }
    if (keysDown['S']) { move[2] += 1; }
    if (keysDown['A']) { move[0] -= 1; }
    if (keysDown['D']) { move[0] += 1; }
    if (keysDown['V']) { move[1] -= 1; }
    if (keysDown[' ']) { move[1] += 1; }

    move = XVector3.normalize(move);

    var delta = dt * this.moveSpeed;
    this.position[0] += move[0] * delta;
    this.position[1] += move[1] * delta;
    this.position[2] += move[2] * delta;

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
