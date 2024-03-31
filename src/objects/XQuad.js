class XQuad extends XObject {

  constructor (opts) {
    opts.type = opts.gl.TRIANGLE_FAN;
    opts.vertexCount = 4;
    opts.useIndices = false;

    super(opts);
  }

  initialize (opts) {
    this.vertices = opts.vertices;

    super.initialize(opts);
  }

  defineAttributes (opts) {
    super.defineAttributes(opts);

    this.addAttribute(ATTR_KEY_NORMALS);
    this.addAttribute(ATTR_KEY_COLORS, { components: 4 });
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
      this.setAttribute(ATTR_KEY_COLORS, i, this.calculateColor(i));
    }

    // calculate normals after
    for (var i = 0; i < vertices.length; i++) {
      var vertex = vertices[i];
      this.setAttribute(ATTR_KEY_NORMALS, i, this.calculateNormal(i));
    }
  }

  calculateNormal (i) {
    // TODO: currently only supports flat shading
    var A = this.getPosition(0);
    var B = this.getPosition(1);
    var D = this.getPosition(3);
    var abX = B[0] - A[0];
    var abY = B[1] - A[1];
    var abZ = B[2] - A[2];
    var adX = D[0] - A[0];
    var adY = D[1] - A[1];
    var adZ = D[2] - A[2];
    var normalX = abY * adZ - abZ * adY;
    var normalY = abZ * adX - abX * adZ;
    var normalZ = abX * adY - abY * adX;
    var length = sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;
    var normalizedX = normalX / length;
    var normalizedY = normalY / length;
    var normalizedZ = normalZ / length;
    return [normalizedX, normalizedY, normalizedZ];
  }

  calculateColor (i) {
    var vertex = this.vertices[i];
    var color = vertex.color || [0.5, 0.5, 0.5, 1];
    return [
      color[0] || 0.5,
      color[1] || 0.5,
      color[2] || 0.5,
      color[3] !== undefined ? color[3] : 1.0
    ];
  }

}
