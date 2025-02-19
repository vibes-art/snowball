class XPointLight extends XLight {

  constructor (opts) {
    opts.key = UNI_KEY_POINT_LIGHT;

    super(opts);

    var index = opts.index;

    this.radius = new XUniform({ key: `${this.key}Radii[${index}]`, components: 1 });

    this.setRadius(opts.radius);
  }

  getUniforms () {
    var uniforms = super.getUniforms();
    uniforms.push(this.radius);
    return uniforms;
  }

  setRadius (radius) {
    this.radius.data = radius || 0.0;
  }

}
