var ASCII_SPACE = 32;
var MTSDF_DEFAULT_BOUNDS = { left: 0, bottom: 0, right: 0, top: 0 };
var KERNING_PAIR_DELIMITER = ':';

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

    var tracking = opts.defaultTracking !== undefined ? opts.defaultTracking : data.defaultTracking;
    this.defaultTracking = this.normalizeTrackingValue(tracking) || 0;

    var glyphs = {};
    data.glyphs.forEach(g => glyphs[g.unicode] = g);
    this.glyphs = glyphs;
    this.kerning = this.parseKerning(data.kerning || data.kernings || null);

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

  getGlyphsForText (text, opts) {
    text = text || "";
    opts = opts || {};

    var glyphs = [];
    var currentX = 0;
    var previousCode = null;
    var useKerning = opts.useKerning !== undefined ? opts.useKerning : true;
    var tracking = opts.tracking !== undefined ? opts.tracking : this.defaultTracking;
    this.normalizeTrackingValue(tracking) || 0;

    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      var g = this.getGlyphByCode(code);
      if (!g) continue;

      if (previousCode !== null) {
        if (useKerning) {
          currentX += this.getKerningAdvance(previousCode, code);
        }
        currentX += tracking;
      }

      var advanceX = g.advance || 0;
      glyphs.push({
        offsetX: currentX,
        advanceX: advanceX,
        planeBounds: g.planeBounds || MTSDF_DEFAULT_BOUNDS,
        atlasBounds: g.atlasBounds || MTSDF_DEFAULT_BOUNDS
      });
      currentX += advanceX;
      previousCode = code;
    }

    return glyphs;
  }

  getGlyphByIndex (text, index) {
    var c = text.charCodeAt(index);
    return this.getGlyphByCode(c);
  }

  getGlyphByCode (code) {
    return this.glyphs[code] || this.glyphs[ASCII_SPACE];
  }

  parseKerning (entries) {
    var kerning = {};

    if (!entries) {
      return kerning;
    }

    if (Array.isArray(entries)) {
      for (var i = 0; i < entries.length; i++) {
        this.addKerningEntry(kerning, entries[i]);
      }
      return kerning;
    }

    if (typeof entries === 'object') {
      for (var key in entries) {
        if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;

        var value = entries[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          var firstCode = this.normalizeKerningCode(key);
          if (firstCode === null) continue;

          for (var nestedKey in value) {
            if (!Object.prototype.hasOwnProperty.call(value, nestedKey)) continue;
            var secondCode = this.normalizeKerningCode(nestedKey);
            var advance = this.normalizeKerningValue(value[nestedKey]);
            if (secondCode === null || advance === null) continue;
            this.setKerningAdvance(kerning, firstCode, secondCode, advance);
          }
          continue;
        }

        this.addKerningEntry(kerning, {
          pair: key,
          advance: value
        });
      }
    }

    return kerning;
  }

  addKerningEntry (kerning, entry) {
    if (!entry) return;

    var first = null;
    var second = null;
    var advance = null;

    if (Array.isArray(entry)) {
      first = this.normalizeKerningCode(entry[0]);
      second = this.normalizeKerningCode(entry[1]);
      advance = this.normalizeKerningValue(entry[2]);
    } else if (typeof entry === 'object') {
      first = this.normalizeKerningCode(
        entry.unicode1 !== undefined ? entry.unicode1
          : entry.first !== undefined ? entry.first
            : entry.left !== undefined ? entry.left
              : entry.u1 !== undefined ? entry.u1
                : entry.index1 !== undefined ? entry.index1
                  : null
      );
      second = this.normalizeKerningCode(
        entry.unicode2 !== undefined ? entry.unicode2
          : entry.second !== undefined ? entry.second
            : entry.right !== undefined ? entry.right
              : entry.u2 !== undefined ? entry.u2
                : entry.index2 !== undefined ? entry.index2
                  : null
      );
      advance = this.normalizeKerningValue(
        entry.advance !== undefined ? entry.advance
          : entry.adjustment !== undefined ? entry.adjustment
            : entry.amount !== undefined ? entry.amount
              : entry.value !== undefined ? entry.value
                : entry.xAdvance !== undefined ? entry.xAdvance
                  : null
      );

      if ((first === null || second === null) && entry.pair !== undefined) {
        var parsedPair = this.parseKerningPair(entry.pair);
        if (parsedPair) {
          first = parsedPair[0];
          second = parsedPair[1];
        }
      }
    }

    if (first === null || second === null || advance === null) return;
    this.setKerningAdvance(kerning, first, second, advance);
  }

  parseKerningPair (pair) {
    if (typeof pair !== 'string') return null;

    var normalized = pair.trim();
    var separators = [',', KERNING_PAIR_DELIMITER, '|', '/'];
    for (var i = 0; i < separators.length; i++) {
      var separator = separators[i];
      var parts = normalized.split(separator);
      if (parts.length !== 2) continue;

      var first = this.normalizeKerningCode(parts[0]);
      var second = this.normalizeKerningCode(parts[1]);
      if (first === null || second === null) {
        return null;
      }
      return [first, second];
    }

    return null;
  }

  normalizeKerningCode (value) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'number') {
      return isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed) return null;

      if (/^-?\d+$/.test(trimmed)) {
        var parsed = parseInt(trimmed, 10);
        return isFinite(parsed) ? parsed : null;
      }

      if (trimmed.length === 1) {
        return trimmed.charCodeAt(0);
      }
    }

    return null;
  }

  normalizeKerningValue (value) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'number') {
      return isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      var parsed = parseFloat(value);
      return isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  normalizeTrackingValue (value) {
    return this.normalizeKerningValue(value);
  }

  setKerningAdvance (kerning, firstCode, secondCode, advance) {
    kerning[this.getKerningKey(firstCode, secondCode)] = advance;
  }

  setDefaultTracking (tracking) {
    tracking = this.normalizeTrackingValue(tracking);
    this.defaultTracking = tracking === null ? 0 : tracking;
    return this.defaultTracking;
  }

  getKerningAdvance (firstCode, secondCode) {
    var key = this.getKerningKey(firstCode, secondCode);
    return this.kerning[key] !== undefined ? this.kerning[key] : 0;
  }

  getKerningKey (firstCode, secondCode) {
    return `${firstCode}${KERNING_PAIR_DELIMITER}${secondCode}`;
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
