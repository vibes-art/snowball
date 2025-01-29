class XBloomEffect {

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
    var threshold = opts.threshold || 1;
    var intensity = opts.intensity || 0.01;

    var uniTexOpts = {};
    uniTexOpts.type = UNI_TYPE_INT;
    uniTexOpts.components = 1;

    var bloomOpts = {};
    bloomOpts.width = this.width;
    bloomOpts.height = this.height;
    bloomOpts.scale = this.scale;

    var extractFBO = scene.addFramebuffer(RENDER_PASS_BLOOM_EXTRACT, bloomOpts);
    var blurHorzFBO = scene.addFramebuffer(RENDER_PASS_BLOOM_BLUR_HORZ, bloomOpts);
    var blurVertFBO = scene.addFramebuffer(RENDER_PASS_BLOOM_BLUR_VERT, bloomOpts);
    var combineFBO = scene.addFramebuffer(RENDER_PASS_BLOOM_COMBINE, { ...bloomOpts, scale: 1 });

    var bloomWidth = bloomOpts.width * bloomOpts.scale;
    var bloomHeight = bloomOpts.height * bloomOpts.scale;

    var extractUniforms = {};
    extractUniforms[UNI_KEY_SOURCE_TEXTURE] = new XUniform({ key: UNI_KEY_SOURCE_TEXTURE, ...uniTexOpts });
    extractUniforms[UNI_KEY_THRESHOLD] = new XUniform({ key: UNI_KEY_THRESHOLD, data: threshold, components: 1 });

    this.queuedFBOUniformLinks.push({
      fboKey: RENDER_PASS_MAIN,
      uniform: extractUniforms[UNI_KEY_SOURCE_TEXTURE]
    });

    scene.addRenderPass(RENDER_PASS_BLOOM_EXTRACT, {
      framebufferKey: RENDER_PASS_BLOOM_EXTRACT,
      shader: new XBloomExtractShader({ scene: scene }),
      uniforms: extractUniforms,
      viewport: { width: bloomWidth, height: bloomHeight }
    });

    // TODO: separate all this into a Bloom class and update uniforms on resize
    var blurHorzUniforms = {};
    blurHorzUniforms[UNI_KEY_SOURCE_TEXTURE] = new XUniform({ key: UNI_KEY_SOURCE_TEXTURE, ...uniTexOpts });
    extractFBO.linkUniform(blurHorzUniforms[UNI_KEY_SOURCE_TEXTURE]);

    blurHorzUniforms[UNI_KEY_TEXTURE_SIZE] = new XUniform({
      key: UNI_KEY_TEXTURE_SIZE,
      components: 1,
      data: bloomWidth
    });

    scene.addRenderPass(RENDER_PASS_BLOOM_BLUR_HORZ, {
      framebufferKey: RENDER_PASS_BLOOM_BLUR_HORZ,
      shader: new XBloomBlurShader({ scene: scene, isHorizontal: true }),
      uniforms: blurHorzUniforms,
      viewport: { width: bloomWidth, height: bloomHeight }
    });

    var blurVertUniforms = {};
    blurVertUniforms[UNI_KEY_SOURCE_TEXTURE] = new XUniform({ key: UNI_KEY_SOURCE_TEXTURE, ...uniTexOpts });
    blurHorzFBO.linkUniform(blurVertUniforms[UNI_KEY_SOURCE_TEXTURE]);

    blurVertUniforms[UNI_KEY_TEXTURE_SIZE] = new XUniform({
      key: UNI_KEY_TEXTURE_SIZE,
      components: 1,
      data: bloomHeight
    });

    scene.addRenderPass(RENDER_PASS_BLOOM_BLUR_VERT, {
      framebufferKey: RENDER_PASS_BLOOM_BLUR_VERT,
      shader: new XBloomBlurShader({ scene: scene, isHorizontal: false }),
      uniforms: blurVertUniforms,
      viewport: { width: bloomWidth, height: bloomHeight }
    });

    var combineUniforms = {};
    combineUniforms[UNI_KEY_SCENE_TEXTURE] = new XUniform({ key: UNI_KEY_SCENE_TEXTURE, ...uniTexOpts });
    combineUniforms[UNI_KEY_BLOOM_TEXTURE] = new XUniform({ key: UNI_KEY_BLOOM_TEXTURE, ...uniTexOpts });
    combineUniforms[UNI_KEY_INTENSITY] = new XUniform({ key: UNI_KEY_INTENSITY, data: intensity, components: 1 });
    blurVertFBO.linkUniform(combineUniforms[UNI_KEY_BLOOM_TEXTURE]);

    this.queuedFBOUniformLinks.push({
      fboKey: RENDER_PASS_MAIN,
      uniform: combineUniforms[UNI_KEY_SCENE_TEXTURE]
    });

    scene.addRenderPass(RENDER_PASS_BLOOM_COMBINE, {
      framebufferKey: RENDER_PASS_BLOOM_COMBINE,
      shader: new XBloomCombineShader({ scene: scene }),
      uniforms: combineUniforms,
      viewport: { width: this.width, height: this.height }
    });
  }

  onResize (width, height) {

  }

  remove () {

  }

}
