function createNoise (scale, exponent, amplitude, scaleX, scaleY) {
  scale = scale || 1;
  scaleX = scaleX || scale;
  scaleY = scaleY || scale;
  exponent = exponent || 1;
  amplitude = amplitude || 1;

  var p = new Uint8Array(256);
  var perm = new Uint8Array(512);
  var permMod12 = new Uint8Array(512);
  for (var i = 0; i < 256; i++) { p[i] = (256 * random()) | 0; }
  for (var i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }

  var pow = Math.pow;
  var noiseObj = {};
  noiseObj.perm = perm;
  noiseObj.permMod12 = permMod12;
  noiseObj.scaleX = scaleX;
  noiseObj.scaleY = scaleY;
  noiseObj.exponent = exponent;
  noiseObj.amplitude = amplitude;
  noiseObj.get = function (x, y) {
    x *= scaleX;
    y *= scaleY;

    var perm2 = perm;
    var perm12 = permMod12;

    var n0, n1, n2;
    var F2 = 0.3660254038;
    var G2 = 0.2113248654;
    var G2D = 0.4226497308;
    var s = F2 * (x + y);
    var i = (x + s) | 0;
    var j = (y + s) | 0;
    var t = G2 * (i + j);
    var X0 = i - t;
    var Y0 = j - t;
    var x0 = x - X0;
    var y0 = y - Y0;

    var i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    var x1 = x0 - i1 + G2;
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + G2D;
    var y2 = y0 - 1 + G2D;
    var ii = i & 255;
    var jj = j & 255;
    var gi0 = perm12[ii + perm2[jj]];
    var gi1 = perm12[ii + i1 + perm2[jj + j1]];
    var gi2 = perm12[ii + 1 + perm2[jj + 1]];
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    var giX0, giY0, giX1, giY1, giX2, giY2;

    if (t0 < 0) {
      n0 = 0;
    } else {
      if (gi0 > 7) {
        giX0 = 0;
        giY0 = gi0 % 2 ? -1 : 1;
      } else if (gi0 > 3) {
        giX0 = gi0 % 2 ? -1 : 1;
        giY0 = 0;
      } else {
        giX0 = gi0 % 2 ? -1 : 1;
        giY0 = gi0 > 1 ? -1 : 1;
      }

      t0 *= t0;
      t0 *= t0;
      n0 = t0 * (x0 * giX0 + y0 * giY0)
    }

    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      if (gi1 > 7) {
        giX1 = 0;
        giY1 = gi1 % 2 ? -1 : 1;
      } else if (gi1 > 3) {
        giX1 = gi1 % 2 ? -1 : 1;
        giY1 = 0;
      } else {
        giX1 = gi1 % 2 ? -1 : 1;
        giY1 = gi1 > 1 ? -1 : 1;
      }

      t1 *= t1;
      t1 *= t1;
      n1 = t1 * (x1 * giX1 + y1 * giY1)
    }

    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      if (gi2 > 7) {
        giX2 = 0;
        giY2 = gi2 % 2 ? -1 : 1;
      } else if (gi2 > 3) {
        giX2 = gi2 % 2 ? -1 : 1;
        giY2 = 0;
      } else {
        giX2 = gi2 % 2 ? -1 : 1;
        giY2 = gi2 > 1 ? -1 : 1;
      }

      t2 *= t2;
      t2 *= t2;
      n2 = t2 * (x2 * giX2 + y2 * giY2);
    }

    var noise = 35 * (n0 + n1 + n2) + 0.5;
    if (exponent !== 1) noise = pow(noise, exponent);
    return amplitude * noise;
  };

  return noiseObj;
};
