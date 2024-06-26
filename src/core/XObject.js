class XObject {

  constructor (opts) {
    this.gl = opts.gl;
    this.scene = opts.scene;

    this.type = opts.type || opts.gl.POINTS;
    this.vertexCount = opts.vertexCount || 0;
    this.indexCount = opts.indexCount || 0;
    this.alpha = opts.alpha || 1.0;
    this.useIndices = opts.useIndices || false;
    this.useNormalColors = opts.useNormalColors || false;
    this.useRandomColors = opts.useRandomColors || false;
    this.positionOffset = opts.positionOffset || [0, 0, 0];

    this.attributes = {};
    this.uniforms = {};
    this.matrices = null;
    this.textureUnitIndex = 0;
    this.isActive = false;

    this.indices = this.useIndices ? new Uint32Array(this.indexCount) : null;
    this.indexBuffer = null;
    this.indicesDirty = false;

    this.initialize(opts);
  }

  initialize (opts) {
    this.defineAttributes(opts);
    this.defineUniforms(opts);
    this.setShader(opts);
    this.generate(opts);
    this.bindBuffers();
    this.scene.addObject(this);
  }

  defineAttributes (opts) {
    this.addAttribute(ATTR_KEY_POSITIONS);
  }

  defineUniforms (opts) {
    this.setMatrices(opts.modelMatrix);
  }

  setShader (opts) {
    var shader = opts.shader;
    if (!shader) return;

    this.shader = shader;
    this.shader.connectObject(this);
  }

  generate (opts) { /* override */ }

  addAttribute (key, opts) {
    opts = opts || {};
    opts.key = key;
    opts.gl = this.gl;
    opts.count = this.vertexCount;

    if (opts.useTexture) {
      opts.textureUnit = this.textureUnitIndex++;

      var uniformKey = `${key}Texture`;
      var uniformOpts = {};
      uniformOpts.type = UNIFORM_TYPE_INT;
      uniformOpts.components = 1;
      uniformOpts.data = opts.textureUnit;
      this.addUniform(uniformKey, uniformOpts);
    }

    this.attributes[key] = new XAttribute(opts);
  }

  addUniform (key, opts) {
    opts = opts || {};
    opts.key = key;

    this.uniforms[key] = new XUniform(opts);
  }

  setMatrices (modelMatrix) {
    if (!modelMatrix) return;

    this.matrices = {};

    this.matrices.model = new XUniform({ key: 'modelMatrix', type: UNIFORM_TYPE_MATRIX });
    this.matrices.normal = new XUniform({ key: 'normalMatrix', type: UNIFORM_TYPE_MATRIX });

    this.matrices.model.data = modelMatrix;
    this.matrices.model.data = XMatrix4.scale(this.matrices.model.data, -1, 1, 1);
    this.matrices.normal.data = XMatrix4.invert(this.matrices.model.data);
    this.matrices.normal.data = XMatrix4.transpose(this.matrices.normal.data);
  }

  bindBuffers () {
    for (var key in this.attributes) {
      this.attributes[key].bindBuffer();
    }

    if (this.useIndices) {
      this.indexBuffer = XGLUtils.setBuffer(this.gl, this.indexBuffer, this.indices, {
        isDirty: this.indicesDirty,
        target: this.gl.ELEMENT_ARRAY_BUFFER
      });
      this.indicesDirty = false;
    }
  }

  draw () {
    var gl = this.gl;
    var primitiveType = this.type;
    var count = this.indexCount || this.vertexCount;
    var offset = 0;

    if (this.useIndices) {
      var indexType = gl.UNSIGNED_INT;
      gl.drawElements(primitiveType, count, indexType, offset);
    } else {
      gl.drawArrays(primitiveType, offset, count);
    }
  }

  get isDirty () {
    var isDirty = this.indicesDirty;
    for (var key in this.attributes) {
      isDirty = isDirty || this.attributes[key].isDirty;
    }
    return isDirty;
  }

  getVertexIndex (index) {
    return index;
  }

  getValue (key, vertexIndex, componentIndex) {
    return this.attributes[key].getValue(vertexIndex, componentIndex);
  }

  setValue (key, vertexIndex, componentIndex, value) {
    this.attributes[key].setValue(vertexIndex, componentIndex, value);
  }

  getAttribute (key, vertexIndex) {
    return this.attributes[key].getData(vertexIndex);
  }

  setAttribute (key, vertexIndex, data) {
    this.attributes[key].setData(vertexIndex, data);
  }

  getPosition (vertexIndex) {
    var position = this.getAttribute(ATTR_KEY_POSITIONS, vertexIndex);
    var offset = this.positionOffset;
    position[0] -= offset[0];
    position[1] -= offset[1];
    position[2] -= offset[2];
    return position;
  }

  setPosition (vertexIndex, position) {
    var offset = this.positionOffset;
    position[0] += offset[0];
    position[1] += offset[1];
    position[2] += offset[2];
    this.setAttribute(ATTR_KEY_POSITIONS, vertexIndex, position);
  }

  remove () {
    this.scene.removeObject(this);

    for (var key in this.attributes) {
      this.attributes[key].remove();
    }
  }

}
