class XUIEffect {

  constructor (opts) {
    this.scene = opts.scene;
    this.width = opts.width;
    this.height = opts.height;

    this.uniforms = {};

    this.init(opts);
  }

  init (opts) {
    this.uniforms[UNI_KEY_PROJ_MATRIX] = new XUniform({
      key: UNI_KEY_PROJ_MATRIX,
      type: UNI_TYPE_MATRIX,
      data: this.getOrthoMatrix()
    });

    this.uniforms[UNI_KEY_VIEW_MATRIX] = new XUniform({
      key: UNI_KEY_VIEW_MATRIX,
      type: UNI_TYPE_MATRIX,
      data: XMatrix4.get()
    });

    // this.uniforms[UNI_KEY_FOG_COLOR] = new XUniform({
    //   key: UNI_KEY_FOG_COLOR,
    //   components: 3,
    //   data: [1, 1, 1]
    // });

    this.scene.addRenderPass(RENDER_PASS_UI, {
      framebufferKey: RENDER_PASS_MAIN,
      isBeforeMain: false,
      uniforms: this.uniforms
    });
  }

  onResize (width, height) {
    this.width = width;
    this.height = height;

    this.uniforms[UNI_KEY_PROJ_MATRIX].data = this.getOrthoMatrix();
  }

  getOrthoMatrix () {
    return XMatrix4.ortho(0, this.width, 0, this.height, -1, 1);
  }

  remove () {
    this.uniforms = {};
  }

}
