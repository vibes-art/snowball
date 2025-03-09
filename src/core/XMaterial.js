var _materialUID = 1;

class XMaterial {

  constructor (opts) {
    this.uid = _materialUID++;
    this.loadCount = 0;
    this.useTextures = false;
    this.onAllTexturesLoaded = null;

    this.baseColor = new XUniform({ key: UNI_KEY_BASE_COLOR, data: opts.baseColor || [1, 1, 1, 1] });
    this.emissiveColor = new XUniform({ key: UNI_KEY_EMISSIVE_COLOR, data: opts.emissiveColor || [0, 0, 0, 1] });
    this.metallic = new XUniform({ key: UNI_KEY_METALLIC, components: 1, data: opts.metallic || 0 });
    this.roughness = new XUniform({ key: UNI_KEY_ROUGHNESS, components: 1, data: opts.roughness || 0 });

    this.uniforms = {
      baseColor: this.baseColor,
      emissiveColor: this.emissiveColor,
      metallic: this.metallic,
      roughness: this.roughness
    };

    MATERIAL_TEXTURE_MAPS.forEach(key => {
      this[key] = new XUniform({ key, components: 1, type: UNI_TYPE_INT });
      this.uniforms[key] = this[key];
      opts[key] && this.setMaterialTexture(key, opts[key]);
    });
  }

  setMaterialTexture (key, texture) {
    var uniform = this[key];
    if (!uniform) return console.error(`Missing XMaterial texture for key: ${key}`);

    this.useTextures = true;
    uniform.setTexture(texture);

    this.loadCount++;

    if (this.onAllTexturesLoaded && this.loadCount === MATERIAL_TEXTURE_MAPS.length) {
      this.onAllTexturesLoaded();
    }
  }

  loadAllTextures (gl, path, onLoad, type, nPath, rPath) {
    onLoad = onLoad || null;
    type = type || 'png';
    nPath = nPath || `${path}_normal`;
    rPath = rPath || `${path}_roughness`;

    this.loadCount = 0;
    this.onAllTexturesLoaded = onLoad;
    this.useTextures = true;

    XGLUtils.loadTexture(gl, `${path}.${type}`, ENABLE_HDR, t => this.setMaterialTexture(UNI_KEY_ALBEDO_MAP, t));
    XGLUtils.loadTexture(gl, `${nPath}.${type}`, false, t => this.setMaterialTexture(UNI_KEY_NORMAL_MAP, t));
    XGLUtils.loadTexture(gl, `${rPath}.${type}`, false, t => this.setMaterialTexture(UNI_KEY_ROUGHNESS_MAP, t));
  }

  getUniforms () {
    return this.uniforms;
  }

  remove (gl) {
    MATERIAL_TEXTURE_MAPS.forEach((key) => this[key].remove(gl));
  }

}
