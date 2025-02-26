var QUAD_TRIANGLE_INDICES = [0, 1, 2, 0, 2, 3];

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

    super.initialize(opts);
  }

  defineAttributes (opts) {
    super.defineAttributes(opts);

    this.addAttribute(ATTR_KEY_NORMALS);
    this.addAttribute(ATTR_KEY_COLORS, { components: 4 });
    this.addAttribute(ATTR_KEY_TEX_COORDS, { components: 2 });
    this.addAttribute(ATTR_KEY_TANGENTS, { components: 3 });
  }

  getVertexVectors () {
    return super.getVertexVectors(QUAD_TRIANGLE_INDICES);
  }

  calculateColor (i) {
    if (this.useNormalColors) {
      var normal = this.getAttribute(ATTR_KEY_NORMALS, i);
      return XColorUtils.getNormalColor(normal);
    }

    var vertex = this.vertices[i];
    var color = vertex.color || this.color;
    return [
      color[0], color[1], color[2],
      color[3] !== undefined ? color[3] : 1
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

  intersectsRay (rayOrigin, rayDir) {
    var v = this.getWorldVertices();

    for (var t = 0; t < QUAD_TRIANGLE_INDICES.length; t += 3) {
      var idx0 = QUAD_TRIANGLE_INDICES[t + 0];
      var idx1 = QUAD_TRIANGLE_INDICES[t + 1];
      var idx2 = QUAD_TRIANGLE_INDICES[t + 2];
      if (XVector3.rayIntersectsTriangle(rayOrigin, rayDir, v[idx0], v[idx1], v[idx2])) {
        return true;
      }
    }

    return false;
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

      if (outCount === 4) {
        return false;
      }
    }

    return true;
  }

}
