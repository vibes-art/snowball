class XSimplexHeightMap extends XHeightMap {

  initialize (opts) {
    this.multiNoiseGroup = new XMultiNoiseGroup(opts);
    super.initialize(opts);
  }

  calculateHeight (x, z) {
    var noise = this.multiNoiseGroup.getValueByType(NOISE_TYPE_HEIGHT, x, z);
    return this.baseHeight + noise;
  }

  getColorHeightOffset (x, z) {
    var noise = this.multiNoiseGroup.getValueByType(NOISE_TYPE_COLOR_HEIGHT_OFFSET, x, z);
    return super.getColorHeightOffset(x, z, noise);
  }

}
