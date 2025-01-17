class XMaterial {

  constructor (opts) {
    this.baseColor = new XUniform({ key: UNI_KEY_BASE_COLOR, data: opts.baseColor || [1, 1, 1, 1] });
    this.metallic = new XUniform({ key: UNI_KEY_METALLIC, components: 1, data: opts.metallic || 0 });
    this.roughness = new XUniform({ key: UNI_KEY_ROUGHNESS, components: 1, data: opts.roughness || 0 });

    // In a more advanced approach, you'd also store normal maps, 
    // roughness/metallic textures, environment maps, etc.
    // But let's keep it simple for now.

    this.uniforms = {
      baseColor: this.baseColor,
      metallic: this.metallic,
      roughness: this.roughness
    };
  }

  setBaseColor (r, g, b, a) {
    this.baseColor.data = [r, g, b, a];
  }

  setMetallic (m) {
    this.metallic.data = m;
  }

  setRoughness (r) {
    this.roughness.data = r;
  }

  getUniforms () {
    return this.uniforms;
  }

}
