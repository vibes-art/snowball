class XHeightMap extends XObject {

  constructor (opts) {
    // XHeightMap is an indexed TRIANGLE_STRIP
    var stripCount = opts.tileWidth - 1;
    var degenCount = 2 * (stripCount - 1);
    var verticesPerStrip = 2 * opts.tileDepth;
    opts.type = opts.gl.TRIANGLE_STRIP;
    opts.vertexCount = (opts.tileWidth + 1) * (opts.tileDepth + 1);
    opts.indexCount = (verticesPerStrip * stripCount) + degenCount;
    opts.useIndices = true;

    super(opts);
  }

  initialize (opts) {
    // define the x and z axes
    this.tileWidth = opts.tileWidth;
    this.tileDepth = opts.tileDepth;
    this.lateralStep = opts.lateralStep || 1;

    // the initial y value (height)
    this.baseHeight = opts.baseHeight || 0;
    if (opts.baseHeightRange) {
      this.baseHeight += opts.baseHeightRange * random();
    }

    // do we have a single color or set of possible colors based on height
    this.color = opts.color || null;
    this.colorLevels = opts.colorLevels || [];

    this.lowestHeight = MAX_SAFE_INTEGER;
    this.highestHeight = MIN_SAFE_INTEGER;
    this.layerHeight = 0;
    this.undergroundColorLevels = [];
    this.isGenerated = false;
    this.oncePerDraw = false;

    super.initialize(opts);
  }

  defineAttributes (opts) {
    var attrOpts = {};
    if (USE_FLOATING_POINT_TEXTURES) {
      this.addAttribute(ATTR_KEY_TEX_COORDS, { ...attrOpts, components: 2 });

      attrOpts.useTexture = true;
      attrOpts.textureWidth = opts.tileWidth + 1;
      attrOpts.textureHeight = opts.tileDepth + 1;
    }
    this.addAttribute(ATTR_KEY_POSITIONS, { ...attrOpts });
    this.addAttribute(ATTR_KEY_NORMALS, { ...attrOpts });
    this.addAttribute(ATTR_KEY_COLORS, { ...attrOpts, components: 4 });
  }

  generate (opts) {
    super.generate(opts);

    this.generateAllPositions();
    this.generateAllNormals();
    this.generateAllColors();
    USE_FLOATING_POINT_TEXTURES && this.generateAllTextureCoords();
    this.addIndices();
    this.isGenerated = true;
  }

  generateAllPositions () {
    var tileWidth = this.tileWidth;
    var tileDepth = this.tileDepth;
    for (var x = 0; x <= tileWidth; x++) {
      for (var z = 0; z <= tileDepth; z++) {
        this.generatePosition(x, z);
      }
    }
  }

  generateAllNormals () {
    var tileWidth = this.tileWidth;
    var tileDepth = this.tileDepth;
    for (var x = 0; x <= tileWidth; x++) {
      for (var z = 0; z <= tileDepth; z++) {
        this.generateNormal(x, z);
      }
    }
  }

  generateAllColors () {
    var tileWidth = this.tileWidth;
    var tileDepth = this.tileDepth;
    for (var x = 0; x <= tileWidth; x++) {
      for (var z = 0; z <= tileDepth; z++) {
        this.generateColor(x, z);
      }
    }
  }

  generateAllTextureCoords () {
    var tileWidth = this.tileWidth;
    var tileDepth = this.tileDepth;
    for (var x = 0; x <= tileWidth; x++) {
      for (var z = 0; z <= tileDepth; z++) {
        this.generateTextureCoord(x, z);
      }
    }
  }

  addIndices () {
    var tileWidth = this.tileWidth;
    var tileDepth = this.tileDepth;
    var index = 0;

    for (var z = 0; z < tileDepth - 1; z++) {
      // degen: repeat first vertex
      if (z > 0) {
        this.indices[index++] = z * (tileWidth + 1);
      }

      for (var x = 0; x < tileWidth; x++) {
        this.indices[index++] = z * (tileWidth + 1) + x;
        this.indices[index++] = (z + 1) * (tileWidth + 1) + x;
      }

      // degen: repeat last vertex
      if (z < tileDepth - 2) {
        this.indices[index++] = (z + 1) * (tileWidth + 1) + (tileWidth - 1);
      }
    }

    this.indicesDirty = true;
  }

  getVertexIndex (x, z) {
    var tileWidth = this.tileWidth;
    var tileDepth = this.tileDepth;
    var lastX = tileWidth;
    var lastZ = tileDepth;
    if (x < 0) x = 0;
    if (z < 0) z = 0;
    if (x > lastX) x = lastX;
    if (z > lastZ) z = lastZ;
    return z * (tileWidth + 1) + x;
  }

  generatePosition (x, z) {
    var index = this.getVertexIndex(x, z);
    var xx = x * this.lateralStep;
    var zz = z * this.lateralStep;

    var offsetY = this.positionOffset[1];
    var height = this.calculateHeight(x, z) + offsetY;
    if (height < this.lowestHeight) this.lowestHeight = height;
    if (height > this.highestHeight) this.highestHeight = height;

    this.setPosition(index, [xx, height - offsetY, zz]);
  }

  getHeight (x, z) {
    var index = this.getVertexIndex(x, z);
    var position = this.getPosition(index);
    return position[1];
  }

  setHeight (x, z, height) {
    var index = this.getVertexIndex(x, z);
    var position = this.getPosition(index);
    position[1] = height;
    this.setPosition(index, position);
  }

  calculateHeight (x, z) {
    return this.baseHeight;
  }

  generateNormal (x, z) {
    var index = this.getVertexIndex(x, z);
    var normal = this.calculateNormal(x, z);
    this.setAttribute(ATTR_KEY_NORMALS, index, normal);
  }

  calculateNormal (x, z) {
    var y1 = this.getHeight(x + 1, z);
    var y3 = this.getHeight(x, z + 1);
    var y4 = this.getHeight(x - 1, z);
    var y5 = this.getHeight(x, z - 1);

    var nx = y4 - y1;
    var ny = this.lateralStep * 2;
    var nz = y5 - y3;
    var length = sqrt(nx * nx + ny * ny + nz * nz);
    return [
      nx / length,
      ny / length,
      nz / length
    ];
  }

  generateColor (x, z) {
    var index = this.getVertexIndex(x, z);
    var color = this.calculateColor(x, z);
    this.setAttribute(ATTR_KEY_COLORS, index, color);
  }

  calculateColor (x, z) {
    if (this.useNormalColors) {
      var index = this.getVertexIndex(x, z);
      var normal = this.getAttribute(ATTR_KEY_NORMALS, index);
      var xn = normal[0];
      var yn = normal[1];
      var zn = normal[2];
      return [
        (xn + 1) / 2,
        (zn + 1) / 2,
        (yn + 1) / 2,
        1.0
      ];
    } else if (this.useRandomColors) {
      return XColorUtils.getRandomColor();
    }

    var height = this.getHeight(x, z);
    var colorHeightOffset = this.getColorHeightOffset(x, z, 0);
    return this.getColorFromHeight(height + colorHeightOffset);
  }

  getColorHeightOffset (x, z, defaultValue) {
    return defaultValue || 0;
  }

  getColorFromHeight (height, colorLevels) {
    var color = this.color;
    if (color) {
      return [
        color.r / 255,
        color.g / 255,
        color.b / 255,
        color.a || this.alpha
      ];
    }

    colorLevels = colorLevels || this.colorLevels;
    var currColor = colorLevels[0];
    var lastColor = colorLevels[0];

    for (var i = 0; i < colorLevels.length; i++) {
      currColor = colorLevels[i];
      if (currColor.height >= height) {
        break;
      }

      lastColor = colorLevels[i];
    }

    var total = currColor.height - lastColor.height;
    var pct = (height - lastColor.height) / total;
    var inv = 1 - pct;

    return [
      (pct * currColor.r + inv * lastColor.r) / 255,
      (pct * currColor.g + inv * lastColor.g) / 255,
      (pct * currColor.b + inv * lastColor.b) / 255,
      this.alpha
    ];
  };

  generateTextureCoord (x, z) {
    if (!USE_FLOATING_POINT_TEXTURES) return;

    var index = this.getVertexIndex(x, z);
    var texCoord = this.calculateTextureCoord(x, z);
    this.setAttribute(ATTR_KEY_TEX_COORDS, index, texCoord);
  }

  calculateTextureCoord (x, z) {
    return [
      x / this.tileWidth,
      z / this.tileDepth
    ];
  }

  update (oncePerDraw) {
    if (oncePerDraw && this.oncePerDraw) {
      return;
    }

    this.oncePerDraw = true;
    this.bindBuffers();
  }

  onDraw (dt) {
    this.oncePerDraw = false;
  }

}
