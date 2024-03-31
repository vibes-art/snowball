class XMultiNoise {

  constructor (opts) {
    this.baseValue = opts.baseValue || 0;

    this.noiseList = [];

    this.initNoise(opts);
  }

  initNoise (opts) {
    var noise = opts.noiseList || [];
    var globalScale = opts.globalScale || 1;
    var noiseCount = noise.length;
    for (var i = 0; i < noiseCount; i++) {
      var n = noise[i];
      this.noiseList.push(createNoise(
        n.scale * globalScale,
        n.exponent,
        n.amplitude / globalScale,
        n.scaleX * globalScale,
        n.scaleY * globalScale
      ));
    }
  }

  getValue (x, y) {
    var noiseList = this.noiseList;
    var noiseCount = noiseList.length;
    var value = this.baseValue;
    for (var i = 0; i < noiseCount; i++) {
      var noise = noiseList[i];
      value += noise.get(x, y);
    }
    return value;
  }

}
