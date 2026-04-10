var XLanczosResize = {};

(function () {
  var CHANNELS = 4;
  var LOBES = 3;

  function clamp (value, minValue, maxValue) {
    return value < minValue ? minValue : (value > maxValue ? maxValue : value);
  }

  function sinc (value) {
    if (value === 0) return 1;

    var scaled = Math.PI * value;
    return Math.sin(scaled) / scaled;
  }

  function lanczos (value, lobes) {
    value = Math.abs(value);
    if (value >= lobes) return 0;
    return sinc(value) * sinc(value / lobes);
  }

  function buildContributors (sourceSize, destSize, lobes) {
    var contributors = new Array(destSize);
    var scale = destSize / sourceSize;
    var filterScale = scale < 1 ? scale : 1;
    var radius = lobes / filterScale;

    for (var destIndex = 0; destIndex < destSize; destIndex++) {
      var center = ((destIndex + 0.5) / scale) - 0.5;
      var start = Math.ceil(center - radius);
      var end = Math.floor(center + radius);
      var sourceIndices = [];
      var weights = [];
      var totalWeight = 0;

      for (var sourceIndex = start; sourceIndex <= end; sourceIndex++) {
        var clampedIndex = clamp(sourceIndex, 0, sourceSize - 1);
        var weight = lanczos((center - sourceIndex) * filterScale, lobes);
        if (!weight) continue;

        var lastIndex = sourceIndices.length - 1;
        if (lastIndex >= 0 && sourceIndices[lastIndex] === clampedIndex) {
          weights[lastIndex] += weight;
        } else {
          sourceIndices.push(clampedIndex);
          weights.push(weight);
        }
        totalWeight += weight;
      }

      if (!sourceIndices.length) {
        sourceIndices.push(clamp(Math.round(center), 0, sourceSize - 1));
        weights.push(1);
        totalWeight = 1;
      }

      var inverseWeight = 1 / totalWeight;
      for (var i = 0; i < weights.length; i++) {
        weights[i] *= inverseWeight;
      }

      contributors[destIndex] = {
        indices: Int32Array.from(sourceIndices),
        weights: Float32Array.from(weights),
        minIndex: sourceIndices[0],
        maxIndex: sourceIndices[sourceIndices.length - 1]
      };
    }

    return contributors;
  }

  function buildNeighborhoods (sourceSize, destSize) {
    var neighborhoods = new Array(destSize);
    var scale = destSize / sourceSize;

    for (var destIndex = 0; destIndex < destSize; destIndex++) {
      var center = ((destIndex + 0.5) / scale) - 0.5;
      neighborhoods[destIndex] = {
        low: clamp(Math.floor(center), 0, sourceSize - 1),
        high: clamp(Math.ceil(center), 0, sourceSize - 1)
      };
    }

    return neighborhoods;
  }

  function clampRound (value, maxValue) {
    return clamp(Math.round(value), 0, maxValue);
  }

  function getCenteredCropRect (sourceWidth, sourceHeight, targetWidth, targetHeight) {
    var cropX = 0;
    var cropY = 0;
    var cropWidth = sourceWidth;
    var cropHeight = sourceHeight;
    var compare = sourceWidth * targetHeight - sourceHeight * targetWidth;

    if (compare > 0) {
      cropWidth = Math.max(1, Math.floor(sourceHeight * targetWidth / targetHeight));
      var excessWidth = sourceWidth - cropWidth;
      cropX = Math.floor(excessWidth / 2);
    } else if (compare < 0) {
      cropHeight = Math.max(1, Math.floor(sourceWidth * targetHeight / targetWidth));
      var excessHeight = sourceHeight - cropHeight;
      cropY = Math.floor(excessHeight / 2);
    }

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    };
  }

  function cropRGBAData (sourceData, sourceWidth, sourceHeight, cropRect) {
    var cropX = cropRect.x || 0;
    var cropY = cropRect.y || 0;
    var cropWidth = cropRect.width || sourceWidth;
    var cropHeight = cropRect.height || sourceHeight;
    if (cropX === 0 && cropY === 0 && cropWidth === sourceWidth && cropHeight === sourceHeight) {
      return {
        data: new sourceData.constructor(sourceData),
        width: sourceWidth,
        height: sourceHeight
      };
    }

    var output = new sourceData.constructor(cropWidth * cropHeight * CHANNELS);
    for (var y = 0; y < cropHeight; y++) {
      var sourceOffset = ((cropY + y) * sourceWidth + cropX) * CHANNELS;
      var destOffset = y * cropWidth * CHANNELS;
      output.set(sourceData.subarray(sourceOffset, sourceOffset + cropWidth * CHANNELS), destOffset);
    }

    return {
      data: output,
      width: cropWidth,
      height: cropHeight
    };
  }

  function resizeRow (sourceData, sourceWidth, sourceY, xContributors, destWidth) {
    var row = new Float32Array(destWidth * CHANNELS);
    var sourceRowOffset = sourceY * sourceWidth * CHANNELS;

    for (var destX = 0; destX < destWidth; destX++) {
      var outputOffset = destX * CHANNELS;
      var contributor = xContributors[destX];
      var indices = contributor.indices;
      var weights = contributor.weights;
      var accum0 = 0;
      var accum1 = 0;
      var accum2 = 0;
      var accum3 = 0;

      for (var i = 0; i < indices.length; i++) {
        var sourceOffset = sourceRowOffset + indices[i] * CHANNELS;
        var weight = weights[i];
        accum0 += sourceData[sourceOffset + 0] * weight;
        accum1 += sourceData[sourceOffset + 1] * weight;
        accum2 += sourceData[sourceOffset + 2] * weight;
        accum3 += sourceData[sourceOffset + 3] * weight;
      }

      row[outputOffset + 0] = accum0;
      row[outputOffset + 1] = accum1;
      row[outputOffset + 2] = accum2;
      row[outputOffset + 3] = accum3;
    }

    return row;
  }

  function resizeRGBAData (sourceData, sourceWidth, sourceHeight, destWidth, destHeight, outputCtor, maxValue) {
    if (sourceWidth === destWidth && sourceHeight === destHeight) {
      return new outputCtor(sourceData);
    }

    var xContributors = buildContributors(sourceWidth, destWidth, LOBES);
    var yContributors = buildContributors(sourceHeight, destHeight, LOBES);
    var xNeighborhoods = buildNeighborhoods(sourceWidth, destWidth);
    var yNeighborhoods = buildNeighborhoods(sourceHeight, destHeight);
    var output = new outputCtor(destWidth * destHeight * CHANNELS);
    var rowCache = {};

    for (var destY = 0; destY < destHeight; destY++) {
      var yContributor = yContributors[destY];
      var yIndices = yContributor.indices;
      var yWeights = yContributor.weights;
      var yNeighborhood = yNeighborhoods[destY];

      for (var rowIndex = 0; rowIndex < yIndices.length; rowIndex++) {
        var sourceY = yIndices[rowIndex];
        if (!rowCache[sourceY]) {
          rowCache[sourceY] = resizeRow(sourceData, sourceWidth, sourceY, xContributors, destWidth);
        }
      }

      var destRowOffset = destY * destWidth * CHANNELS;
      for (var destX = 0; destX < destWidth; destX++) {
        var outputOffset = destRowOffset + destX * CHANNELS;
        var accum0 = 0;
        var accum1 = 0;
        var accum2 = 0;
        var accum3 = 0;
        var rowOffset = destX * CHANNELS;
        var xNeighborhood = xNeighborhoods[destX];

        for (var i = 0; i < yIndices.length; i++) {
          var sourceRow = rowCache[yIndices[i]];
          var weight = yWeights[i];
          accum0 += sourceRow[rowOffset + 0] * weight;
          accum1 += sourceRow[rowOffset + 1] * weight;
          accum2 += sourceRow[rowOffset + 2] * weight;
          accum3 += sourceRow[rowOffset + 3] * weight;
        }

        var localMin0 = Infinity;
        var localMin1 = Infinity;
        var localMin2 = Infinity;
        var localMax0 = -Infinity;
        var localMax1 = -Infinity;
        var localMax2 = -Infinity;

        for (var sourceY = yNeighborhood.low; sourceY <= yNeighborhood.high; sourceY++) {
          var sourceBase0 = (sourceY * sourceWidth + xNeighborhood.low) * CHANNELS;
          var sample00 = sourceData[sourceBase0 + 0];
          var sample01 = sourceData[sourceBase0 + 1];
          var sample02 = sourceData[sourceBase0 + 2];
          if (sample00 < localMin0) localMin0 = sample00;
          if (sample01 < localMin1) localMin1 = sample01;
          if (sample02 < localMin2) localMin2 = sample02;
          if (sample00 > localMax0) localMax0 = sample00;
          if (sample01 > localMax1) localMax1 = sample01;
          if (sample02 > localMax2) localMax2 = sample02;

          if (xNeighborhood.high !== xNeighborhood.low) {
            var sourceBase1 = (sourceY * sourceWidth + xNeighborhood.high) * CHANNELS;
            var sample10 = sourceData[sourceBase1 + 0];
            var sample11 = sourceData[sourceBase1 + 1];
            var sample12 = sourceData[sourceBase1 + 2];
            if (sample10 < localMin0) localMin0 = sample10;
            if (sample11 < localMin1) localMin1 = sample11;
            if (sample12 < localMin2) localMin2 = sample12;
            if (sample10 > localMax0) localMax0 = sample10;
            if (sample11 > localMax1) localMax1 = sample11;
            if (sample12 > localMax2) localMax2 = sample12;
          }
        }

        // Clamp to the immediate source neighborhood to suppress Lanczos ringing on sharp edges.
        accum0 = clamp(accum0, localMin0, localMax0);
        accum1 = clamp(accum1, localMin1, localMax1);
        accum2 = clamp(accum2, localMin2, localMax2);

        output[outputOffset + 0] = clampRound(accum0, maxValue);
        output[outputOffset + 1] = clampRound(accum1, maxValue);
        output[outputOffset + 2] = clampRound(accum2, maxValue);
        output[outputOffset + 3] = clampRound(accum3, maxValue);
      }

      for (var cachedY in rowCache) {
        if (+cachedY < yContributor.minIndex) {
          delete rowCache[cachedY];
        }
      }
    }

    return output;
  }

  XLanczosResize.resizeRGBA16 = function (sourceData, sourceWidth, sourceHeight, destWidth, destHeight) {
    return resizeRGBAData(sourceData, sourceWidth, sourceHeight, destWidth, destHeight, Uint16Array, 65535);
  };

  XLanczosResize.getCenteredCropRect = function (sourceWidth, sourceHeight, targetWidth, targetHeight) {
    return getCenteredCropRect(sourceWidth, sourceHeight, targetWidth, targetHeight);
  };

  XLanczosResize.cropRGBA16 = function (sourceData, sourceWidth, sourceHeight, cropRect) {
    return cropRGBAData(sourceData, sourceWidth, sourceHeight, cropRect);
  };

  XLanczosResize.addRGBA16Margins = function (sourceData, sourceWidth, sourceHeight, margins) {
    margins = margins || {};
    var top = margins.top || 0;
    var left = margins.left || 0;
    var bottom = margins.bottom || 0;
    var right = margins.right || 0;
    if (!(top || left || bottom || right)) {
      return {
        data: sourceData,
        width: sourceWidth,
        height: sourceHeight
      };
    }

    var destWidth = sourceWidth + left + right;
    var destHeight = sourceHeight + top + bottom;
    var output = new Uint16Array(destWidth * destHeight * CHANNELS);

    for (var sourceY = 0; sourceY < sourceHeight; sourceY++) {
      var sourceOffset = sourceY * sourceWidth * CHANNELS;
      var destOffset = ((sourceY + top) * destWidth + left) * CHANNELS;
      output.set(sourceData.subarray(sourceOffset, sourceOffset + sourceWidth * CHANNELS), destOffset);
    }

    return {
      data: output,
      width: destWidth,
      height: destHeight
    };
  };

  XLanczosResize.resizeCanvas = function (sourceCanvas, destWidth, destHeight) {
    if (sourceCanvas.width === destWidth && sourceCanvas.height === destHeight) {
      return sourceCanvas;
    }

    var sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    var sourceImage = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    var resizedData = resizeRGBAData(
      sourceImage.data,
      sourceCanvas.width,
      sourceCanvas.height,
      destWidth,
      destHeight,
      Uint8ClampedArray,
      255
    );

    var outputCanvas = document.createElement('canvas');
    outputCanvas.width = destWidth;
    outputCanvas.height = destHeight;

    var outputCtx = outputCanvas.getContext('2d');
    var outputImage = outputCtx.createImageData(destWidth, destHeight);
    outputImage.data.set(resizedData);
    outputCtx.putImageData(outputImage, 0, 0);

    return outputCanvas;
  };

  XLanczosResize.cropCanvas = function (sourceCanvas, cropRect) {
    var cropX = cropRect.x || 0;
    var cropY = cropRect.y || 0;
    var cropWidth = cropRect.width || sourceCanvas.width;
    var cropHeight = cropRect.height || sourceCanvas.height;
    if (cropX === 0 && cropY === 0 && cropWidth === sourceCanvas.width && cropHeight === sourceCanvas.height) {
      return sourceCanvas;
    }

    var outputCanvas = document.createElement('canvas');
    outputCanvas.width = cropWidth;
    outputCanvas.height = cropHeight;

    var outputCtx = outputCanvas.getContext('2d');
    outputCtx.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return outputCanvas;
  };

  XLanczosResize.addCanvasMargins = function (sourceCanvas, margins) {
    margins = margins || {};
    var top = margins.top || 0;
    var left = margins.left || 0;
    var bottom = margins.bottom || 0;
    var right = margins.right || 0;
    if (!(top || left || bottom || right)) return sourceCanvas;

    var outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceCanvas.width + left + right;
    outputCanvas.height = sourceCanvas.height + top + bottom;

    var outputCtx = outputCanvas.getContext('2d');
    outputCtx.drawImage(sourceCanvas, left, top);

    return outputCanvas;
  };
})();
