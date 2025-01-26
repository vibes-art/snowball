class XAttribute {

  constructor (opts) {
    this.key = opts.key;
    this.gl = opts.gl;
    this.count = opts.count;
    this.components = opts.components || 3;
    this.defaultValues = opts.defaultValues || [];
    this.bufferTarget = opts.bufferTarget || 0;

    this.useTexture = opts.useTexture || false;
    this.isExternalTexture = false;
    this.textureWidth = opts.textureWidth || 0;
    this.textureHeight = opts.textureHeight || 0;

    this.buffer = null;
    this.texture = null;
    this.uniform = opts.uniform || null;

    this.data = new Float32Array(this.components * this.count);
    this.bufferOffset = 0;
    this.bufferLength = 0;
    this.isDirty = true;

    opts.texture && this.setTexture(opts.texture);
  }

  bind (scene, location = NO_SHADER_LOCATION) {
    if (this.useTextures) {
      this.updateTexture();
      XGLUtils.bindTexture(this.gl, scene.getDrawingTextureUnit(), this.texture);
    } else if (location !== NO_SHADER_LOCATION && location !== null) {
      this.updateBuffer();
      XGLUtils.bindVertexAttributeArray(this.gl, location, this.components);
    }
  }

  update () {
    if (this.useTextures) {
      this.updateTexture();
    } else {
      this.updateBuffer();
    }
  }

  updateBuffer () {
    this.buffer = XGLUtils.setBuffer(this.gl, this.buffer, this.data, {
      offset: this.bufferOffset,
      length: this.bufferLength,
      isDirty: this.isDirty,
      target: this.bufferTarget ? this.bufferTarget : undefined
    });

    this.bufferOffset = 0;
    this.bufferLength = 0;
  }

  setTexture (texture) {
    this.texture = texture;
    this.useTexture = !!texture;
    this.isExternalTexture = !!texture;
  }

  updateTexture () {
    // only internal textures are created and updated from data
    if (!this.isDirty || this.isExternalTexture) return;

    var width = this.textureWidth;
    var height = this.textureHeight;
    var components = this.components;
    if (!this.texture) {
      this.texture = XGLUtils.createTexture(this.gl, this.data, width, height, components);
      if (this.uniform) this.uniform.texture = this.texture;
    } else {
      XGLUtils.updateTexture(this.gl, this.texture, this.data, width, height, components);
    }
  }

  getValue (vertexIndex, componentIndex) {
    var index = this.components * vertexIndex;
    return this.data[index + componentIndex];
  }

  setValue (vertexIndex, componentIndex, value) {
    var index = this.components * vertexIndex;
    this.data[index + componentIndex] = value;
    this.isDirty = true;
  }

  getData (vertexIndex) {
    var components = this.components;
    var index = components * vertexIndex;
    var data = this.data;
    var values = new Float32Array(components);

    for (var i = 0; i < components; i++) {
      values[i] = data[index + i];
    }

    return values;
  }

  setData (vertexIndex, values) {
    var components = this.components;
    var index = components * vertexIndex;
    var data = this.data;

    for (var i = 0; i < components; i++) {
      data[index + i] = values[i];
    }

    this.isDirty = true;
  }

  calculateData (vertexIndex) {
    var components = this.components;
    var defaultValues = this.defaultValues;
    var values = new Float32Array(components);

    for (var i = 0; i < components; i++) {
      values.push(defaultValues[i] || 0);
    }

    return values;
  }

  remove () {
    if (this.buffer) {
      XGLUtils.deleteBuffer(this.gl, this.buffer);
      this.buffer = null;
    }

    if (this.texture) {
      XGLUtils.unloadTexture(this.gl, this.texture);
      this.texture = null;
    }
  }

}
