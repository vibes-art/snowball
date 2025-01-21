var BOX_VERTEX_SIGNS = [[-1,1,1],[ 1,1,1],[ 1,1,-1],[-1,1,-1],[-1,-1,1],[ 1,-1,1],[ 1,-1,-1],[-1,-1,-1]];
var BOX_VERTEX_INDICES = [[1,2,3,0],[5,1,0,4],[6,2,1,5],[7,3,2,6],[4,0,3,7],[6,5,4,7]];
var INVERTED_VERTEX_INDICES = [[2,1,0,3],[4,0,1,5],[5,1,2,6],[6,2,3,7],[7,3,0,4],[4,5,6,7]];

class XQuadBox {

  constructor (opts) {
    this.gl = opts.gl;

    this.centerPoint = opts.centerPoint || [0, 0, 0];
    this.dimensions = opts.dimensions || [0, 0, 0];
    this.size = opts.size || 1;
    this.color = opts.color || [0.5, 0.5, 0.5, 1];
    this.isInverted = opts.isInverted || false;

    this.faces = opts.faces || [];
    this.skipFaces = opts.skipFaces || [];
    this.vertices = opts.vertices || [];

    this.quads = [];

    this.initialize(opts);
  }

  initialize (opts) {
    var cp = this.centerPoint;
    var halfWidth = (this.dimensions[0] || this.size) / 2;
    var halfHeight = (this.dimensions[1] || this.size) / 2;
    var halfDepth = (this.dimensions[2] || this.size) / 2;
    var defaultColor = this.color;
    var vertexIndices = this.isInverted ? INVERTED_VERTEX_INDICES : BOX_VERTEX_INDICES;
    var quadOpts = { ...opts };

    for (var f = 0; f < 6; f++) {
      if (this.skipFaces.indexOf(f) !== -1) continue;

      var face = this.faces[f];
      var indices = vertexIndices[f];
      var vertices = [];

      for (var v = 0; v < 4; v++) {
        var vertexIndex = indices[v];
        var vertexSigns = BOX_VERTEX_SIGNS[vertexIndex];
        var color = defaultColor;
        var position = [
          cp[0] + halfWidth * vertexSigns[0],
          cp[1] + halfHeight * vertexSigns[1],
          cp[2] + halfDepth * vertexSigns[2]
        ];

        if (this.vertices.length) {
          var vertexData = this.vertices[vertexIndex];
          color = vertexData.color || color;
          position = vertexData.position || position;
        } else if (face && face.length) {
          color = face[v].color || color;
          position = face[v].position || position;
        }

        vertices.push({
          position,
          color
        });
      }

      this.quads.push(new XQuad({ ...quadOpts, vertices }));
    }
  }

  updateVertices (vertices) {
    // TODO
  }

  updateFace (index, vertices) {
    // TODO
  }

}
