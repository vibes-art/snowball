class XMaterial {

  constructor (opts) {
    this.useTextures = false;

    this.baseColor = new XUniform({ key: UNI_KEY_BASE_COLOR, data: opts.baseColor || [1, 1, 1, 1] });
    this.metallic = new XUniform({ key: UNI_KEY_METALLIC, components: 1, data: opts.metallic || 0 });
    this.roughness = new XUniform({ key: UNI_KEY_ROUGHNESS, components: 1, data: opts.roughness || 0 });

    this.albedoMap = new XUniform({ key: UNI_KEY_ALBEDO_MAP, components: 1, type: UNI_TYPE_INT });

    this.uniforms = {
      baseColor: this.baseColor,
      metallic: this.metallic,
      roughness: this.roughness,
      albedoMap: this.albedoMap
    };

    if (opts.albedoMap) {
      this.setAlbedoMapTexture(opts.albedoMap);
    }
  }

  setAlbedoMapTexture (texture) {
    this.useTextures = true;
    this.albedoMap.texture = texture;
  }

  getUniforms () {
    return this.uniforms;
  }

  remove (gl) {
    this.albedoMap.remove(gl);
  }

}
