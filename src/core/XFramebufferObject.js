class XFramebufferObject {

  constructor (opts) {
    this.gl = opts.gl;
    this.key = opts.key;
    this.width = opts.width;
    this.height = opts.height;
    this.scale = opts.scale || 1;

    this.framebuffer = null;
    this.renderbuffer = null;
    this.colorsTexture = null;

    this.linkedAttributes = [];
    this.linkedUniforms = [];

    this.init();
  }

  init () {
    var width = round(this.width * this.scale);
    var height = round(this.height * this.scale);
    var fbo = XGLUtils.createFramebuffer(this.gl, width, height);

    this.framebuffer = fbo.framebuffer;
    this.renderbuffer = fbo.renderbuffer;
    this.colorsTexture = fbo.colorsTexture;
  }

  linkAttribute (obj, key) {
    var link = { obj, key };
    this.linkedAttributes.push(link);
    this.updateLinkedAttribute(link);
  }

  updateLinkedAttribute (link) {
    var obj = link.obj;
    var key = link.key;
    var attrib = obj.attributes[key];
    var width = round(this.width * this.scale);
    var height = round(this.height * this.scale);

    attrib.textureWidth = width;
    attrib.textureHeight = height;
    obj.setTextureForAttribute(this.colorsTexture, key);
  }

  linkUniform (uniform) {
    this.linkedUniforms.push(uniform);
    this.updateLinkedUniform(uniform);
  }

  updateLinkedUniform (uniform) {
    uniform.setTexture(this.colorsTexture);
  }

  onResize (width, height) {
    this.width = width;
    this.height = height;

    // preserve links since resize isn't a full removal
    var linkedAttribs = this.linkedAttributes;
    var linkedUniforms = this.linkedUniforms;

    this.remove();

    this.linkedAttributes = linkedAttribs;
    this.linkedUniforms = linkedUniforms;

    this.init();

    linkedAttribs.forEach(link => this.updateLinkedAttribute(link));
    linkedUniforms.forEach(uniform => this.updateLinkedUniform(uniform));
  }

  remove () {
    if (!this.framebuffer) return;

    XGLUtils.deleteFramebuffer(this.gl, this);

    this.framebuffer = null;
    this.renderbuffer = null;
    this.colorsTexture = null;

    this.linkedAttributes = [];
    this.linkedUniforms = [];
  }

}
