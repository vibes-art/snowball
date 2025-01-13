var BOX_VERTEX_SIGNS = [[-1,1,1],[ 1,1,1],[ 1,1,-1],[-1,1,-1],[-1,-1,1],[ 1,-1,1],[ 1,-1,-1],[-1,-1,-1]];
var BOX_VERTEX_INDICES = [[0,1,2,3],[1,0,4,5],[2,1,5,6],[3,2,6,7],[0,3,7,4],[5,4,7,6]];

class XQuadBox {

  constructor (opts) {
    this.gl = opts.gl;

    this.centerPoint = opts.centerPoint || [0, 0, 0];
    this.dimensions = opts.dimensions || [0, 0, 0];
    this.size = opts.size || 1;
    this.color = opts.color || [0.5, 0.5, 0.5, 1];

    this.faces = opts.faces || [];
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
    var quadOpts = { ...opts };

    for (var f = 0; f < 6; f++) {
      var face = this.faces[f];
      var indices = BOX_VERTEX_INDICES[f];
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

  }

  updateFace (index, vertices) {

  }

}
