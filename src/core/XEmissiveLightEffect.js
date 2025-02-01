class XEmissiveLightEffect {

  constructor (opts) {
    this.width = opts.width;
    this.height = opts.height;
    this.scale = opts.scale || 1;

    this.uniforms = {};

    this.init(opts);
  }

  init (opts) {
    var scene = opts.scene;

    var uniTexOpts = {};
    uniTexOpts.type = UNI_TYPE_INT;
    uniTexOpts.components = 1;

    var fboOpts = {
      width: this.width,
      height: this.height
    };

    var sourceFBO = scene.getSourceFramebuffer();
    this.emissiveFBO = scene.addFramebuffer(RENDER_PASS_EMISSIVE, { ...fboOpts });
    this.combineFBO = scene.addFramebuffer(RENDER_PASS_COMBINE_EMISSIVE, { ...fboOpts });

    scene.addRenderPass(RENDER_PASS_EMISSIVE, {
      framebufferKey: RENDER_PASS_EMISSIVE,
      shader: new XEmissiveShader({ scene })
    });

    var combineUniforms = {};
    combineUniforms[UNI_KEY_SOURCE_TEXTURE] = new XUniform({ key: UNI_KEY_SOURCE_TEXTURE, ...uniTexOpts });
    combineUniforms[UNI_KEY_COMBINE_TEXTURE] = new XUniform({ key: UNI_KEY_COMBINE_TEXTURE, ...uniTexOpts });
    combineUniforms[UNI_KEY_INTENSITY] = new XUniform({ key: UNI_KEY_INTENSITY, data: 1, components: 1 });
    this.emissiveFBO.linkUniform(combineUniforms[UNI_KEY_COMBINE_TEXTURE]);

    sourceFBO.linkUniform(combineUniforms[UNI_KEY_SOURCE_TEXTURE]);

    scene.addRenderPass(RENDER_PASS_COMBINE_EMISSIVE, {
      framebufferKey: RENDER_PASS_COMBINE_EMISSIVE,
      shader: new XCombineShader({ scene: scene }),
      uniforms: combineUniforms
    });
  }

  onResize (width, height) {
    this.width = width;
    this.height = height;
  }

  remove () {
    this.uniforms = {};
  }

}
