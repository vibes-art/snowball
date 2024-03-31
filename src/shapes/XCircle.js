class XCircle extends XShape {

  constructor (opts) {
    super(opts);

    this.type = SHAPE_CIRCLE;
    this.radius = opts.radius;
  }

  get area () { return PI * pow(this.radius, 2); }
  get circumference () { return TAU * this.radius; }

  getSignedDistance (x, z) {
    return super.getSignedDistance(x, z) - this.radius;
  }

  collidesWith (circle) {
    return circle.getSignedDistance(this.x, this.z) <= this.radius;
  }

}