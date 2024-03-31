class XRect extends XShape {

  constructor (opts) {
    super(opts);

    this.type = SHAPE_RECT;
    this.width = opts.width;
    this.depth = opts.depth;
    this.theta = opts.theta || 0;

    this.compute();
  }

  compute () {
    this._halfWidth = this.width / 2;
    this._halfDepth = this.depth / 2;
    this._cosTheta = cos(this.theta);
    this._sinTheta = sin(this.theta);

    var hwSinTheta = this._halfWidth * this._sinTheta;
    var hwCosTheta = this._halfWidth * this._cosTheta;
    var hdSinTheta = this._halfDepth * this._sinTheta;
    var hdCosTheta = this._halfDepth * this._cosTheta;
    var corner0 = { x: this.x - hwCosTheta - hdSinTheta, z: this.z - hwSinTheta + hdCosTheta };
    var corner1 = { x: this.x + hwCosTheta - hdSinTheta, z: this.z + hwSinTheta + hdCosTheta };
    var corner2 = { x: this.x + hwCosTheta + hdSinTheta, z: this.z + hwSinTheta - hdCosTheta };
    var corner3 = { x: this.x - hwCosTheta + hdSinTheta, z: this.z - hwSinTheta - hdCosTheta };
    this._corners = [corner0, corner1, corner2, corner3];
    this._normals = [
      { x: corner0.z - corner1.z, z: corner1.x - corner0.x },
      { x: corner1.z - corner2.z, z: corner2.x - corner1.x },
      { x: corner2.z - corner3.z, z: corner3.x - corner2.x },
      { x: corner3.z - corner0.z, z: corner0.x - corner3.x }
    ];
  }

  get area () { return this.width * this.depth; }

  getSignedDistance (x, z) {
    // translate as if rect center = 0,0
    x -= this.x;
    z -= this.z;

    // rotate counter-clockwise to align axes
    var rx = abs(x * this._cosTheta + z * this._sinTheta);
    var rz = abs(-x * this._sinTheta + z * this._cosTheta);

    // compute signed distance from (rx, rz) to the axis-aligned rectangle
    var dx = rx - this._halfWidth;
    var dz = rz - this._halfDepth;
    var px = max(0, dx);
    var pz = max(0, dz);
    return sqrt(px * px + pz * pz) + min(max(dx, dz), 0);
  }

  collidesWith (rect) {
    var axes = this._normals.concat(rect._normals);
    for (var i = 0; i < 8; i++) {
      var axis = axes[i];
      var thisProjection = this.project(axis);
      var rectProjection = rect.project(axis);
      if (!thisProjection.overlap(rectProjection)) return false;
    }
    return true;
  }

  project (axis) {
    var mn = XUtils.dotProduct(this._corners[0], axis);
    var mx = mn;
    for (var i = 1; i < 4; i++) {
      var p = XUtils.dotProduct(this._corners[i], axis);
      if (p < mn) {
        mn = p;
      } else if (p > mx) {
        mx = p;
      }
    }

    return { mn, mx, overlap: function (other) {
      return mx > other.mn && mn < other.mx;
    }};
  }

}
