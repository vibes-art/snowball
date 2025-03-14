class XBloomEffect {

  constructor (opts) {
    this.width = opts.width;
    this.height = opts.height;
    this.scale = opts.scale || 1;

    this.uniforms = {};

    this.init(opts);
  }

  init (opts) {
    var scene = opts.scene;
    var threshold = opts.threshold || 1;
    var intensity = opts.intensity || 0.01;

    var bloomOpts = {};
    bloomOpts.width = this.width;
    bloomOpts.height = this.height;
    bloomOpts.scale = this.scale;

    var sourceFBO = scene.getSourceFramebuffer();
    var extractFBO = scene.addFramebuffer(RENDER_PASS_BLOOM_EXTRACT, bloomOpts);
    var blurHorzFBO = scene.addFramebuffer(RENDER_PASS_BLOOM_BLUR_HORZ, bloomOpts);
    var blurVertFBO = scene.addFramebuffer(RENDER_PASS_BLOOM_BLUR_VERT, bloomOpts);
    var combineFBO = scene.addFramebuffer(RENDER_PASS_COMBINE_BLOOM, { ...bloomOpts, scale: 1 });

    var bloomWidth = round(bloomOpts.width * bloomOpts.scale);
    var bloomHeight = round(bloomOpts.height * bloomOpts.scale);

    var extractUniforms = {};
    extractUniforms[UNI_KEY_THRESHOLD] = new XUniform({ key: UNI_KEY_THRESHOLD, data: threshold, components: 1 });

    var extractTextures = {};
    extractTextures[UNI_KEY_SOURCE_TEXTURE] = sourceFBO.getLinkedTextureForUniform(UNI_KEY_SOURCE_TEXTURE);

    scene.addRenderPass(RENDER_PASS_BLOOM_EXTRACT, {
      framebufferKey: RENDER_PASS_BLOOM_EXTRACT,
      shader: new XBloomExtractShader({ scene: scene }),
      uniforms: extractUniforms,
      textures: extractTextures,
      viewport: { scale: this.scale }
    });

    var blurHorzUniforms = {};
    blurHorzUniforms[UNI_KEY_TEXTURE_SIZE] = new XUniform({
      key: UNI_KEY_TEXTURE_SIZE,
      components: 1,
      data: bloomWidth
    });
    // save for update on resize
    this.uniforms.blurHorzUniforms = blurHorzUniforms;

    var blurHorzTextures = {};
    blurHorzTextures[UNI_KEY_SOURCE_TEXTURE] = extractFBO.getLinkedTextureForUniform(UNI_KEY_SOURCE_TEXTURE);

    scene.addRenderPass(RENDER_PASS_BLOOM_BLUR_HORZ, {
      framebufferKey: RENDER_PASS_BLOOM_BLUR_HORZ,
      shader: new XBloomBlurShader({ scene: scene, isHorizontal: true }),
      uniforms: blurHorzUniforms,
      textures: blurHorzTextures,
      viewport: { scale: this.scale }
    });

    var blurVertUniforms = {};
    blurVertUniforms[UNI_KEY_TEXTURE_SIZE] = new XUniform({
      key: UNI_KEY_TEXTURE_SIZE,
      components: 1,
      data: bloomHeight
    });
    // save for update on resize
    this.uniforms.blurVertUniforms = blurVertUniforms;

    var blurVertTextures = {};
    blurVertTextures[UNI_KEY_SOURCE_TEXTURE] = blurHorzFBO.getLinkedTextureForUniform(UNI_KEY_SOURCE_TEXTURE);

    scene.addRenderPass(RENDER_PASS_BLOOM_BLUR_VERT, {
      framebufferKey: RENDER_PASS_BLOOM_BLUR_VERT,
      shader: new XBloomBlurShader({ scene: scene, isHorizontal: false }),
      uniforms: blurVertUniforms,
      textures: blurVertTextures,
      viewport: { scale: this.scale }
    });

    var combineUniforms = {};
    combineUniforms[UNI_KEY_INTENSITY] = new XUniform({ key: UNI_KEY_INTENSITY, data: intensity, components: 1 });

    var combineTextures = {};
    combineTextures[UNI_KEY_COMBINE_TEXTURE] = blurVertFBO.getLinkedTextureForUniform(UNI_KEY_COMBINE_TEXTURE);
    combineTextures[UNI_KEY_SOURCE_TEXTURE] = sourceFBO.getLinkedTextureForUniform(UNI_KEY_SOURCE_TEXTURE);

    scene.addRenderPass(RENDER_PASS_COMBINE_BLOOM, {
      framebufferKey: RENDER_PASS_COMBINE_BLOOM,
      shader: new XCombineShader({ scene: scene }),
      uniforms: combineUniforms,
      textures: combineTextures
    });
  }

  onResize (width, height) {
    this.width = width;
    this.height = height;

    var bloomWidth = width * this.scale;
    var bloomHeight = height * this.scale;

    this.uniforms.blurHorzUniforms[UNI_KEY_TEXTURE_SIZE].data = bloomWidth;
    this.uniforms.blurVertUniforms[UNI_KEY_TEXTURE_SIZE].data = bloomHeight;
  }

  remove () {
    this.uniforms = {};
  }

}
