var DEFAULT_INNER_ANGLE = 20 * PI / 180;
var DEFAULT_OUTER_ANGLE = 25 * PI / 180;
var SPOT_LIGHT_Z_NEAR = 0.1;
var SPOT_LIGHT_Z_FAR = CAMERA_Z_FAR;

class XSpotLight extends XLight {

  constructor (opts) {
    opts.key = UNI_KEY_DIRECTIONAL_LIGHT;
    opts.type = LIGHT_SPOT;

    super(opts);

    var innerKey = `${this.key}InnerAngle`;
    var outerKey = `${this.key}OuterAngle`;

    var index = opts.index;
    if (index !== undefined) {
      innerKey = `${this.key}InnerAngles[${index}]`;
      outerKey = `${this.key}OuterAngles[${index}]`;
    }

    this.innerAngle = new XUniform({
      key: innerKey,
      components: 1,
      data: opts.innerAngle || DEFAULT_INNER_ANGLE
    });

    this.outerAngle = new XUniform({
      key: outerKey,
      components: 1,
      data: opts.outerAngle || DEFAULT_OUTER_ANGLE
    });
  }

  getUniforms () {
    return super.getUniforms().concat([this.innerAngle, this.outerAngle]);
  }

  calculateViewMatrix () {
    var projectionMatrix = XMatrix4.perspective(this.outerAngle.data, 1, SPOT_LIGHT_Z_NEAR, SPOT_LIGHT_Z_FAR);
    this.viewProjMatrix.data = XMatrix4.multiply(projectionMatrix, this.lookAtMatrix);
  }

}
