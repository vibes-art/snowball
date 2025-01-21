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
    this.generatedTangents = [];
    this.generatedBitangents = [];

    super.initialize(opts);
  }

  defineAttributes (opts) {
    super.defineAttributes(opts);

    this.addAttribute(ATTR_KEY_NORMALS);
    this.addAttribute(ATTR_KEY_COLORS, { components: 4 });
    this.addAttribute(ATTR_KEY_TEX_COORDS, { components: 2 });
    this.addAttribute(ATTR_KEY_TANGENTS, { components: 3 });
    this.addAttribute(ATTR_KEY_BITANGENTS, { components: 3 });
  }

  generate (opts) {
    super.generate(opts);

    var vertices = this.vertices;
    if (!vertices || vertices.length < this.vertexCount) {
      console.error(`Missing XQuad vertices data.`);
    }

    // TODO: generalize all of this and move to XObject?

    // set positions and tex coords first
    for (var i = 0; i < vertices.length; i++) {
      var vertex = vertices[i];
      this.setPosition(i, vertex.position);
      this.setAttribute(ATTR_KEY_TEX_COORDS, i, this.calculateTextureCoord(i));
    }

    // calculate normals and tangents after
    this.generateAllVectors();
    for (var i = 0; i < vertices.length; i++) {
      this.setAttribute(ATTR_KEY_NORMALS, i, this.generatedNormals[i]);
      this.setAttribute(ATTR_KEY_TANGENTS, i, this.generatedTangents[i]);
      this.setAttribute(ATTR_KEY_BITANGENTS, i, this.generatedBitangents[i]);
    }

    // colors may depend on normals, so do them last
    for (var i = 0; i < vertices.length; i++) {
      this.setAttribute(ATTR_KEY_COLORS, i, this.calculateColor(i));
    }
  }

  generateAllVectors () {
    this.generatedNormals.length = 0;
    this.generatedTangents.length = 0;
    this.generatedBitangents.length = 0;

    for (var i = 0; i < this.vertexCount; i++) {
      this.generatedNormals.push([0, 0, 0]);
      this.generatedTangents.push([0, 0, 0]);
      this.generatedBitangents.push([0, 0, 0]);
    }

    for (var t = 0; t < QUAD_TRIANGLE_INDICES.length; t++) {
      var idx0 = QUAD_TRIANGLE_INDICES[t][0];
      var idx1 = QUAD_TRIANGLE_INDICES[t][1];
      var idx2 = QUAD_TRIANGLE_INDICES[t][2];

      var p0 = this.getPosition(idx0);
      var p1 = this.getPosition(idx1);
      var p2 = this.getPosition(idx2);
      var e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      var e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

      var nx = e1[1] * e2[2] - e1[2] * e2[1];
      var ny = e1[2] * e2[0] - e1[0] * e2[2];
      var nz = e1[0] * e2[1] - e1[1] * e2[0];
      var normal = XUtils.normalize([nx, ny, nz]);

      var uv0 = this.getAttribute(ATTR_KEY_TEX_COORDS, idx0);
      var uv1 = this.getAttribute(ATTR_KEY_TEX_COORDS, idx1);
      var uv2 = this.getAttribute(ATTR_KEY_TEX_COORDS, idx2);
      var dUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
      var dUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];

      var f = dUV1[0] * dUV2[1] - dUV1[1] * dUV2[0];
      f = abs(f) < 1e-8 ? 1.0 : 1.0 / f;

      var tx = f * (e1[0] * dUV2[1] - e2[0] * dUV1[1]);
      var ty = f * (e1[1] * dUV2[1] - e2[1] * dUV1[1]);
      var tz = f * (e1[2] * dUV2[1] - e2[2] * dUV1[1]);
      var tangent = XUtils.normalize([tx, ty, tz]);

      var bx = f * (e2[0] * dUV1[0] - e1[0] * dUV2[0]);
      var by = f * (e2[1] * dUV1[0] - e1[1] * dUV2[0]);
      var bz = f * (e2[2] * dUV1[0] - e1[2] * dUV2[0]);
      var bitangent = XUtils.normalize([bx, by, bz]);

      [idx0, idx1, idx2].forEach((vi) => {
        this.generatedNormals[vi][0] += normal[0];
        this.generatedNormals[vi][1] += normal[1];
        this.generatedNormals[vi][2] += normal[2];
        this.generatedTangents[vi][0] += tangent[0];
        this.generatedTangents[vi][1] += tangent[1];
        this.generatedTangents[vi][2] += tangent[2];
        this.generatedBitangents[vi][0] += bitangent[0];
        this.generatedBitangents[vi][1] += bitangent[1];
        this.generatedBitangents[vi][2] += bitangent[2];
      });
    }

    for (var i = 0; i < this.vertexCount; i++) {
      this.generatedNormals[i] = XUtils.normalize(this.generatedNormals[i]);
      this.generatedTangents[i] = XUtils.normalize(this.generatedTangents[i]);
      this.generatedBitangents[i] = XUtils.normalize(this.generatedBitangents[i]);
    }
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
