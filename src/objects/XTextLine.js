var TEXT_ALIGN_LEFT = 'left';
var TEXT_ALIGN_RIGHT = 'right';
var TEXT_ALIGN_CENTER = 'center';

var TEXT_VERT_ALIGN_TOP = 'top';
var TEXT_VERT_ALIGN_BOTTOM = 'bottom';
var TEXT_VERT_ALIGN_CENTER = 'center';

class XTextLine extends XObject {

  constructor (opts) {
    opts = opts || {};
    opts.type = opts.gl.TRIANGLE_STRIP;
    opts.shader = opts.shader !== undefined ? opts.shader : opts.scene.getTextShader();
    super(opts);

    this.font = opts.font;
    this.font && this.font.onLoaded && this.font.onLoaded(() => this.updateTextShadowPass());

    this.scale = opts.scale || 1;
    this._alpha = 1;
    this.hasTransparency = true;

    this._align = opts.align || TEXT_ALIGN_CENTER;
    this.hasAligned = false;
    this.previousAlignment = 0;

    this._vertAlign = opts.vertAlign || TEXT_VERT_ALIGN_BOTTOM;
    this.hasVertAligned = false;
    this.previousVertAlignment = 0;

    this.textShadow = new XTextShadow(opts.textShadow);
    if (opts.castTextShadow !== undefined) {
      this.textShadow.setEnabled(opts.castTextShadow);
    }

    this.setText(opts.text);
    this.setTextShadow(this.textShadow);
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
    var height = 0;
    if (glyphs.length) {
      var lastGlyph = glyphs[glyphs.length - 1];
      width = lastGlyph.offsetX + lastGlyph.advanceX;

      var top = 0;
      for (var i = 0; i < glyphs.length; i++) {
        var glyph = glyphs[i];
        var pb = glyph.planeBounds || {};
        var test = pb.top || 0;
        if (test > top) {
          top = test;
        }
      }

      height = top;
    }

    this.width = width;
    this.height = height;
    this.align = this.align; // trigger update
    this.vertAlign = this.vertAlign;
    this.updateTextShadowPass();
  }

  get align () {
    return this._align;
  }

  set align (value) {
    this._align = value;
    this.updateAlignment();
    return value;
  }

  get vertAlign () {
    return this._vertAlign;
  }

  set vertAlign (value) {
    this._vertAlign = value;
    this.updateVertAlignment();
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

    var textShadow = opts.textShadow || {};
    var alphaCutoff = textShadow.alphaCutoff !== undefined
      ? textShadow.alphaCutoff
      : TEXT_SHADOW_ALPHA_CUTOFF_DEFAULT;
    this.addUniform(UNI_KEY_BASE_COLOR, { data: opts.baseColor || [1, 1, 1, 1] });
    this.addUniform(UNI_KEY_THICKNESS, { components: 1, data: opts.thickness || 0 });
    this.addUniform(UNI_KEY_SOFTNESS, { components: 1, data: opts.softness || 0 });
    this.addUniform(UNI_KEY_TEXT_SHADOW_ALPHA_CUTOFF, { components: 1, data: alphaCutoff });
  }

  defineTextures (opts) {
    super.defineTextures(opts);

    this.textures[UNI_KEY_SOURCE_TEXTURE] = opts.font.sourceTexture;
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

  hasTextShadowCaster () {
    return !!(this.textShadow
      && this.textShadow.enabled
      && this.isFontTextureReady()
      && this.glyphs
      && this.glyphs.length);
  }

  updateTextShadowPass () {
    this.enableRenderPass(RENDER_PASS_SHADOWS, this.hasTextShadowCaster());
  }

  draw () {
    if (!this.isFontTextureReady()) return;
    super.draw();
  }

  isFontTextureReady () {
    var texture = this.font && this.font.sourceTexture;
    return !!(texture
      && texture.isLoaded
      && !texture.isLoading
      && !(texture.width <= 1 && texture.height <= 1));
  }

  setTextShadow (textShadow) {
    if (textShadow instanceof XTextShadow) {
      this.textShadow = textShadow;
    } else if (typeof textShadow === 'boolean') {
      this.textShadow.setEnabled(textShadow);
    } else if (textShadow) {
      this.textShadow.apply(textShadow);
    }

    this.setTextShadowMode(this.textShadow.mode);
    this.setTextShadowAlphaCutoff(this.textShadow.alphaCutoff);
    this.updateTextShadowPass();
    return this.textShadow;
  }

  setTextShadowEnabled (enabled) {
    this.textShadow.setEnabled(enabled);
    this.updateTextShadowPass();
    return this.textShadow.enabled;
  }

  setTextShadowMode (mode) {
    var previousMode = this.textShadow.mode;
    this.textShadow.setMode(mode);

    if (previousMode !== this.textShadow.mode && this.scene) {
      this.scene.haveObjectsChanged = true;
      this.scene.invalidateRenderPass(RENDER_PASS_SHADOWS);
    }

    this.updateTextShadowPass();
    return this.textShadow.mode;
  }

  setTextShadowAlphaCutoff (alphaCutoff) {
    this.textShadow.setAlphaCutoff(alphaCutoff);
    this.uniforms[UNI_KEY_TEXT_SHADOW_ALPHA_CUTOFF].data = this.textShadow.alphaCutoff;
    return this.textShadow.alphaCutoff;
  }

  getShaderForRenderPass (pass, fallbackShader) {
    if (!pass || pass.type !== RENDER_PASS_SHADOWS) return fallbackShader;
    if (!this.hasTextShadowCaster()) return fallbackShader;
    if (!pass.shadowUniformKey || !pass.shadowMaxLights) return fallbackShader;

    return this.scene.getTextShadowShader(
      pass.shadowUniformKey,
      pass.shadowMaxLights,
      this.textShadow.mode
    );
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

  updateAlignment () {
    var offsetX = 0;
    var width = this.width * this.scale;

    if (this.hasAligned) {
      offsetX -= this.previousAlignment;
    }

    switch (this.align) {
      case TEXT_ALIGN_RIGHT: offsetX -= width; break;
      case TEXT_ALIGN_CENTER: offsetX -= width / 2; break;
    }

    var modelMatrix = this.getModelMatrix();
    this.setModelMatrix(XMatrix4.translate(modelMatrix, offsetX, 0, 0));

    this.hasAligned = true;
    this.previousAlignment = offsetX;
  }

  updateVertAlignment () {
    var offsetY = 0;
    var height = this.height * this.scale;

    if (this.hasVertAligned) {
      offsetY -= this.previousVertAlignment;
    }

    switch (this.vertAlign) {
      case TEXT_VERT_ALIGN_TOP: offsetY -= height; break;
      case TEXT_VERT_ALIGN_CENTER: offsetY -= height / 2; break;
    }

    var modelMatrix = this.getModelMatrix();
    this.setModelMatrix(XMatrix4.translate(modelMatrix, 0, offsetY, 0));

    this.hasVertAligned = true;
    this.previousVertAlignment = offsetY;
  }

  setModelMatrix (modelMatrix) {
    this.hasAligned = false;
    this.previousAlignment = 0;

    this.hasVertAligned = false;
    this.previousVertAlignment = 0;

    super.setModelMatrix(modelMatrix);
  }

}
