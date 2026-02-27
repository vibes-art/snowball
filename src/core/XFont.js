var ASCII_SPACE = 32;
var MTSDF_DEFAULT_BOUNDS = { left: 0, bottom: 0, right: 0, top: 0 };

class XFont {

  constructor (opts) {
    var gl = opts.gl;
    var data = opts.data;
    var atlasPath = opts.atlasPath;

    this.isLoaded = false;
    this.onLoadCallbacks = [];

    var atlasInfo = data.atlas || {};
    var metrics = data.metrics || {};
    this.atlasWidth = atlasInfo.width || 1;
    this.atlasHeight = atlasInfo.height || 1;
    this.lineHeight = metrics.lineHeight || 1.2; // em units
    this.emSize = metrics.emSize || 1;

    var glyphs = {};
    data.glyphs.forEach(g => glyphs[g.unicode] = g);
    this.glyphs = glyphs;

    this.sourceTexture = new XTexture({
      gl,
      key: UNI_KEY_SOURCE_TEXTURE,
      url: atlasPath,
      onLoad: () => this.markLoaded()
    });

    if (!atlasPath) {
      this.markLoaded();
    }
  }

  getGlyphsForText (text) {
    text = text || "";

    var glyphs = [];
    var currentX = 0;

    for (var i = 0; i < text.length; i++) {
      var g = this.getGlyphByIndex(text, i);
      if (!g) continue;

      var advanceX = g.advance || 0;
      glyphs.push({
        offsetX: currentX,
        advanceX: advanceX,
        planeBounds: g.planeBounds || MTSDF_DEFAULT_BOUNDS,
        atlasBounds: g.atlasBounds || MTSDF_DEFAULT_BOUNDS
      });
      currentX += advanceX;
    }

    return glyphs;
  }

  getGlyphByIndex (text, index) {
    var c = text.charCodeAt(index);
    return this.glyphs[c] || this.glyphs[ASCII_SPACE];
  }

  onLoaded (onLoad) {
    if (!onLoad) return;

    if (this.isLoaded) {
      return onLoad(this);
    }

    this.onLoadCallbacks.push(onLoad);
  }

  markLoaded () {
    if (this.isLoaded) return;

    this.isLoaded = true;

    var callbacks = this.onLoadCallbacks;
    this.onLoadCallbacks = [];
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i] && callbacks[i](this);
    }
  }

}
