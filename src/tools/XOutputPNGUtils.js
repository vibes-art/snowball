var XOutputPNGUtils = {};

(function () {
  function shouldUseAlpha () {
    return typeof USE_ALPHA === 'undefined' ? true : !!USE_ALPHA;
  }

  function composite8BitToOpaqueRGBA (rgba) {
    var output = new Uint8Array(rgba.length);

    for (var i = 0; i < rgba.length; i += 4) {
      var alpha = rgba[i + 3];
      if (alpha === 255) {
        output[i + 0] = rgba[i + 0];
        output[i + 1] = rgba[i + 1];
        output[i + 2] = rgba[i + 2];
        output[i + 3] = 255;
        continue;
      }

      var alphaNorm = alpha / 255;
      var inverseAlpha = 1 - alphaNorm;
      // Flatten transparency against white so print margins stay paper-colored.
      output[i + 0] = Math.round(rgba[i + 0] * alphaNorm + 255 * inverseAlpha);
      output[i + 1] = Math.round(rgba[i + 1] * alphaNorm + 255 * inverseAlpha);
      output[i + 2] = Math.round(rgba[i + 2] * alphaNorm + 255 * inverseAlpha);
      output[i + 3] = 255;
    }

    return output;
  }

  function composite16BitToOpaqueRGB (rgba16) {
    var pixelCount = rgba16.length / 4;
    var output = new Uint16Array(pixelCount * 3);

    for (var srcIndex = 0, destIndex = 0; srcIndex < rgba16.length; srcIndex += 4, destIndex += 3) {
      var alpha = rgba16[srcIndex + 3];
      if (alpha === 65535) {
        output[destIndex + 0] = rgba16[srcIndex + 0];
        output[destIndex + 1] = rgba16[srcIndex + 1];
        output[destIndex + 2] = rgba16[srcIndex + 2];
        continue;
      }

      var alphaNorm = alpha / 65535;
      var inverseAlpha = 1 - alphaNorm;
      // Flatten transparency against white so print margins stay paper-colored.
      output[destIndex + 0] = Math.round(rgba16[srcIndex + 0] * alphaNorm + 65535 * inverseAlpha);
      output[destIndex + 1] = Math.round(rgba16[srcIndex + 1] * alphaNorm + 65535 * inverseAlpha);
      output[destIndex + 2] = Math.round(rgba16[srcIndex + 2] * alphaNorm + 65535 * inverseAlpha);
    }

    return output;
  }

  function swap16ToBigEndian (little16) {
    var byteCount = little16.length * 2;
    var srcBytes = new Uint8Array(little16.buffer);
    var dstBytes = new Uint8Array(byteCount);

    for (var i = 0; i < little16.length; i++) {
      var littleLow = srcBytes[2 * i + 0];
      var littleHigh = srcBytes[2 * i + 1];
      dstBytes[2 * i + 0] = littleHigh;
      dstBytes[2 * i + 1] = littleLow;
    }

    return dstBytes.buffer;
  }

  XOutputPNGUtils.createCanvasBlob = function (canvas, useAlpha) {
    var ctx = canvas.getContext(CANVAS_2D, { willReadFrequently: true });
    var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var rgba = new Uint8Array(image.data);

    if (!useAlpha) {
      rgba = composite8BitToOpaqueRGBA(rgba);
    }

    var pngAB = UPNG.encode([rgba.buffer], canvas.width, canvas.height, 0);
    return new Blob([pngAB], { type: 'image/png' });
  };

  XOutputPNGUtils.createRGBA16Blob = function (output, useAlpha) {
    var alphaChannels = useAlpha ? 1 : 0;
    var colorChannels = 3;
    var data16 = useAlpha ? output.data : composite16BitToOpaqueRGB(output.data);
    var bigEndianAB = swap16ToBigEndian(data16);
    var pngAB = UPNG.encodeLL([bigEndianAB], output.width, output.height, colorChannels, alphaChannels, 16);
    return new Blob([pngAB], { type: 'image/png' });
  };

  if (typeof XCanvas === 'undefined') return;

  var originalSaveOutput = XCanvas.prototype.saveOutput;

  XCanvas.prototype.saveOutput = function (opts) {
    if (shouldUseAlpha()) {
      return originalSaveOutput.call(this, opts);
    }

    opts = opts || {};
    var srcX = opts.srcX || 0;
    var srcY = opts.srcY || 0;
    var srcWidth = opts.srcWidth || this.width;
    var srcHeight = opts.srcHeight || this.height;
    var destWidth = opts.destWidth || this.width;
    var destHeight = opts.destHeight || this.height;
    var name = opts.name || 'output';
    var callback = opts.callback || null;
    var skipDownload = opts.skipDownload || false;

    if (this.gl) {
      this.gl.flush();
      this.gl.finish();
    }

    var renderCanvas = document.createElement('canvas');
    var renderCtx = renderCanvas.getContext(CANVAS_2D);
    renderCanvas.width = destWidth;
    renderCanvas.height = destHeight;
    renderCtx.drawImage(this.canvas,
      srcX, srcY, srcWidth, srcHeight,
      0, 0, destWidth, destHeight);

    XUtils.processImage(renderCanvas, destWidth, destHeight, (outputCanvas) => {
      try {
        outputCanvas = this.transformOutputCanvas(outputCanvas, opts) || outputCanvas;
      } catch (err) {
        console.error('Error transforming output canvas, using base output instead.', err);
      }

      var blob = XOutputPNGUtils.createCanvasBlob(outputCanvas, false);
      callback && callback(blob);
      !skipDownload && XUtils.downloadBlob(blob, `${name}.png`);

      if (IS_HEADLESS) {
        var parent = this.canvas && this.canvas.parentNode;
        if (!parent) return;

        outputCanvas.style.cssText = this.canvas.style.cssText;
        parent.replaceChild(outputCanvas, this.canvas);
      }
    });
  };

  XCanvas.prototype.saveOutput16 = function (opts) {
    opts = opts || {};
    var useAlpha = shouldUseAlpha();
    var name = opts.name || 'output';
    var callback = opts.callback || null;
    var skipDownload = opts.skipDownload || false;
    var srcWidth = opts.srcWidth || this.width;
    var srcHeight = opts.srcHeight || this.height;
    var destWidth = opts.destWidth || this.width;
    var destHeight = opts.destHeight || this.height;
    var scale = Math.round(srcWidth / destWidth);
    if (srcWidth !== scale * destWidth) {
      console.error('16-bit outputs require integer scale between source and destination.');
    }

    var texture = XGLUtils.createHalfFloatTexture(this.gl, srcWidth, srcHeight);
    var fbo = XGLUtils.createFramebufferWithTexture(this.gl, texture);
    var passes = this.scene.renderPasses;
    var antialiasPass = passes[passes.length - 1];
    antialiasPass.framebuffer = fbo;
    antialiasPass.viewport = { width: srcWidth, height: srcHeight };
    this.flushScene();
    delete antialiasPass.framebuffer;
    delete antialiasPass.viewport;

    var floatBuffer = XGLUtils.readHalfFloatPixels(this.gl, srcWidth, srcHeight, fbo);
    var totalPixels = destWidth * destHeight * 4;
    var raw16 = new Uint16Array(totalPixels);

    for (var dstY = 0; dstY < destHeight; dstY++) {
      for (var dstX = 0; dstX < destWidth; dstX++) {
        var accumR = 0;
        var accumG = 0;
        var accumB = 0;
        var accumA = 0;

        for (var sy = 0; sy < scale; sy++) {
          var srcRow = (destHeight - 1 - dstY) * scale + (scale - 1 - sy);
          for (var sx = 0; sx < scale; sx++) {
            var srcCol = dstX * scale + sx;
            var idx = (srcRow * srcWidth + srcCol) * 4;
            var sR = floatBuffer[idx + 0];
            var sG = floatBuffer[idx + 1];
            var sB = floatBuffer[idx + 2];
            var sA = floatBuffer[idx + 3];
            if (sA < 0) sA = 0; else if (sA > 1) sA = 1;
            if (sR < 0) sR = 0; else if (sR > 1) sR = 1;
            if (sG < 0) sG = 0; else if (sG > 1) sG = 1;
            if (sB < 0) sB = 0; else if (sB > 1) sB = 1;

            accumR += sR;
            accumG += sG;
            accumB += sB;
            accumA += sA;
          }
        }

        var invSamples = 1 / (scale * scale);
        accumR *= invSamples;
        accumG *= invSamples;
        accumB *= invSamples;
        accumA *= invSamples;

        var finalR = 0;
        var finalG = 0;
        var finalB = 0;
        var finalA = accumA;

        if (accumA > 0) {
          finalR = accumR / accumA;
          finalG = accumG / accumA;
          finalB = accumB / accumA;
        }

        finalR = (finalR < 0 ? 0 : (finalR > 1 ? 1 : finalR));
        finalG = (finalG < 0 ? 0 : (finalG > 1 ? 1 : finalG));
        finalB = (finalB < 0 ? 0 : (finalB > 1 ? 1 : finalB));
        finalA = (finalA < 0 ? 0 : (finalA > 1 ? 1 : finalA));

        var dstBase = (dstY * destWidth + dstX) * 4;
        raw16[dstBase + 0] = Math.round(finalR * 65535);
        raw16[dstBase + 1] = Math.round(finalG * 65535);
        raw16[dstBase + 2] = Math.round(finalB * 65535);
        raw16[dstBase + 3] = Math.round(finalA * 65535);
      }
    }

    var output = { data: raw16, width: destWidth, height: destHeight };
    try {
      output = this.transformOutput16(output, opts) || output;
    } catch (err) {
      console.error('Error transforming 16-bit output, using base output instead.', err);
    }

    var blob = XOutputPNGUtils.createRGBA16Blob(output, useAlpha);
    callback && callback(blob);
    !skipDownload && XUtils.downloadBlob(blob, `${name}.png`);
  };
})();
