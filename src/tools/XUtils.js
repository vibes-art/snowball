var UTIL_LOGS = false;

var XUtils = {};

XUtils.isPowerOf2 = function (value) {
  return (value & (value - 1)) === 0;
};

XUtils.summation = function (n) {
  if (n === 0 || n === 1) return n;
  return n + XUtils.summation(n - 1);
};

XUtils.factorial = function (n) {
  if (n === 0 || n === 1) return 1;
  return n * XUtils.factorial(n - 1);
};

XUtils.distance = function (a, b) {
  var dx = b.x - a.x;
  var dz = b.z - a.z;
  return sqrt(dx * dx + dz * dz);
};

XUtils.distance3D = function (a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  var dz = b.z - a.z;
  return sqrt(dx * dx + dy * dy + dz * dz);
};

XUtils.dotProduct = function (a, b) {
  return a.x * b.x + a.z * b.z;
};

XUtils.normalize = function (a) {
  var sum = 0;
  for (var i = 0; i < a.length; i++) {
    sum += pow(a[i], 2);
  }

  var length = sqrt(sum) || 1;
  for (var i = 0; i < a.length; i++) {
    a[i] /= length;
  }

  return a;
};

XUtils.choose = function (a) {
  return a[floor(a.length * random())];
};

XUtils.shuffleArray = function (a) {
  var length = a.length;
  var copy = a.slice();
  while (length) {
    var index = floor(random() * length--);
    var temp = copy[length];
    copy[length] = copy[index];
    copy[index] = temp;
  }
  return copy;
};

XUtils.chooseByWeight = function (data) {
  var choice = null;
  var weightTotal = 0;
  var length = data.length;
  for (var i = 0; i < length; i++) {
    var item = data[i];
    weightTotal += item.weight || 0;
  }
  var roll = random();
  var weightSum = 0;
  for (var i = 0; i < length; i++) {
    var item = data[i];
    weightSum += item.weight;
    choice = item;
    var chance = weightSum / weightTotal;
    if (roll <= chance) break;
  }
  return choice;
};

XUtils.chooseByID = function (data, id) {
  var choice = null;
  var length = data.length;
  for (var i = 0; i < length; i++) {
    var item = data[i];
    choice = item;
    if (item.id === id) break;
  }
  return choice;
};

XUtils.gaussianRandom = function (scale) {
  scale = scale || 10;

  var u = 0;
  var v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();

  var num = 0.5 + (sqrt(-2 * log(u)) * cos(2 * PI * v)) / scale;
  if (num > 1 || num < 0) return XUtils.gaussianRandom(scale);
  return num;
};

XUtils.getRandomHash = function (length) {
  var hash = '0x';
  for (var i = 0; i < length; i++) {
    hash += floor(Math.random() * 16).toString(16);
  }
  return hash;
};

XUtils.enableXorshift128PRNG = function (seed) {
  var s, t;
  var S = Uint32Array.from([0,1,s=t=2,3].map(function (i) {
    return parseInt(seed.substr(i*8+2,8),16);
  }));

  random = function () {
    return t=S[3],S[3]=S[2],S[2]=S[1],S[1]=s=S[0],
    t^=t<<11,S[0]^=(t^t>>>8)^(s>>>19),S[0]/2**32;
  };'tx piter';
};

XUtils.enableArtBlocksPRNG = function () {
  var abr = new ABRandom();
  random = () => abr.random_dec();
};

XUtils.floatToHex = function (normalized) {
  var value = floor(normalized * 256);
  var firstChar = floor(value / 16).toString(16);
  var secondChar = floor(value % 16).toString(16);
  return firstChar + secondChar;
};

XUtils.recurseValues = function (values, start, end, amplitude, exponent) {
  var delta = end - start;
  var half = floor(start + delta / 2);
  if (start < half) this.recurseValues(values, start, half, amplitude, exponent);
  if (half < end - 1) this.recurseValues(values, half, end, amplitude, exponent);

  var offset = amplitude * delta * (-1 + 2 * random());
  for (var i = start; i < end; i++) {
    var pct = 0;
    if (i <= half && half > start) {
      pct = (i - start) / (half - start);
    } else {
      pct = (end - i) / (end - half);
    }
    values[i] += offset * pow(pct, exponent);
  }
};

