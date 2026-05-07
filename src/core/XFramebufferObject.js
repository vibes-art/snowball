class XFramebufferObject {

  constructor (opts) {
    this.gl = opts.gl;
    this.key = opts.key;
    this.width = opts.width;
    this.height = opts.height;
    this.scale = opts.scale || 1;
    this.colorAttachmentCount = opts.colorAttachmentCount || 1;
    this.offscreenPass = opts.offscreenPass || false;

    this.framebuffer = null;
    this.renderbuffer = null;
    this.colorsTexture = null;
    this.colorsTextures = null;

    this.linkedAttributes = [];
    this.linkedTextures = [];

    this.init();
  }

  init () {
    var width = round(this.width * this.scale);
    var height = round(this.height * this.scale);
    var fbo = XGLUtils.createFramebuffer(this.gl, width, height, {
      colorAttachmentCount: this.colorAttachmentCount
    });

    this.framebuffer = fbo.framebuffer;
    this.renderbuffer = fbo.renderbuffer;
    this.colorsTexture = fbo.colorsTexture;
    this.colorsTextures = fbo.colorsTextures || [fbo.colorsTexture];
  }

  linkAttribute (obj, key, colorAttachmentIndex) {
    var link = { obj, key, colorAttachmentIndex: colorAttachmentIndex || 0 };
    this.linkedAttributes.push(link);
    this.updateLinkedAttribute(link);
  }

  updateLinkedAttribute (link) {
    var obj = link.obj;
    var key = link.key;
    var attrib = obj.attributes[key];
    var colorAttachmentIndex = link.colorAttachmentIndex || 0;
    var width = round(this.width * this.scale);
    var height = round(this.height * this.scale);

    attrib.textureWidth = width;
    attrib.textureHeight = height;

    var texture = new XTexture({ gl: this.gl, key: key + 'Texture' });
    texture.setGLTexture(this.colorsTextures[colorAttachmentIndex] || this.colorsTexture);
    obj.setTextureForAttribute(texture, key);
  }

  getLinkedTextureForUniform (key, colorAttachmentIndex) {
    var texture = new XTexture({ gl: this.gl, key });
    var link = {
      texture,
      colorAttachmentIndex: colorAttachmentIndex || 0
    };
    this.linkedTextures.push(link);
    this.updateLinkedTexture(link);
    return texture;
  }

  updateLinkedTexture (link) {
    var texture = link.texture || link;
    var colorAttachmentIndex = link.colorAttachmentIndex || 0;
    texture.setGLTexture(this.colorsTextures[colorAttachmentIndex] || this.colorsTexture);
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
    this.colorsTextures = null;

    this.linkedAttributes = [];
    this.linkedTextures = [];
  }

}
