class XCachedNoiseGrid {

  constructor (opts) {
    this.width = opts.width;
    this.depth = opts.depth;
    this.noiseFunction = opts.noiseFunction;

    this.count = (this.width + 1) * (this.depth + 1);
    this.noise = new Float32Array(this.count);
    this.high = MIN_SAFE_INTEGER;
    this.low = MAX_SAFE_INTEGER;

    opts.initialize && this.init();
  }

  init () {
    var width = this.width;
    var depth = this.depth;
    var high = MIN_SAFE_INTEGER;
    var low = MAX_SAFE_INTEGER;

    for (var x = 0; x <= width; x++) {
      for (var z = 0; z <= depth; z++) {
        if (this.isSkipIndex(x, z)) continue;
        var noise = this.noise[this.getVertexIndex(x, z)] = this.noiseFunction(x, z);
        if (noise < low) low = noise;
        if (noise > high) high = noise;
      }
    }

    this.low = low;
    this.high = high;
  }

  getVertexIndex (x, z) {
    var width = this.width;
    var depth = this.depth;
    var lastX = width;
    var lastZ = depth;
    if (x < 0) x = 0;
    if (z < 0) z = 0;
    if (x > lastX) x = lastX;
    if (z > lastZ) z = lastZ;
    return z * (width + 1) + x;
  }

  isSkipIndex (x, z) {
    return (x + z) % 2 === 1;
  }

  getNoise (x, z) {
    if (this.isSkipIndex(x, z)) {
      return this.getLocalNoiseAverage(x, z);
    } else {
      return this._getNoise(x, z);
    }
  }

  getLocalNoiseAverage (x, z) {
    var n0 = z + 1 > this.depth ? 0 : this._getNoise(x, z + 1);
    var n1 = x + 1 > this.width ? 0 : this._getNoise(x + 1, z);
    var n2 = z - 1 < 0 ? 0 : this._getNoise(x, z - 1);
    var n3 = x - 1 < 0 ? 0 : this._getNoise(x - 1, z);
    var denom = (n0 ? 1 : 0) + (n1 ? 1 : 0) + (n2 ? 1 : 0) + (n3 ? 1 : 0);
    return (n0 + n1 + n2 + n3) / denom;
  }

  _getNoise (x, z) {
    var index = this.getVertexIndex(x, z);
    var noise = this.noise[index];
    if (!noise) {
      noise = this.noise[index] = this.noiseFunction(x, z);
      if (noise < this.low) this.low = noise;
      if (noise > this.high) this.high = noise;
    }
    return noise;
  }

}
