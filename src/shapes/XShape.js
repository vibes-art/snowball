var SHAPE_POINT = 0;
var SHAPE_CIRCLE = 1;
var SHAPE_RECT = 2;

class XShape {

  constructor (opts) {
    this.x = opts.x;
    this.z = opts.z;
    this.type = SHAPE_POINT;
  }

  isInside (x, z) {
    return this.getSignedDistance(x, z) <= 0;
  }

  getSignedDistance (x, z) {
    var dx = x - this.x;
    var dz = z - this.z;
    return sqrt(dx * dx + dz * dz);
  }

  getAngle (x, z) {
    var dx = x - this.x;
    var dz = z - this.z;
    return atan2(dz, dx);
  }

  getRandomPoint () {
    return { x: this.x, z: this.z };
  }

  getRandomEdgePoint () {
    return { x: this.x, z: this.z };
  }

}
