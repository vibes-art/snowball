class XSphere extends XObject {

  constructor (opts) {
    opts.type = opts.gl.TRIANGLES;
    opts.useIndices = true;
    opts.vertexCount = (opts.rings + 1) * (opts.segments + 1);

    super(opts);
  }

  get center () {
    var m = this.getModelMatrix();
    return [m[12], m[13], m[14]];
  }

  initialize (opts) {
    this.rings = opts.rings || 16;
    this.segments = opts.segments || 32;
    this.radius = opts.radius || 1;
    this.color = opts.color || [0.5, 0.5, 0.5, 1];

    this.vertices = [];
    this.indices = null;

    super.initialize(opts);
  }

  defineAttributes (opts) {
    super.defineAttributes(opts);

    this.addAttribute(ATTR_KEY_NORMALS);
    this.addAttribute(ATTR_KEY_COLORS, { components: 4 });
    this.addAttribute(ATTR_KEY_TEX_COORDS, { components: 2 });
    this.addAttribute(ATTR_KEY_TANGENTS, { components: 3 });
  }

  generate (opts) {
    this.generateSphereIndices();
    this.generateSphereVertices();
    super.generate(opts);
  }

  generateSphereIndices () {
    var indices = [];

    for (var lat = 0; lat < this.rings; lat++) {
      for (var lon = 0; lon < this.segments; lon++) {
        var current = lat * (this.segments + 1) + lon;
        var next = current + (this.segments + 1);
        indices.push(current, current + 1, next);
        indices.push(next + 1, next, current + 1);
      }
    }

    this.indexCount = indices.length;
    this.indices = new Uint32Array(indices);
    this.indicesDirty = true;
  }

  generateSphereVertices () {
    this.vertices = [];

    for (var lat = 0; lat <= this.rings; lat++) {
      var phi = Math.PI * (lat / this.rings);

      for (var lon = 0; lon <= this.segments; lon++) {
        var theta = TAU * (lon / this.segments);

        // spherical -> cartesian
        var sinPhi = sin(phi);
        var cosPhi = cos(phi);
        var sinTheta = sin(theta);
        var cosTheta = cos(theta);
        var x = this.radius * sinPhi * cosTheta;
        var y = this.radius * cosPhi;
        var z = this.radius * sinPhi * sinTheta;
        var u = 1 - (lon / this.segments);
        var v = 1 - (lat / this.rings);

        this.vertices.push({
          position: [x, y, z],
          color: this.color,
          uv: [u, v]
        });
      }
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
      color[0], color[1], color[2],
      color[3] !== undefined ? color[3] : 1
    ];
  }

  calculateTextureCoord (i) {
    var vertex = this.vertices[i];
    if (vertex.uv) return [vertex.uv[0], vertex.uv[1]];
    return [0, 0];
  }

  computeBoundingSphere () {
    return {
      center: this.center,
      radius: this.radius
    };
  }

}
