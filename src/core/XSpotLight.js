var DEFAULT_INNER_ANGLE = 20 * PI / 180;
var DEFAULT_OUTER_ANGLE = 25 * PI / 180;
var SPOT_LIGHT_Z_NEAR = 10 * CAMERA_Z_NEAR;
var SPOT_LIGHT_Z_FAR = CAMERA_Z_FAR;

class XSpotLight extends XLight {

  constructor (opts) {
    opts.key = UNI_KEY_SPOT_LIGHT;

    super(opts);

    var index = opts.index;
    this.innerAngle = new XUniform({ key: `${this.key}InnerAngleCosines[${index}]`, components: 1 });
    this.outerAngle = new XUniform({ key: `${this.key}OuterAngleCosines[${index}]`, components: 1 });

    this.setInnerAngle(opts.innerAngle);
    this.setOuterAngle(opts.outerAngle);
    this.calculateViewMatrix();
  }

  getUniforms () {
    var uniforms = super.getUniforms();
    uniforms.push(this.innerAngle);
    uniforms.push(this.outerAngle);
    return uniforms;
  }

  calculateViewMatrix (edgeAccuracyMult) {
    if (!ENABLE_SHADOWS || !this.innerAngle) return;

    edgeAccuracyMult = edgeAccuracyMult || 5;
    var fov = edgeAccuracyMult * this.outerAngle.data;
    var projectionMatrix = XMatrix4.perspective(fov, 1, SPOT_LIGHT_Z_NEAR, SPOT_LIGHT_Z_FAR);
    this.viewProjMatrix.data = XMatrix4.multiply(projectionMatrix, this.lookAtMatrix);
  }

  setInnerAngle (angle) {
    angle = angle !== undefined ? angle : DEFAULT_INNER_ANGLE;
    this.innerAngle.data = cos(angle);
  }

  setOuterAngle (angle) {
    angle = angle !== undefined ? angle : DEFAULT_OUTER_ANGLE;
    this.outerAngle.data = cos(angle);
  }

}
