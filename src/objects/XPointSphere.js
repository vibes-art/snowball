var PHI = PI * (3 - sqrt(5));

class XPointSphere extends XObject {

  constructor (opts) {
    super(opts);

    this.radiusScale = opts.radiusScale || 1;

    this.generate(opts);
    this.scene.addObject(this);
  }

  generate (opts) {
    var vertexCount = this.vertexCount;

    for (var i = 0; i < vertexCount; i++) {
      var unitPos = this.calculateUnitPosition(i);
      this.setPosition(i, this.calculatePosition(i, unitPos));
      this.setNormal(i, this.calculateNormal(i, unitPos));
      this.setColor(i, this.calculateColor(i, unitPos));
    }
  }

  calculateUnitPosition (i) {
    // unit fibonacci sphere
    var y = 1 - (i / (this.vertexCount - 1)) * 2;
    var radius = sqrt(1 - y * y);
    var theta = i * PHI;
    var x = cos(theta) * radius;
    var z = sin(theta) * radius;
    return { x, y, z };
  }

  calculatePosition (i, unitPos) {
    var unitPos = unitPos || this.calculateUnitPosition(i);
    var radiusScale = this.radiusScale;
    return {
      x: radiusScale * unitPos.x,
      y: radiusScale * unitPos.y,
      z: radiusScale * unitPos.z
    };
  }

  calculateNormal (i, unitPos) {
    var unitPos = unitPos || this.calculateUnitPosition(i);
    return [
      unitPos.x,
      unitPos.y,
      unitPos.z
    ];
  }

  calculateColor (i, unitPos) {
    if (this.useNormalColors || this.useRandomColors) {
      return super.calculateColor(i);
    }

    var unitPos = unitPos || this.calculateUnitPosition(i);
    return {
      r: 1 + unitPos.x / 2,
      g: 1 + unitPos.y / 2,
      b: 1 + unitPos.z / 2,
      a: 1
    };
  }

  getSphericalCoordiantes (i, unitPos) {
    var unitPos = unitPos || this.calculateUnitPosition(i);
    var x = unitPos.x;
    var y = unitPos.y;
    var z = unitPos.z;
    var radius = this.radiusScale;
    var theta = acos(z / radius);
    var phi = atan2(y, x) + PI;
    return { radius, theta, phi };
  }

}



class XRainbowSphere extends XPointSphere {

  calculateNormal (i, unitPos) {
    var xn = 1.0;
    var yn = 0.0;
    var zn = -1.0;
    var dist = sqrt(xn * xn + yn * yn + zn * zn);

    return [
      xn / dist,
      yn / dist,
      zn / dist
    ];
  }

  calculateColor (i, unitPos) {
    if (this.useNormalColors || this.useRandomColors) {
      return super.calculateColor(i);
    }

    var unitPos = unitPos || this.calculateUnitPosition(i);
    var x = unitPos.x;
    var y = unitPos.y;
    var z = unitPos.z;

    var rho = sqrt(x * x + y * y + z * z);
    var theta = acos(z / rho) / PI;
    var phi = atan2(y, x) / PI;
    var cx = (1 + phi) / 2;
    var cy = rho;
    var cz = theta;
    var mod = this.vertexCount / 2;
    var inc = (i % mod) / mod;
    var h = (1 + (cos(TAU * sqrt(cx * cx + cz * cz)) * sin(TAU * inc))) / 2;
    var s = sqrt(cy);
    var v = sqrt(cz);
    var rgb = XColorUtils.HSVtoRGB(h, s, v);

    return {
      r: 0.35 * rgb.r + 0.65 * ((1 + x) / 2),
      g: 0.35 * rgb.g + 0.65 * ((1 + y) / 2),
      b: 0.35 * rgb.b + 0.65 * ((1 + z) / 2),
      a: 1
    };
  }

}
