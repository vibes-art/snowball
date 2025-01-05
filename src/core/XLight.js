class XLight {

  constructor (opts) {
    this.key = opts.key;
    this.index = 0;
    this.baseColor = opts.color;
    this.brightness = opts.brightness !== undefined ? opts.brightness : 1;

    var colorKey = `${this.key}Color`;
    var directionKey = `${this.key}Direction`;
    var positionKey = `${this.key}Position`

    if (opts.index !== undefined) {
      this.index = opts.index;
      colorKey = `${this.key}Colors[${this.index}]`;
      directionKey = `${this.key}Directions[${this.index}]`;
      positionKey = `${this.key}Positions[${this.index}]`;
    }

    this.color = new XUniform({ key: colorKey, components: 3 });
    this.direction = new XUniform({ key: directionKey, components: 3 });
    this.position = new XUniform({ key: positionKey, components: 3 });

    this.updateColor();
    this.setDirection(opts.direction);
    this.setPosition(opts.position);
  }

  getUniforms () {
    return [this.color, this.direction, this.position];
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
