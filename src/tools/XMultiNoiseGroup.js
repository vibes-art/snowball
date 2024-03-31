class XMultiNoiseGroup {

  constructor (opts) {
    this.noiseByType = {};

    this.initNoise(opts);
  }

  initNoise (opts) {
    var noiseTypes = opts.noiseTypes || [];
    var globalScale = opts.globalScale || 1;
    var noiseTypeCount = noiseTypes.length;

    for (var i = 0; i < noiseTypeCount; i++) {
      var noiseType = noiseTypes[i];
      var noiseTypeID = noiseType.id;
      noiseType.globalScale = globalScale;
      this.noiseByType[noiseTypeID] = new XMultiNoise(noiseType);
    }
  }

  getValueByType (type, x, y) {
    var multiNoise = this.noiseByType[type];
    return multiNoise ? multiNoise.getValue(x, y) : 0;
  }

}
