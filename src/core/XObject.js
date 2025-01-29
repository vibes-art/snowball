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
    this.frontFace = opts.frontFace || opts.gl.CCW;

    this.attributes = {};
    this.uniforms = {};
    this.matrices = null;
    this.material = null;
    this.isActive = false;

    this.indices = this.useIndices ? new Uint32Array(this.indexCount) : null;
    this.indexBuffer = null;
    this.indicesDirty = false;

    this.renderPasses = {};

    this.initialize(opts);
  }

  initialize (opts) {
    this.defineAttributes(opts);
    this.defineUniforms(opts);
    this.setShader(opts);
    this.setMaterial(opts);
    this.generate(opts);
    this.updateVertexAttributes();
    this.scene.addObject(this);

    this.enableRenderPass(RENDER_PASS_LIGHTS, true);
    this.enableRenderPass(RENDER_PASS_MAIN, true);
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

  setMaterial (opts) {
    var material = opts.material || null;
    this.material = material;
    this.scene.updateObjectShader(this);
  }

  generate (opts) { /* override */ }

  enableRenderPass (type, isEnabled) {
    this.renderPasses[type] = isEnabled !== undefined ? isEnabled : true;
  }

  addAttribute (key, opts) {
    opts = opts || {};
    opts.key = key;
    opts.gl = this.gl;
    opts.count = this.vertexCount;

    if (opts.useTexture || opts.texture) {
      opts.textureUniform = this.getTextureUniformForAttribute(key, opts);
    }

    return this.attributes[key] = new XAttribute(opts);
  }

  addUniform (key, opts) {
    opts = opts || {};
    opts.key = key;

    return this.uniforms[key] = new XUniform(opts);
  }

  setTextureForAttribute (texture, attribKey) {
    var attrib = this.attributes[attribKey];
    var uniform = this.getTextureUniformForAttribute(attribKey, { texture });
    attrib.setTexture(texture, uniform);
  }

  getTextureUniformForAttribute (attribKey, opts) {
    opts = opts || {};

    var uniformKey = `${attribKey}Texture`;
    var uniform = this.uniforms[uniformKey];

    if (!uniform) {
      var uniformOpts = {};
      uniformOpts.type = UNI_TYPE_INT;
      uniformOpts.components = 1;
      uniformOpts.texture = opts.texture || null;
      uniform = this.addUniform(uniformKey, uniformOpts);
    }

    return uniform;
  }

  setMatrices (modelMatrix) {
    if (!modelMatrix) return;

    this.matrices = {};
    this.matrices.model = new XUniform({ key: UNI_KEY_MODEL_MATRIX, type: UNI_TYPE_MATRIX });
    this.matrices.normal = new XUniform({ key: UNI_KEY_NORMAL_MATRIX, type: UNI_TYPE_MATRIX });

    this.matrices.model.data = modelMatrix;
    this.matrices.model.data = XMatrix4.scale(this.matrices.model.data, -1, 1, 1);
    this.matrices.normal.data = XMatrix4.invert(this.matrices.model.data);
    this.matrices.normal.data = XMatrix4.transpose(this.matrices.normal.data);
  }

  updateVertexAttributes () {
    for (var key in this.attributes) {
      this.attributes[key].update();
    }

    if (this.useIndices) {
      this.indexBuffer = XGLUtils.setBuffer(this.gl, this.indexBuffer, this.indices, {
        isDirty: this.indicesDirty,
        target: this.gl.ELEMENT_ARRAY_BUFFER
      });
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
    if (isDirty) return isDirty;

    for (var key in this.attributes) {
      isDirty = isDirty || this.attributes[key].isDirty;
      if (isDirty) return isDirty;
    }

    for (var key in this.uniforms) {
      isDirty = isDirty || this.uniforms[key].isDirty;
      if (isDirty) return isDirty;
    }

    if (this.matrices) {
      for (var key in this.matrices) {
        isDirty = isDirty || this.matrices[key].isDirty;
        if (isDirty) return isDirty;
      }
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

  getUniforms () {
    return this.uniforms;
  }

  onDrawFinish () {
    this.indicesDirty = false;

    for (var key in this.attributes) {
      this.attributes[key].isDirty = false;
    }

    for (var key in this.uniforms) {
      this.uniforms[key].isDirty = false;
    }

    if (this.matrices) {
      for (var key in this.matrices) {
        this.matrices[key].isDirty = false;
      }
    }

    if (this.material) {
      var uniforms = this.material.getUniforms();
      for (var key in uniforms) {
        uniforms[key].isDirty = false;
      }
    }
  }

  remove () {
    this.scene.removeObject(this);

    for (var key in this.attributes) {
      this.attributes[key].remove();
    }

    for (var key in this.uniforms) {
      this.uniforms[key].remove(this.gl);
    }

    // we don't remove XMaterials here bc they are shared
  }

}
