class XLight {

  constructor (opts) {
    this.key = opts.key;
    this.baseColor = opts.color;
    this.brightness = opts.brightness !== undefined ? opts.brightness : 1;

    var colorKey = `${this.key}Color`;
    var directionKey = `${this.key}Direction`;
    var positionKey = `${this.key}Position`;

    var index = opts.index;
    if (index !== undefined) {
      colorKey = `${this.key}Colors[${index}]`;
      directionKey = `${this.key}Directions[${index}]`;
      positionKey = `${this.key}Positions[${index}]`;

      if (this.key === UNI_KEY_DIRECTIONAL_LIGHT) {
        var indexKey = `${this.key}Index`;
        var matrixKey = `${this.key}ViewProjMatrices[${index}]`;
        var shadowMapKey = `${this.key}ShadowMap${index}`;

        this.index = new XUniform({ key: indexKey, components: 1, type: UNI_TYPE_INT, data: index });
        this.viewProjMatrix = new XUniform({ key: matrixKey, type: UNI_TYPE_MATRIX });
        this.shadowMap = new XUniform({ key: shadowMapKey, components: 1, type: UNI_TYPE_INT });
      }
    }

    this.color = new XUniform({ key: colorKey, components: 3 });
    this.direction = new XUniform({ key: directionKey, components: 3 });
    this.position = new XUniform({ key: positionKey, components: 3 });

    this.updateColor();
    this.setDirection(opts.direction);
    this.setPosition(opts.position);
  }

  addShadowMapTexture (depthTexture, textureUnit) {
    this.shadowMap.data = textureUnit;
    this.shadowMap.texture = depthTexture;

    var boundingBox = CAMERA_Z_FAR;
    var orthoMatrix = XMatrix4.ortho(
      -boundingBox, boundingBox,
      -boundingBox, boundingBox,
      -boundingBox, boundingBox);

    var dir = this.direction.data;
    var center = [0, 0, 0];
    var distance = 0.001 * boundingBox;

    var pos = [
      center[0] - dir[0] * distance,
      center[1] - dir[1] * distance,
      center[2] - dir[2] * distance
    ];

    var up = [0, 1, 0];
    var viewMatrix = XMatrix4.lookAt(pos, center, up);
    this.viewProjMatrix.data = XMatrix4.multiply(orthoMatrix, viewMatrix);
  }

  getUniforms () {
    var uniforms = [this.color, this.direction, this.position];
    if (this.key === UNI_KEY_DIRECTIONAL_LIGHT) {
      uniforms = uniforms.concat([this.index, this.viewProjMatrix, this.shadowMap]);
    }
    return uniforms;
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

}
