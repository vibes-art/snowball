class XMaterial {

  constructor (opts) {
    this.useTextures = false;

    this.baseColor = new XUniform({ key: UNI_KEY_BASE_COLOR, data: opts.baseColor || [1, 1, 1, 1] });
    this.metallic = new XUniform({ key: UNI_KEY_METALLIC, components: 1, data: opts.metallic || 0 });
    this.roughness = new XUniform({ key: UNI_KEY_ROUGHNESS, components: 1, data: opts.roughness || 0 });

    this.uniforms = {
      baseColor: this.baseColor,
      metallic: this.metallic,
      roughness: this.roughness
    };

    MATERIAL_TEXTURE_MAPS.forEach((key) => {
      this[key] = new XUniform({ key, components: 1, type: UNI_TYPE_INT });
      this.uniforms[key] = this[key];
      opts[key] && this.setMaterialTexture(key, opts[key]);
    });
  }

  setMaterialTexture (key, texture) {
    var uniform = this[key];
    if (!uniform) return console.error(`Missing XMaterial texture for key: ${key}`);

    this.useTextures = true;
    uniform.texture = texture;
  }

  getUniforms () {
    return this.uniforms;
  }

  remove (gl) {
    MATERIAL_TEXTURE_MAPS.forEach((key) => this[key].remove(gl));
  }

}