XUtils.getPackedCircles = function (shape, count, opts) {
  opts = opts || {};
  var isCircle = !shape.width;
  var dx = shape.width;
  var dz = shape.depth;
  var x0 = shape.x - dx / 2;
  var z0 = shape.z - dz / 2;
  var minR = opts.minR || 1;
  var maxR = opts.maxR || 100;
  var stepR = opts.stepR || 1;
  var insideOnly = opts.insideOnly || false;
  var tries = opts.tries || 10000;
  var circles = [];
  var r = maxR;
  var countInit = count;

  while (count > 0 && r >= minR) {
    var foundCircle = false;
    for (var i = 0; i < tries; i++) {
      var isValid = true;
      var testCircle = null;
      var roll1 = random();
      var roll2 = random();
      if (isCircle) {
        var reach = (insideOnly ? shape.radius - r : shape.radius) * roll1;
        var theta = TAU * roll2;
        testCircle = new XCircle({
          x: shape.x + reach * cos(theta),
          z: shape.z + reach * sin(theta),
          radius: r
        });
      } else {
        var x = x0 + dx * roll1;
        var z = z0 + dz * roll2;
        if (insideOnly) {
          x = x0 + r + (dx - 2 * r) * roll1;
          z = z0 + r + (dz - 2 * r) * roll2;
          if (x - r < x0 || z - r < z0 || x + r > x0 + dx || z + r > z0 + dz) continue;
        }
        if (x < x0 || z < z0 || x > x0 + dx || z > z0 + dz) continue;
        testCircle = new XCircle({ x, z, radius: r });
      }

      for (var c = 0; c < circles.length; c++) {
        if (circles[c].collidesWith(testCircle)) {
          isValid = false;
          break;
        }
      }

      if (isValid) {
        foundCircle = true;
        circles.push(testCircle);
        count--;
        break;
      }
    }

    if (!foundCircle) r -= stepR;
  }

  UTIL_LOGS && console.log(`circle pack: ${countInit}, fit: ${circles.length}`);
  return circles;
};

XUtils.getPackedSquares = function (shape, count, opts) {
  opts = opts || {};
  var minSize = opts.minSize || 1;
  var maxSize = opts.maxSize || 100;
  var stepSize = opts.stepSize || 1;
  var theta = opts.theta || 0;
  var insideOnly = opts.insideOnly || false;
  var tries = opts.tries || 10000;
  var squares = [];
  var size = maxSize;
  var packX = shape.x;
  var packZ = shape.z;
  var packWidth = shape.width;
  var packDepth = shape.depth;
  var halfPackWidth = packWidth / 2;
  var halfPackDepth = packDepth / 2;
  var countInit = count;

  while (count > 0 && size >= minSize) {
    var foundSquare = false;
    var halfSize = size / 2;
    for (var i = 0; i < tries; i++) {
      var isValid = true;
      var xc = 0;
      var zc = 0;
      if (insideOnly) {
        xc = packX - halfPackWidth + halfSize + (packWidth - size) * random();
        zc = packZ - halfPackDepth + halfSize + (packDepth - size) * random();
      } else {
        xc = packX - halfPackWidth + packWidth * random();
        zc = packZ - halfPackDepth + packDepth * random();
      }

      var testSquare = new XRect({ x: xc, z: zc, width: size, depth: size, theta });
      for (var q = 0; q < squares.length; q++) {
        if (squares[q].collidesWith(testSquare)) {
          isValid = false;
          break;
        }
      }

      if (isValid) {
        foundSquare = true;
        squares.push(testSquare);
        count--;
        break;
      }
    }

    if (!foundSquare) size -= stepSize;
  }

  UTIL_LOGS && console.log(`square pack: ${countInit}, fit: ${squares.length}`);
  return squares;
};

XUtils.getGoldenCircle = function (radius, dx, dz, forceOpts) {
  forceOpts = forceOpts || {};
  var isCentered = forceOpts.isCentered;
  var horzRoll = forceOpts.horzRoll;
  var vertRoll = forceOpts.vertRoll;

  var x = dx / 2;
  var z = dz / 2;

  if (!isCentered) {
    horzRoll = horzRoll !== undefined ? horzRoll : floor(3 * random());
    vertRoll = vertRoll !== undefined ? vertRoll : floor(3 * random());

    // if we're forcing isCentered false, try again when we roll centered
    if (isCentered === false && horzRoll === 1 && vertRoll === 1) {
      return XUtils.getGoldenCircle(radius, dx, dz, forceOpts);
    }

    if (horzRoll === 1 && vertRoll === 1) {
      isCentered = true;
    } else {
      var goldWidth = dx * GLD_RECT;
      var goldDepth = dz * GLD_RECT;

      switch (horzRoll) {
        case 0: x = dx - goldWidth; break;
        case 2: x = goldWidth; break;
      }

      switch (vertRoll) {
        case 0: z = dz - goldDepth; break;
        case 2: z = goldDepth; break;
      }

      radius = goldWidth / 2;
    }
  }

  var circle = new XCircle({ x, z, radius });
  circle.isCentered = isCentered;
  return circle;
};

