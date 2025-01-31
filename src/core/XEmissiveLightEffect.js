class XEmissiveLightEffect {

  constructor (opts) {
    this.width = opts.width;
    this.height = opts.height;
    this.scale = opts.scale || 1;

    this.uniforms = {};
    this.queuedFBOUniformLinks = [];

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

    this.emissiveFBO = scene.addFramebuffer(RENDER_PASS_EMISSIVE, { ...fboOpts });
    this.combineFBO = scene.addFramebuffer(RENDER_PASS_COMBINE, { ...fboOpts });

    scene.addRenderPass(RENDER_PASS_EMISSIVE, {
      framebufferKey: RENDER_PASS_EMISSIVE,
      shader: new XEmissiveShader({ scene })
    });

    var combineUniforms = {};
    combineUniforms[UNI_KEY_SCENE_TEXTURE] = new XUniform({ key: UNI_KEY_SCENE_TEXTURE, ...uniTexOpts });
    combineUniforms[UNI_KEY_COMBINE_TEXTURE] = new XUniform({ key: UNI_KEY_COMBINE_TEXTURE, ...uniTexOpts });
    combineUniforms[UNI_KEY_INTENSITY] = new XUniform({ key: UNI_KEY_INTENSITY, data: 1, components: 1 });
    this.emissiveFBO.linkUniform(combineUniforms[UNI_KEY_COMBINE_TEXTURE]);

    this.queuedFBOUniformLinks.push({
      fboKey: RENDER_PASS_MAIN,
      uniform: combineUniforms[UNI_KEY_SCENE_TEXTURE]
    });

    scene.addRenderPass(RENDER_PASS_COMBINE, {
      framebufferKey: RENDER_PASS_COMBINE,
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
