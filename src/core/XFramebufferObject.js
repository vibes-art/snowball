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
    this.linkedTextures = [];

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

    var texture = new XTexture({ gl: this.gl, key: key + 'Texture' });
    texture.setGLTexture(this.colorsTexture);
    obj.setTextureForAttribute(texture, key);
  }

  getLinkedTextureForUniform (key) {
    var texture = new XTexture({ gl: this.gl, key });
    this.linkedTextures.push(texture);
    this.updateLinkedTexture(texture);
    return texture;
  }

  updateLinkedTexture (texture) {
    texture.setGLTexture(this.colorsTexture);
  }

  onResize (width, height) {
    this.width = width;
    this.height = height;

    // preserve links since resize isn't a full removal
    var linkedAttribs = this.linkedAttributes;
    var linkedTextures = this.linkedTextures;

    this.remove();

    this.linkedAttributes = linkedAttribs;
    this.linkedTextures = linkedTextures;

    this.init();

    linkedAttribs.forEach(link => this.updateLinkedAttribute(link));
    linkedTextures.forEach(texture => this.updateLinkedTexture(texture));
  }

  remove () {
    if (!this.framebuffer) return;

    XGLUtils.deleteFramebuffer(this.gl, this);

    this.framebuffer = null;
    this.renderbuffer = null;
    this.colorsTexture = null;

    this.linkedAttributes = [];
    this.linkedTextures = [];
  }

}
