var QUAD_TRIANGLE_INDICES = [[0, 1, 2], [0, 2, 3]];

class XQuad extends XObject {

  constructor (opts) {
    opts.type = opts.gl.TRIANGLE_FAN;
    opts.vertexCount = 4;
    opts.useIndices = false;

    super(opts);
  }

  initialize (opts) {
    this.vertices = opts.vertices;
    this.color = opts.color || [0.5, 0.5, 0.5, 1];

    this.generatedNormals = [];

    super.initialize(opts);
  }

  defineAttributes (opts) {
    super.defineAttributes(opts);

    this.addAttribute(ATTR_KEY_NORMALS);
    this.addAttribute(ATTR_KEY_COLORS, { components: 4 });
    this.addAttribute(ATTR_KEY_TEX_COORDS, { components: 2 });
  }

  generate (opts) {
    super.generate(opts);

    var vertices = this.vertices;
    if (!vertices || vertices.length < this.vertexCount) {
      console.error(`Missing XQuad vertices data.`);
    }

    // set position first
    for (var i = 0; i < vertices.length; i++) {
      var vertex = vertices[i];
      this.setPosition(i, vertex.position);
    }

    // calculate normals after
    this.generateAllNormals();
    for (var i = 0; i < vertices.length; i++) {
      var vertex = vertices[i];
      this.setAttribute(ATTR_KEY_NORMALS, i, this.calculateNormal(i));
    }

    // set colors after normals
    for (var i = 0; i < vertices.length; i++) {
      this.setAttribute(ATTR_KEY_COLORS, i, this.calculateColor(i));
    }

    for (var i = 0; i < vertices.length; i++) {
      this.setAttribute(ATTR_KEY_TEX_COORDS, i, this.calculateTextureCoord(i));
    }
  }

  generateAllNormals () {
    this.generatedNormals.length = 0;
    for (var i = 0; i < this.vertexCount; i++) {
      this.generatedNormals.push([0, 0, 0]);
    }

    for (var t = 0; t < QUAD_TRIANGLE_INDICES.length; t++) {
      var idx0 = QUAD_TRIANGLE_INDICES[t][0];
      var idx1 = QUAD_TRIANGLE_INDICES[t][1];
      var idx2 = QUAD_TRIANGLE_INDICES[t][2];
      var v0 = this.getPosition(idx0);
      var v1 = this.getPosition(idx1);
      var v2 = this.getPosition(idx2);
      var e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      var e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

      var n = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0]
      ];

      var length = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
      if (length > 0) {
        n[0] /= length;
        n[1] /= length;
        n[2] /= length;
      }

      for (var j = 0; j < 3; j++) {
        var idx = QUAD_TRIANGLE_INDICES[t][j];
        this.generatedNormals[idx][0] += n[0];
        this.generatedNormals[idx][1] += n[1];
        this.generatedNormals[idx][2] += n[2];
      }
    }
  }

  calculateNormal (i) {
    var indexNormal = this.generatedNormals[i];
    var nx = indexNormal[0];
    var ny = indexNormal[1];
    var nz = indexNormal[2];
    var length = sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    return [nx, ny, nz];
  }

  calculateColor (i) {
    if (this.useNormalColors) {
      var normal = this.getAttribute(ATTR_KEY_NORMALS, i);
      return XColorUtils.getNormalColor(normal);
    }

    var vertex = this.vertices[i];
    var color = vertex.color || this.color;
    return [
      color[0] || 0.5,
      color[1] || 0.5,
      color[2] || 0.5,
      color[3] !== undefined ? color[3] : 1.0
    ];
  }

  calculateTextureCoord (i) {
    switch (i) {
      case 0: return [1.0, 1.0];
      case 1: return [1.0, 0.0];
      case 2: return [0.0, 0.0];
      case 3: return [0.0, 1.0];
    }
  }

}
