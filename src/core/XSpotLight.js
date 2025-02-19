var DEFAULT_INNER_ANGLE = 20 * PI / 180;
var DEFAULT_OUTER_ANGLE = 25 * PI / 180;
var SPOT_LIGHT_Z_NEAR = 10 * CAMERA_Z_NEAR;
var SPOT_LIGHT_Z_FAR = CAMERA_Z_FAR;

class XSpotLight extends XLight {

  constructor (opts) {
    opts.key = UNI_KEY_SPOT_LIGHT;

    super(opts);

    var index = opts.index;

    this.innerAngle = new XUniform({
      key: `${this.key}InnerAngleCosines[${index}]`,
      components: 1,
      data: cos(opts.innerAngle || DEFAULT_INNER_ANGLE)
    });

    this.outerAngle = new XUniform({
      key: `${this.key}OuterAngleCosines[${index}]`,
      components: 1,
      data: cos(opts.outerAngle || DEFAULT_OUTER_ANGLE)
    });
  }

  getUniforms () {
    var uniforms = super.getUniforms();
    uniforms.push(this.innerAngle);
    uniforms.push(this.outerAngle);
    return uniforms;
  }

  calculateViewMatrix (edgeAccuracyMult) {
    edgeAccuracyMult = edgeAccuracyMult || 5;
    var fov = edgeAccuracyMult * this.outerAngle.data;
    var projectionMatrix = XMatrix4.perspective(fov, 1, SPOT_LIGHT_Z_NEAR, SPOT_LIGHT_Z_FAR);
    this.viewProjMatrix.data = XMatrix4.multiply(projectionMatrix, this.lookAtMatrix);
  }

}
