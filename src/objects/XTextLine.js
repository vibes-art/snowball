var TEXT_ALIGN_LEFT = 'left';
var TEXT_ALIGN_RIGHT = 'right';
var TEXT_ALIGN_CENTER = 'center';

class XTextLine extends XObject {

  constructor (opts) {
    opts.type = opts.gl.TRIANGLE_STRIP;
    opts.shader = opts.scene.getTextShader();
    super(opts);

    this.font = opts.font;
    this.scale = opts.scale || 1;
    this._align = opts.align || TEXT_ALIGN_CENTER;
    this._alpha = 0.99;

    this.setText(opts.text);

    this.enableRenderPass(RENDER_PASS_SHADOWS, false);
  }

  setText (text) {
    this.text = text = text || '';

    var glyphs = this.font.getGlyphsForText(text);

    // 4 verts per glyph, plus 2 degenerate between each
    var totalVertices = 4 * glyphs.length;
    var totalIndices = glyphs.length > 0 ? 4 + 6 * (glyphs.length - 1) : 0;

    this.vertexCount = totalVertices;
    this.indexCount = totalIndices;
    this.useIndices = true;
    this.glyphs = glyphs;

    this.indices = new Uint32Array(this.indexCount);
    this.indexBuffer && XGLUtils.deleteBuffer(this.gl, this.indexBuffer);
    this.indexBuffer = null;

    this.updateAttributes();

    var width = 0;
    if (glyphs.length) {
      var lastGlyph = glyphs[glyphs.length - 1];
      width = lastGlyph.offsetX + lastGlyph.advanceX;
    }

    this.width = width;
    this.align = this.align; // trigger update
  }

  get align () {
    return this._align;
  }

  set align (value) {
    var oldValue = this._align;
    this._align = value;
    this.updateAlignment(oldValue);
    return value;
  }

  defineAttributes (opts) {
    super.defineAttributes(opts);

    this.addAttribute(ATTR_KEY_NORMALS);
    this.addAttribute(ATTR_KEY_TANGENTS);
    this.addAttribute(ATTR_KEY_COLORS, { components: 4 });
    this.addAttribute(ATTR_KEY_TEX_COORDS, { components: 2 });
  }

  defineUniforms (opts) {
    super.defineUniforms(opts);

    this.uniforms[UNI_KEY_SOURCE_TEXTURE] = opts.font.sourceTexture;
  }

  generate (opts) {}

  updateAttributes () {
    for (var key in this.attributes) {
      this.attributes[key].updateVertexCount(this.vertexCount);
    }

    var positions = [];
    var texCoords = [];
    var normals = [];
    var tangents = [];
    var colors = [];

    var whiteColor = [1, 1, 1, this.alpha];
    var frontNormal = [0, 0, 1];
    var tangent = [0, 1, 0];

    for (var i = 0; i < this.glyphs.length; i++) {
      var g = this.glyphs[i];
      var pb = g.planeBounds;
      var ab = g.atlasBounds;
      var offsetX = g.offsetX;

      var left = (offsetX + pb.left) * this.scale;
      var right = (offsetX + pb.right) * this.scale;
      var bottom = pb.bottom * this.scale;
      var top = pb.top * this.scale;

      var u0 = ab.left / this.font.atlasWidth;
      var u1 = ab.right / this.font.atlasWidth;
      var v0 = 1.0 - (ab.bottom / this.font.atlasHeight);
      var v1 = 1.0 - (ab.top / this.font.atlasHeight);

      positions.push([left, top, 0]);
      texCoords.push([u0, v1]);
      normals.push(frontNormal);
      tangents.push(tangent);
      colors.push(whiteColor);

      positions.push([left, bottom, 0]);
      texCoords.push([u0, v0]);
      normals.push(frontNormal);
      tangents.push(tangent);
      colors.push(whiteColor);

      positions.push([right, top, 0]);
      texCoords.push([u1, v1]);
      normals.push(frontNormal);
      tangents.push(tangent);
      colors.push(whiteColor);

      positions.push([right, bottom, 0]);
      texCoords.push([u1, v0]);
      normals.push(frontNormal);
      tangents.push(tangent);
      colors.push(whiteColor);
    }

    for (var i = 0; i < positions.length; i++) {
      this.setAttribute(ATTR_KEY_POSITIONS, i, positions[i]);
      this.setAttribute(ATTR_KEY_TEX_COORDS, i, texCoords[i]);
      this.setAttribute(ATTR_KEY_NORMALS, i, normals[i]);
      this.setAttribute(ATTR_KEY_TANGENTS, i, tangents[i]);
      this.setAttribute(ATTR_KEY_COLORS, i, colors[i]);
    }

    this.generateIndices();
    this.updateVertexAttributes();
  }

  generateIndices () {
    var index = 0;
    var count = 0;
    for (var i = 0; i < this.glyphs.length; i++) {
      var base = i * 4;

      // degenerate triangles between each glyph
      if (i > 0) {
        this.indices[index++] = (i - 1) * 4 + 3; count++;
        this.indices[index++] = base; count++;
      }

      this.indices[index++] = base + 0; count++;
      this.indices[index++] = base + 1; count++;
      this.indices[index++] = base + 2; count++;
      this.indices[index++] = base + 3; count++;
    }

    this.indicesDirty = true;
  }

  isInFrustum (planes) {
    var worldVertices = this.getWorldVertices();

    for (var p = 0; p < planes.length; p++) {
      var plane = planes[p];
      var outCount = 0;

      for (var v = 0; v < worldVertices.length; v++) {
        var x = worldVertices[v][0];
        var y = worldVertices[v][1];
        var z = worldVertices[v][2];
        var dist = plane[0] * x + plane[1] * y + plane[2] * z + plane[3];
        if (dist < 0) outCount++;
      }

      if (outCount === worldVertices.length) {
        return false;
      }
    }

    return true;
  }

  updateAlignment (oldAlign) {
    var offsetX = 0;
    var width = this.width * this.scale;

    switch (oldAlign) {
      case TEXT_ALIGN_RIGHT: offsetX += width; break;
      case TEXT_ALIGN_CENTER: offsetX += width / 2; break;
    }

    switch (this.align) {
      case TEXT_ALIGN_RIGHT: offsetX -= width; break;
      case TEXT_ALIGN_CENTER: offsetX -= width / 2; break;
    }

    var modelMatrix = this.getModelMatrix();
    this.setModelMatrix(XMatrix4.translate(modelMatrix, offsetX, 0, 0));
  }

}
