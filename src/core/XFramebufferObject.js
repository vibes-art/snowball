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

  onResize (width, height) {
    this.width = width;
    this.height = height;

    // preserve linked attributes since resize isn't a full removal
    var links = this.linkedAttributes;
    this.remove();
    this.linkedAttributes = links;

    this.init();

    links.forEach(link => this.updateLinkedAttribute(link));
  }

  remove () {
    if (!this.framebuffer) return;

    XGLUtils.deleteFramebuffer(this.gl, this);
    this.framebuffer = null;
    this.renderbuffer = null;
    this.colorsTexture = null;

    this.linkedAttributes = [];
  }

}
