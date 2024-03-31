class XMovableModel {

  constructor (opts) {
    this.position = opts.position || [0, 0, 0];
    this.velocity = opts.velocity || [0, 0, 0];
    this.velocityMax = opts.velocityMax || MAX_SAFE_INTEGER;
    this.accelTime = opts.accelTime || 1;
    this.timeSinceUpdate = 0;
  }

  stop () {
    this.velocity = [0, 0, 0];
  }

  accelerate (dt, direction) {
    var rx = direction[0];
    var ry = direction[1];
    var rz = direction[2];
    if (dt === 0 || (rx === 0 && ry === 0 && rz === 0)) return;

    this.timeSinceUpdate = 0;

    var vx = this.velocity[0];
    var vy = this.velocity[1];
    var vz = this.velocity[2];
    var newMag = this.velocityMax * dt / this.accelTime;
    vx += newMag * rx;
    vy += newMag * ry;
    vz += newMag * rz;

    var vMag = sqrt(vx * vx + vy * vy + vz * vz) || 1;
    var vMult = min(vMag, this.velocityMax);
    this.velocity[0] = vMult * vx / vMag;
    this.velocity[1] = vMult * vy / vMag;
    this.velocity[2] = vMult * vz / vMag;
  }

  onTick (dt) {
    this.timeSinceUpdate += dt;

    var pct = max(0, min(1, this.timeSinceUpdate / this.accelTime));
    var vx = this.velocity[0];
    var vy = this.velocity[1];
    var vz = this.velocity[2];

    vx -= vx * pct / 2;
    vy -= vy * pct / 2;
    vz -= vz * pct / 2;
    this.position[0] += dt * vx;
    this.position[1] += dt * vy;
    this.position[2] += dt * vz;
    this.velocity[0] = vx - vx * pct / 2;
    this.velocity[1] = vy - vy * pct / 2;
    this.velocity[2] = vz - vz * pct / 2;
  }

}
