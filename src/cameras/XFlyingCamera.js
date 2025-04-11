class XFlyingCamera extends XCamera {

  logControls () {
    console.log(` `);
    console.log(`~~~ Flying Camera Controls ~~~`);
    console.log(`    Click and drag Mouse to rotate Camera`);
    console.log(`    W, A, S, D, V, and Space to pan Camera`);
    console.log(` `);
  }

  onMouseMove (evt, dx, dy) {
    var r = this.rotation;
    this.setRotation([
      r[0] - this.sensitivity * dx,
      r[1] - this.sensitivity * dy,
      r[2]]);
  }

  onTick (dt, keysDown) {
    var movement = [0, 0, 0];
    var camX = this.rotation[0] + PI;
    if (keysDown['W']) { movement[0] += sin(camX); movement[2] += cos(camX); }
    if (keysDown['A']) { movement[0] += cos(camX); movement[2] -= sin(camX); }
    if (keysDown['S']) { movement[0] -= sin(camX); movement[2] -= cos(camX); }
    if (keysDown['D']) { movement[0] -= cos(camX); movement[2] += sin(camX); }
    if (keysDown['V']) { movement[1] -= 1; }
    if (keysDown[' ']) { movement[1] += 1; }

    if (this.lookAtMatrix && (movement[0] || movement[1] || movement[2])) {
      this.setRotation(this.rotation);
    }

    this.accelerate(dt, movement);

    super.onTick(dt, keysDown);
  }

}
