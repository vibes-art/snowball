var _materialUID = 1;

class XMaterial {

  constructor (opts) {
    this.gl = opts.gl;

    this.uid = _materialUID++;
    this.useTextures = false;
    this.hasTransparency = false;
    this.isLoading = false;
    this.isLoaded = false;

    this.uniforms = {};
    this.textures = {};

    this.addUniform(UNI_KEY_BASE_COLOR, { ...opts, defaultValue: [1, 1, 1, 1] });
    this.addUniform(UNI_KEY_EMISSIVE_COLOR, { ...opts, defaultValue: [0, 0, 0, 1] });
    this.addUniform(UNI_KEY_METALLIC, { ...opts, components: 1, defaultValue: 0 });
    this.addUniform(UNI_KEY_ROUGHNESS, { ...opts, components: 1, defaultValue: 0 });

    this.addTexture(UNI_KEY_ALBEDO_MAP, { sRGB: ENABLE_HDR });
    this.addTexture(UNI_KEY_NORMAL_MAP);
    this.addTexture(UNI_KEY_ROUGHNESS_MAP);

    opts.path && this.loadAllTextures(opts.path, opts);
  }

  addUniform (key, opts) {
    opts = opts || {};
    opts.key = key;
    opts.data = opts[key] !== undefined ? opts[key] : opts.defaultValue;
    this.uniforms[key] = new XUniform(opts);
  }

  addTexture (key, opts) {
    opts = opts || {};
    opts.gl = this.gl;
    opts.key = key;
    opts.url = opts[key] || '';
    this.textures[key] = new XTexture(opts);
  }

  loadAllTextures (path, opts) {
    var onLoad = opts.onLoad || null;
    var fileType = opts.fileType || 'png';
    var normalPath = opts.normalPath || `${path}_normal`;
    var roughnessPath = opts.roughnessPath || `${path}_roughness`;

    var loadCount = 0;
    var onLoadCallback = () => {
      if (++loadCount === 3) {
        this.isLoading = false;
        this.isLoaded = true;
        onLoad && onLoad();
      }
    };

    this.useTextures = true;
    this.isLoading = true;
    this.isLoaded = false;

    this.textures[UNI_KEY_ALBEDO_MAP].setURL(`${path}.${fileType}`, onLoadCallback);
    this.textures[UNI_KEY_NORMAL_MAP].setURL(`${normalPath}.${fileType}`, onLoadCallback);
    this.textures[UNI_KEY_ROUGHNESS_MAP].setURL(`${roughnessPath}.${fileType}`, onLoadCallback);
  }

  getUniforms () {
    return this.uniforms;
  }

  getTextures () {
    return this.textures;
  }

  getUniformValue (key) {
    return this.uniforms[key].data;
  }

  setUniformValue (key, value) {
    return this.uniforms[key].data = value;
  }

  remove () {
    for (var key in this.textures) {
      this.textures[key].remove();
    }
  }

}
