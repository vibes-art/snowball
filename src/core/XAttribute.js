class XAttribute {

  constructor (opts) {
    this.key = opts.key;
    this.gl = opts.gl;
    this.count = opts.count;
    this.components = opts.components || 3;
    this.defaultValues = opts.defaultValues || [];
    this.bufferTarget = opts.bufferTarget || 0;

    this.useTexture = opts.useTexture || false;
    this.textureUnit = opts.textureUnit || 0;
    this.textureWidth = opts.textureWidth || 0;
    this.textureHeight = opts.textureHeight || 0;

    this.data = new Float32Array(this.components * this.count);
    this.bufferOffset = 0;
    this.bufferLength = 0;
    this.isDirty = true;
    this.buffer = null;
    this.texture = null;
  }

  bindBuffer () {
    if (this.useTexture) {
      this.bindTexture();
    } else {
      this.buffer = XGLUtils.setBuffer(this.gl, this.buffer, this.data, {
        offset: this.bufferOffset,
        length: this.bufferLength,
        isDirty: this.isDirty,
        target: this.bufferTarget ? this.bufferTarget : undefined
      });
    }

    this.isDirty = false;
    this.bufferOffset = 0;
    this.bufferLength = 0;
  }

  bindTexture () {
    if (!this.isDirty) return;

    var gl = this.gl;
    var data = this.data;
    var width = this.textureWidth;
    var height = this.textureHeight;
    var components = this.components;

    if (!this.texture) {
      this.texture = XGLUtils.createTexture(gl, data, width, height, components);
    }

    var internalFormat, format;
    switch (components) {
      case 4: internalFormat = gl.RGBA32F; format = gl.RGBA; break;
      case 3: internalFormat = gl.RGB32F; format = gl.RGB; break;
      case 1: internalFormat = gl.R32F; format = gl.RED; break;
      default: console.error("Unsupported component size: " + components);
    }

    if (data.length !== width * height * components) {
      console.error("Data size does not match texture dimensions.");
    }

    XGLUtils.bindTexture(gl, this.textureUnit, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.FLOAT, data, 0);
  }

  bindExternalTexture (texture) {
    XGLUtils.bindTexture(this.gl, this.textureUnit, texture);
    this.texture = texture;
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
      this.gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }

    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }

}