XUtils.recurseQuilt = function (x0, z0, dx, dz, depth, opts) {
  if (dx <= 0 || dz <= 0) return;

  opts = opts || {};
  var onComplete = opts.onComplete;
  if (depth > (opts.maxDepth || 5)) {
    if (opts.forceComplete && onComplete) {
      onComplete(x0, z0, dx, dz, depth, opts);
    }
    return;
  };

  var centerPoint = opts.centerPoint || { x: dx / 2, z: dz / 2, isCentered: true };
  var buffer = (opts.buffer || 0) / (depth + 1);
  var x1 = centerPoint.x;
  var z1 = centerPoint.z;
  if (depth > 0) {
    var goldenCircle = XUtils.getGoldenCircle(dx / 2, dx, dz, centerPoint);
    x1 = x0 + goldenCircle.x;
    z1 = z0 + goldenCircle.z;
  }

  var recurseChance = opts.recurseChance || QUILT_RECURSION_CHANCE;
  if (!depth || random() < recurseChance - QUILT_RECURSION_DECREMENT * depth) {
    var dx1 = x1 - x0;
    var dz1 = z1 - z0;
    x1 += buffer;
    z1 += buffer;
    var dx2 = dx - dx1 - buffer;
    var dz2 = dz - dz1 - buffer;
    this.recurseQuilt(x0, z0, dx1, dz1, depth + 1, opts);
    this.recurseQuilt(x1, z0, dx2, dz1, depth + 1, opts);
    this.recurseQuilt(x0, z1, dx1, dz2, depth + 1, opts);
    this.recurseQuilt(x1, z1, dx2, dz2, depth + 1, opts);
  } else {
    onComplete && onComplete(x0, z0, dx, dz, depth, opts);
  }
};

XUtils.downloadCanvas = function (canvas, name, callback) {
  canvas.toBlob((blob) => {
    callback && callback(blob);
    XUtils.downloadBlob(blob, name);
  });
};

XUtils.downloadBlob = function (blob, name) {
  var objectURL = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = objectURL;
  link.download = name;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(objectURL);
  }, 5000);
};

XUtils.downloadURI = function (uri, name) {
  var link = document.createElement('a');
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

XUtils.processImage = function (imageCanvas, width, height, callback) {
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.addEventListener('load', () => {
    callback(XUtils.reduceImage(img, width, height));
    URL.revokeObjectURL(img.src);
  });

  imageCanvas.toBlob((blob) => img.src = URL.createObjectURL(blob));
};

XUtils.reduceImage = function (img, w, h) {
  var x, y = 0, sx, sy, ssx, ssy, r, g, b;
  var srcW = img.naturalWidth;
  var srcH = img.naturalHeight;
  var srcCan = Object.assign(document.createElement('canvas'), { width: srcW, height: srcH });
  var sCtx = srcCan.getContext('2d');
  var destCan = Object.assign(document.createElement('canvas'), { width: w, height: h });
  var dCtx = destCan.getContext('2d');

  sCtx.drawImage(img, 0, 0);

  var srcData = sCtx.getImageData(0, 0, srcW, srcH).data;
  var destData = dCtx.getImageData(0, 0, w, h);
  var xStep = srcW / w, yStep = srcH / h;
  var area = xStep * yStep
  var sD = srcData, dD = destData.data;
  while (y < h) {
    sy = y * yStep;
    x = 0;
    while (x < w) {
      sx = x * xStep;
      var ssyB = sy + yStep;
      var ssxR = sx + xStep;
      r = g = b = 0;
      ssy = sy | 0;
      while (ssy < ssyB) {
        var yy1 = ssy + 1;
        var yArea = yy1 > ssyB ? ssyB - ssy : ssy < sy ? 1 - (sy - ssy) : 1;
        ssx = sx | 0;
        while (ssx < ssxR) {
          var xx1 = ssx + 1;
          var xArea = xx1 > ssxR ? ssxR - ssx : ssx < sx ? 1 - (sx - ssx) : 1;
          var srcContribution = (yArea * xArea) / area;
          var idx = (ssy * srcW + ssx) * 4;
          var color = XColorUtils.RGBtoSRGB([
            sD[idx] / 255,
            sD[idx + 1] / 255,
            sD[idx + 2] / 255
          ]);
          r += color[0] * srcContribution;
          g += color[1] * srcContribution;
          b += color[2] * srcContribution;
          ssx += 1;
        }
        ssy += 1;
      }
      var idx = (y * w + x) * 4;
      var colorFinal = XColorUtils.SRGBtoRGB([r, g, b]);
      dD[idx] = colorFinal[0] * 255;
      dD[idx + 1] = colorFinal[1] * 255;
      dD[idx + 2] = colorFinal[2] * 255;
      dD[idx + 3] = 255;
      x += 1;
    }
    y += 1;
  }

  dCtx.putImageData(destData, 0, 0);
  return destCan;
};
