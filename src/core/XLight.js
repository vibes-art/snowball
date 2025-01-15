class XLight {

  constructor (opts) {
    this.key = opts.key;
    this.type = opts.type || LIGHT_DIRECTIONAL;
    this.baseColor = opts.color;
    this.brightness = opts.brightness !== undefined ? opts.brightness : 1;

    var colorKey = `${this.key}Color`;
    var directionKey = `${this.key}Direction`;
    var positionKey = `${this.key}Position`;
    var fixedAxesKey = `${this.key}FixedAxes`;

    var index = opts.index;
    if (index !== undefined) {
      colorKey = `${this.key}Colors[${index}]`;
      directionKey = `${this.key}Directions[${index}]`;
      positionKey = `${this.key}Positions[${index}]`;
      fixedAxesKey = `${this.key}FixedAxes[${index}]`

      if (this.key === UNI_KEY_DIRECTIONAL_LIGHT) {
        var indexKey = `${this.key}Index`;
        var matrixKey = `${this.key}ViewProjMatrices[${index}]`;
        var shadowMapKey = `${this.key}ShadowMap${index}`;

        this.index = new XUniform({ key: indexKey, components: 1, type: UNI_TYPE_INT, data: index });
        this.viewProjMatrix = new XUniform({ key: matrixKey, type: UNI_TYPE_MATRIX });
        this.shadowMap = new XUniform({ key: shadowMapKey, components: 1, type: UNI_TYPE_INT });
      }
    }

    this.position = new XUniform({ key: positionKey, components: 3 });
    this.color = new XUniform({ key: colorKey, components: 3 });
    this.direction = new XUniform({ key: directionKey, components: 3 });
    this.fixedAxes = new XUniform({ key: fixedAxesKey, components: 3 });

    this.updateColor();
    this.setPosition(opts.position);
    this.setFixedAxes(opts.fixedAxes);
    this.lookAt(opts.lookAtPoint);
  }

  getUniforms () {
    var uniforms = [this.position, this.color, this.direction, this.fixedAxes];
    if (this.key === UNI_KEY_DIRECTIONAL_LIGHT) {
      uniforms = uniforms.concat([this.index, this.viewProjMatrix, this.shadowMap]);
    }
    return uniforms;
  }

  lookAt (lookAtPoint) {
    if (!lookAtPoint) return;

    this.lookAtPoint = lookAtPoint.slice();

    var pos = this.getPosition();
    var dir = XUtils.normalize([
      this.lookAtPoint[0] - pos[0],
      this.lookAtPoint[1] - pos[1],
      this.lookAtPoint[2] - pos[2],
    ]);

    this.lookAtMatrix = XMatrix4.lookAt(pos, this.lookAtPoint, UP_VECTOR);
    this.setDirection(dir);
  }

  addShadowMapTexture (depthTexture, textureUnit) {
    this.shadowMap.data = textureUnit;
    this.shadowMap.texture = depthTexture;
    this.calculateViewMatrix();
  }

  calculateViewMatrix () {
    var boundingBox = CAMERA_Z_FAR / 2;
    var corners = [
      [-boundingBox, -boundingBox, -boundingBox],
      [-boundingBox, -boundingBox,  boundingBox],
      [-boundingBox,  boundingBox, -boundingBox],
      [-boundingBox,  boundingBox,  boundingBox],
      [ boundingBox, -boundingBox, -boundingBox],
      [ boundingBox, -boundingBox,  boundingBox],
      [ boundingBox,  boundingBox, -boundingBox],
      [ boundingBox,  boundingBox,  boundingBox]
    ];

    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;
    for (var i = 0; i < corners.length; i++) {
      var cLight = XMatrix4.transformPoint(this.lookAtMatrix, corners[i]);
      if (cLight[0] < minX) minX = cLight[0];
      if (cLight[0] > maxX) maxX = cLight[0];
      if (cLight[1] < minY) minY = cLight[1];
      if (cLight[1] > maxY) maxY = cLight[1];
      if (cLight[2] < minZ) minZ = cLight[2];
      if (cLight[2] > maxZ) maxZ = cLight[2];
    }

    var orthoMatrix = XMatrix4.ortho(minX, maxX, minY, maxY, -maxZ, -minZ);
    this.viewProjMatrix.data = XMatrix4.multiply(orthoMatrix, this.lookAtMatrix);
  }

  getDirection () {
    return this.direction.data;
  }

  setDirection (direction) {
    this.direction.data = direction || [0, -1, 0];
  }

  getPosition () {
    return this.position.data;
  }

  setPosition (position) {
    this.position.data = position || [0, 0, 0];
  }

  getBrightness () {
    return this.brightness;
  }

  setBrightness (value) {
    this.brightness = value;
    this.updateColor();
  }

  setColorValue (value) {
    this.setBaseColor([value, value, value]);
  }

  getBaseColor () {
    return this.baseColor;
  }

  setBaseColor (color) {
    this.baseColor = color || [1, 1, 1];
    this.updateColor();
  }

  getColor () {
    var b = this.getBrightness();
    var c = this.getBaseColor();
    return [b * c[0], b * c[1], b * c[2]];
  }

  setColor (color) {
    this.setBaseColor(color);
  }

  updateColor () {
    this.color.data = this.getColor();
  }

  setFixedAxes (fixedAxes) {
    this.fixedAxes.data = fixedAxes || [0, 0, 0];
  }

}
