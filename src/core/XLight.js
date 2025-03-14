class XLight {

  constructor (opts) {
    this.gl = opts.gl;
    this.key = opts.key || UNI_KEY_DIR_LIGHT;
    this.baseColor = opts.color || [1, 1, 1, 1];
    this.brightness = opts.brightness !== undefined ? opts.brightness : 1;

    var index = opts.index;

    // color is a special case used by ambient and background sometimes
    var colorKey = `${this.key}Color`;
    if (index !== undefined) colorKey = `${this.key}Colors[${index}]`;

    this.position = new XUniform({ key: `${this.key}Positions[${index}]`, components: 3 });
    this.color = new XUniform({ key: colorKey, components: 3 });
    this.power = new XUniform({ key: `${this.key}Powers[${index}]`, components: 1 });

    if (this.key !== UNI_KEY_POINT_LIGHT) {
      this.direction = new XUniform({ key: `${this.key}Directions[${index}]`, components: 3 });

      if (ENABLE_SHADOWS) {
        this.index = new XUniform({ key: `${this.key}Index`, components: 1, type: UNI_TYPE_INT, data: index });
        this.viewProjMatrix = new XUniform({ key: `${this.key}ViewProjMatrices[${index}]`, type: UNI_TYPE_MATRIX });
        this.shadowMap = new XTexture({ gl: this.gl, key: `${this.key}ShadowMap[${index}]` });
      }
    }

    this.updateColor();
    this.setPosition(opts.position);
    this.setPower(opts.power);
    this.lookAt(opts.lookAtPoint);
  }

  getUniforms () {
    var uniforms = [this.position, this.color, this.power];
    if (this.key !== UNI_KEY_POINT_LIGHT) {
      uniforms.push(this.direction);

      if (ENABLE_SHADOWS) {
        uniforms.push(this.index);
        uniforms.push(this.viewProjMatrix);
      }
    }
    return uniforms;
  }

  getTextures () {
    var textures = [];
    if (ENABLE_SHADOWS && this.key !== UNI_KEY_POINT_LIGHT) {
      textures.push(this.shadowMap);
    }
    return textures;
  }

  lookAt (lookAtPoint) {
    if (!this.direction) return;

    lookAtPoint = lookAtPoint || [0, 0, 0];

    this.lookAtPoint = lookAtPoint.slice();

    var pos = this.getPosition();
    var dir = XUtils.normalize([
      this.lookAtPoint[0] - pos[0],
      this.lookAtPoint[1] - pos[1],
      this.lookAtPoint[2] - pos[2],
    ]);

    this.lookAtMatrix = XMatrix4.lookAt(pos, this.lookAtPoint, UP_VECTOR);
    this.setDirection(dir);
    this.calculateViewMatrix();
  }

  addShadowMapTexture (depthTexture, textureUnit) {
    this.shadowMap.reserveTextureUnit(textureUnit);
    this.shadowMap.setGLTexture(depthTexture);
    this.calculateViewMatrix();
  }

  calculateViewMatrix () {
    if (!ENABLE_SHADOWS) return;

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

  setPower (power) {
    this.power.data = power !== undefined ? power : 1.0;
  }

}
