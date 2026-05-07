var TEXT_SHADOW_MODE_SDF_BINARY = 'sdfBinary';
var TEXT_SHADOW_MODE_SDF_AA = 'sdfAA';
var TEXT_SHADOW_ALPHA_CUTOFF_DEFAULT = 0.01;

class XTextShadow {

  constructor (opts) {
    opts = opts || {};

    this.enabled = false;
    this.mode = TEXT_SHADOW_MODE_SDF_BINARY;
    this.alphaCutoff = TEXT_SHADOW_ALPHA_CUTOFF_DEFAULT;

    this.apply(opts);
  }

  apply (opts) {
    opts = opts || {};

    if (opts.enabled !== undefined) {
      this.setEnabled(opts.enabled);
    }

    if (opts.mode !== undefined) {
      this.setMode(opts.mode);
    }

    if (opts.alphaCutoff !== undefined) {
      this.setAlphaCutoff(opts.alphaCutoff);
    }
  }

  setEnabled (enabled) {
    this.enabled = !!enabled;
  }

  setMode (mode) {
    if (mode !== TEXT_SHADOW_MODE_SDF_BINARY && mode !== TEXT_SHADOW_MODE_SDF_AA) {
      console.warn(`Invalid text shadow mode "${mode}", defaulting to ${TEXT_SHADOW_MODE_SDF_BINARY}`);
      mode = TEXT_SHADOW_MODE_SDF_BINARY;
    }

    this.mode = mode;
  }

  setAlphaCutoff (alphaCutoff) {
    this.alphaCutoff = max(0, min(1, alphaCutoff));
  }

}
