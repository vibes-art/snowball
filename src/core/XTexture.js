class XTexture {

  constructor (opts) {
    this.gl = opts.gl;
    this.key = opts.key;
    this.url = opts.url || '';
    this.sRGB = opts.sRGB || false;

    this.glTexture = null;
    this.width = 1;
    this.height = 1;
    this.isLoaded = false;
    this.isLoading = false;
    this.isReservedTextureUnit = false;

    this.uniform = opts.uniform || new XUniform({ key: this.key, components: 1, type: UNI_TYPE_INT });

    this.load(opts.onLoad);
  }

  setURL (url, onLoad) {
    this.url = url;
    this.load(onLoad);
  }

  load (onLoad) {
    if (!this.url) return;

    var url = this.url;
    this.isLoading = true;

    var glTexture = XGLUtils.loadTexture(this.gl, this.url, this.sRGB, (glTexture, width, height) => {
      // bail if we're already loading something different
      if (url !== this.url) return;

      this.glTexture = glTexture;
      this.width = width;
      this.height = height;
      this.isLoaded = true;
      this.isLoading = false;
      this.uniform.isDirty = true;
      this.glTexture.isDeleted = false;
      onLoad && onLoad(glTexture, width, height);
    });

    // go ahead and set it if it's our first texture, otherwise keep the old while loading
    if (!this.glTexture) {
      this.glTexture = glTexture;
    }
  }

  bind (shaderLocation) {
    if (!this.glTexture) return;

    if (this.glTexture.isDeleted && !this.isLoading) {
      console.log(`reloading deleted texture: ${this.url}`);
      this.isLoaded = false;
      this.load();
      return;
    }

    this.uniform.apply(this.gl, shaderLocation);
    XGLUtils.bindTexture(this.gl, this.uniform.data, this.glTexture);
  }

  setGLTexture (glTexture) {
    this.glTexture = glTexture;
    this.isLoaded = true;
    this.isLoading = false;
    this.uniform.isDirty = true;
  }

  reserveTextureUnit (textureUnit) {
    this.uniform.data = textureUnit;
    this.isReservedTextureUnit = true;
  }

  remove () {
    if (!this.glTexture) return;

    XGLUtils.unloadTexture(this.gl, this.glTexture);
    this.glTexture = null;
  }

}
