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
    this.parentObject = null;
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
    this.enableRenderPass(RENDER_PASS_EMISSIVE, true);
  }

  defineAttributes (opts) {
    this.addAttribute(ATTR_KEY_POSITIONS);
  }

  defineUniforms (opts) {
    this.setMatrices(opts.modelMatrix);
    this.addUniform(UNI_KEY_EMISSION, { components: 1, data: 0 });
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

  generate (opts) {
    var vertices = opts.vertices || this.vertices;
    if (!vertices) return;

    this.vertexCount = vertices.length;

    var hasTexCoords = this.hasAttribute(ATTR_KEY_TEX_COORDS);
    var hasNormals = this.hasAttribute(ATTR_KEY_NORMALS);
    var hasTangents = this.hasAttribute(ATTR_KEY_TANGENTS);
    var hasColors = this.hasAttribute(ATTR_KEY_COLORS);

    // set positions and tex coords first
    for (var i = 0; i < this.vertexCount; i++) {
      var vertex = vertices[i];
      this.setPosition(i, vertex.position);
      hasTexCoords && this.setAttribute(ATTR_KEY_TEX_COORDS, i, this.calculateTextureCoord(i));
    }

    // calculate normals and tangents after
    var vectors = this.getVertexVectors();
    for (var i = 0; i < this.vertexCount; i++) {
      hasNormals && this.setAttribute(ATTR_KEY_NORMALS, i, vectors.normals[i]);
      hasTangents && this.setAttribute(ATTR_KEY_TANGENTS, i, vectors.tangents[i]);
    }

    // colors may depend on normals, so do them last
    for (var i = 0; i < this.vertexCount; i++) {
      hasColors && this.setAttribute(ATTR_KEY_COLORS, i, this.calculateColor(i));
    }
  }

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

  hasAttribute (key) {
    return !!this.attributes[key];
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
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.drawElements(primitiveType, count, gl.UNSIGNED_INT, offset);
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

  getPosition (vertexIndex, includeOffset) {
    var position = this.getAttribute(ATTR_KEY_POSITIONS, vertexIndex);
    if (!includeOffset) {
      var offset = this.positionOffset;
      position[0] -= offset[0];
      position[1] -= offset[1];
      position[2] -= offset[2];
    }
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

  getVertexVectors (indices) {
    indices = indices || this.indices;

    var hasTexCoords = this.hasAttribute(ATTR_KEY_TEX_COORDS);
    var hasNormals = this.hasAttribute(ATTR_KEY_NORMALS);
    var hasTangents = this.hasAttribute(ATTR_KEY_TANGENTS);
    if (!hasNormals && !hasTangents) return;

    var result = {
      normals: [],
      tangents: []
    };

    for (var i = 0; i < this.vertexCount; i++) {
      result.normals.push([0, 0, 0]);
      result.tangents.push([0, 0, 0]);
    }

    for (var t = 0; t < indices.length; t += 3) {
      var idx0 = indices[t + 0];
      var idx1 = indices[t + 1];
      var idx2 = indices[t + 2];

      var p0 = this.getPosition(idx0);
      var p1 = this.getPosition(idx1);
      var p2 = this.getPosition(idx2);
      var e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      var e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

      var nx = e1[1] * e2[2] - e1[2] * e2[1];
      var ny = e1[2] * e2[0] - e1[0] * e2[2];
      var nz = e1[0] * e2[1] - e1[1] * e2[0];
      var normal = XUtils.normalize([nx, ny, nz]);

      var tangent = [0, 0, 0];
      if (hasTexCoords) {
        var uv0 = this.getAttribute(ATTR_KEY_TEX_COORDS, idx0);
        var uv1 = this.getAttribute(ATTR_KEY_TEX_COORDS, idx1);
        var uv2 = this.getAttribute(ATTR_KEY_TEX_COORDS, idx2);
        var dUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
        var dUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];

        var f = dUV1[0] * dUV2[1] - dUV1[1] * dUV2[0];
        f = abs(f) < ZERO_LENGTH ? 1 : 1 / f;

        var tx = f * (e1[0] * dUV2[1] - e2[0] * dUV1[1]);
        var ty = f * (e1[1] * dUV2[1] - e2[1] * dUV1[1]);
        var tz = f * (e1[2] * dUV2[1] - e2[2] * dUV1[1]);
        tangent = XUtils.normalize([tx, ty, tz]);
      }

      [idx0, idx1, idx2].forEach((vi) => {
        result.normals[vi][0] += normal[0];
        result.normals[vi][1] += normal[1];
        result.normals[vi][2] += normal[2];
        result.tangents[vi][0] += tangent[0];
        result.tangents[vi][1] += tangent[1];
        result.tangents[vi][2] += tangent[2];
      });
    }

    for (var i = 0; i < this.vertexCount; i++) {
      result.normals[i] = XUtils.normalize(result.normals[i]);
      result.tangents[i] = XUtils.normalize(result.tangents[i]);
    }

    return result;
  }

  getWorldVertices () {
    var worldVertices = [];
    var modelMatrix = this.matrices && this.matrices.model && this.matrices.model.data;

    for (var i = 0; i < this.vertexCount; i++) {
      var pos = this.getPosition(i, true);
      if (modelMatrix) pos = XMatrix4.transformPoint(modelMatrix, pos);
      worldVertices.push(pos);
    }

    return worldVertices;
  }

  intersectsRay (rayOrigin, rayDir) {
    var sphere = this.getBoundingSphere();
    return XVector3.rayIntersectsSphere(rayOrigin, rayDir, sphere);
  }

  isInFrustum (planes) {
    var sphere = this.getBoundingSphere();
    return XMatrix4.isSphereInFrustum(sphere, planes);
  }

  getBoundingSphere () {
    return this.computeBoundingSphere();
  }

  computeBoundingSphere () {
    var minBounds = [MAX_SAFE_INTEGER, MAX_SAFE_INTEGER, MAX_SAFE_INTEGER];
    var maxBounds = [MIN_SAFE_INTEGER, MIN_SAFE_INTEGER, MIN_SAFE_INTEGER];

    for (var i = 0; i < this.vertexCount; i++) {
      var pos = this.getPosition(i);
      minBounds[0] = min(minBounds[0], pos[0]);
      minBounds[1] = min(minBounds[1], pos[1]);
      minBounds[2] = min(minBounds[2], pos[2]);
      maxBounds[0] = max(maxBounds[0], pos[0]);
      maxBounds[1] = max(maxBounds[1], pos[1]);
      maxBounds[2] = max(maxBounds[2], pos[2]);
    }

    var center = [
      (minBounds[0] + maxBounds[0]) / 2,
      (minBounds[1] + maxBounds[1]) / 2,
      (minBounds[2] + maxBounds[2]) / 2
    ];

    var radius = 0;
    for (var i = 0; i < this.vertexCount; i++) {
      var pos = this.getPosition(i);
      var dist = XVector3.distance(pos, center);
      if (dist > radius) radius = dist;
    }

    if (this.matrices && this.matrices.model && this.matrices.model.data) {
      center = XMatrix4.transformPoint(this.matrices.model.data, center);
      var origin = XMatrix4.transformPoint(this.matrices.model.data, [0, 0, 0]);
      var unitX = XMatrix4.transformPoint(this.matrices.model.data, [1, 0, 0]);
      var scaleFactor = XVector3.distance(origin, unitX);
      radius *= scaleFactor;
    }

    return { center, radius };
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

    this.indexBuffer && XGLUtils.deleteBuffer(this.gl, this.indexBuffer);
    this.indexBuffer = null;

    // we don't remove XMaterials here bc they are shared
  }

}
