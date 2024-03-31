class BlankCanvas extends XCanvas {

  initScene () {
    super.initScene({ modelScaleX: -1 });
  }

  initCamera (opts) {
    this.camera = new XFlyingCamera({
      sensitivity: this.dragSensitivity,
      position: [-85, 160, -85],
      rotation: [-0.75 * PI, -0.25 * PI, 0],
      velocityMax: 0.2,
      accelTime: 2500
    });
  }

  initObjects () {
    var boxSize = 50;
    var gridSize = 3;
    var boxes = [];

    var modelMatrix = XMatrix4.get();
    modelMatrix = XMatrix4.rotateY(modelMatrix, PI / 2);

    var boxOpts = {
      gl: this.gl,
      scene: this.scene,
      shader: this.shader,
      size: boxSize,
      modelMatrix
    };

    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) {
        var cx = 1.33 * r * boxSize + boxSize * (-0.4 + 0.4 * XUtils.gaussianRandom());
        var cy = boxSize * (-0.2 + 0.4 * XUtils.gaussianRandom());
        var cz = 1.33 * c * boxSize + boxSize * (-0.4 + 0.4 * XUtils.gaussianRandom());
        var vertices = [];
        var colorChoice;

        for (var v = 0; v < 8; v++) {
          colorChoice = v % 4 === 0 ? XUtils.chooseByWeight(COLORS) : colorChoice;
          var color = [colorChoice.r / 255, colorChoice.g / 255, colorChoice.b / 255, 1];
          var vertexSigns = BOX_VERTEX_SIGNS[v];
          var position = [
            cx + XUtils.gaussianRandom() * (boxSize * 0.8) * vertexSigns[0],
            cy + XUtils.gaussianRandom() * (boxSize * 0.8) * vertexSigns[1],
            cz + XUtils.gaussianRandom() * (boxSize * 0.8) * vertexSigns[2]
          ];
          vertices.push({ position, color });
        }

        boxes.push(new XQuadBox({
          ...boxOpts,
          vertices,
          centerPoint: [cx, cy, cz]
        }));
      }
    }

    super.initObjects();
  }

  onKeyDown (evt) {
    var key = super.onKeyDown(evt);
    switch (key) {
      case '1': this.resetCamera(); break;
      case 'R': this.reset(false); break;
    }
  }

}
