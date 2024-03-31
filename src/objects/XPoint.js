class XPoint extends XObject {

  constructor (opts) {
    opts.type = opts.gl.POINTS;
    opts.vertexCount = 1;
    super(opts);
  }

  initialize (opts) {
    this.brightness = 1;
    super.initialize(opts);
  }

  defineAttributes (opts) {
    super.defineAttributes(opts);
    this.addAttribute(ATTR_KEY_COLORS, { components: 4 });
  }

  generate (opts) {
    super.generate(opts);
    this.setPosition(0, [0, 0, 0]);
    this.setColor([1, 1, 1, 1]);
  }

  getColor () {
    var color = this.getAttribute(ATTR_KEY_COLORS, 0);
    var b = this.getBrightness() || 1;
    color[0] /= b;
    color[1] /= b;
    color[2] /= b;
    return color;
  }

  setColor (color) {
    var b = this.getBrightness() || 0;
    color[0] *= b;
    color[1] *= b;
    color[2] *= b;
    this.setAttribute(ATTR_KEY_COLORS, 0, color);
  }

  getBrightness () {
    return this.brightness;
  }

  setBrightness (value) {
    this.brightness = value;
    this.setColor(this.getColor());
  }

}
