class XShaderMultiNoise extends XMultiNoise {

  constructor (opts) {
    super(opts);

    this.key = opts.key;
    this.gl = opts.gl;

    this.generateTexture();
  }

  generateTexture () {
    var width = 512;
    var height = this.noiseList.length;
    var components = 4; // RGBA
    var texData = new Uint8Array(width * height * components);
    var propsData = new Float32Array(height * components);

    for (var i = 0; i < height; i++) {
      var noiseObj = this.noiseList[i];

      var offset = i * components;
      propsData[offset + 0] = noiseObj.scaleX;      // R channel
      propsData[offset + 1] = noiseObj.scaleY;      // G channel
      propsData[offset + 2] = noiseObj.exponent;    // B channel
      propsData[offset + 3] = noiseObj.amplitude;   // A channel

      offset *= width;
      for (var j = 0; j < width; j++) {
        texData[offset + j * components + 0] = noiseObj.perm[j];      // R channel
        texData[offset + j * components + 1] = noiseObj.permMod12[j]; // G channel
        texData[offset + j * components + 2] = 0;                     // B channel (unused)
        texData[offset + j * components + 3] = 0;                     // A channel (unused)
      }
    }

    this.texturePerm = new XTexture({ key: this.key, gl: this.gl });
    this.texturePerm.setGLTexture(XGLUtils.createIntDataTexture(this.gl, texData, width, height, components));

    this.textureProps = new XTexture({ key: `${this.key}Props`, gl: this.gl });
    this.textureProps.setGLTexture(XGLUtils.createFloatDataTexture(this.gl, propsData, 1, height, components));
  }

}
