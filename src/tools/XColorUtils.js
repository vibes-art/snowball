var XColorUtils = {};

XColorUtils.getRandomColor = function () {
  return [
    Math.random(),
    Math.random(),
    Math.random(),
    1.0
  ];
};

XColorUtils.getNormalColor = function (normal) {
  var xn = normal[0];
  var yn = normal[1];
  var zn = normal[2];
  return [
    (xn + 1) / 2,
    (zn + 1) / 2,
    (yn + 1) / 2,
    1.0
  ];
};

XColorUtils.smashColors = function (c1, c2, pct) {
  var c1HSL = XColorUtils.RGBtoHSL(c1[0], c1[1], c1[2]);
  var c2HSL = XColorUtils.RGBtoHSL(c2[0], c2[1], c2[2]);
  var dh = c2HSL[0] - c1HSL[0];
  var ds = c2HSL[1] - c1HSL[1];
  var dl = c2HSL[2] - c1HSL[2];
  var da = (c2[3] || 1.0) - (c1[3] || 1.0);
  var color = XColorUtils.HSLtoRGB(c1HSL[0] + pct * dh, c1HSL[1] + pct * ds, c1HSL[2] + pct * dl);
  color[3] = c1[3] + pct * da;
  return color;
};

function SRGBtoRGB (val) {
  return val <= 0.04045 ? val / 12.92 : pow((val + 0.055) / 1.055, 2.4);
};

function RGBtoSRGB (val) {
  return val <= 0.0031308 ? 12.92 * val : 1.055 * pow(val, 1 / 2.4) - 0.055;
};

XColorUtils.RGBtoSRGB = function (c) {
  return [
    RGBtoSRGB(c[0]),
    RGBtoSRGB(c[1]),
    RGBtoSRGB(c[2]),
    c[3]
  ];
};

XColorUtils.SRGBtoRGB = function (c) {
  return [
    SRGBtoRGB(c[0]),
    SRGBtoRGB(c[1]),
    SRGBtoRGB(c[2]),
    c[3]
  ];
};

XColorUtils.smashColorsRGB = function (c1, c2, pct) {
  c1 = XColorUtils.SRGBtoRGB(c1);
  c2 = XColorUtils.SRGBtoRGB(c2);

  var dr = c2[0] - c1[0];
  var dg = c2[1] - c1[1];
  var db = c2[2] - c1[2];
  var da = (c2[3] || 1.0) - (c1[3] || 1.0);
  var result = [
    c1[0] + pct * dr,
    c1[1] + pct * dg,
    c1[2] + pct * db,
    c1[3] + pct * da
  ];

  return XColorUtils.RGBtoSRGB(result);
};

XColorUtils.smashColorsLCH = function (c1, c2, pct) {
  var c1LCH = XColorUtils.RGBtoLCH(c1[0], c1[1], c1[2]);
  var c2LCH = XColorUtils.RGBtoLCH(c2[0], c2[1], c2[2]);
  var dl = c2LCH[0] - c1LCH[0];
  var dc = c2LCH[1] - c1LCH[1];
  var dh = c2LCH[2] - c1LCH[2];
  var da = (c2[3] || 1.0) - (c1[3] || 1.0);
  var color = XColorUtils.LCHtoRGB(c1LCH[0] + pct * dl, c1LCH[1] + pct * dc, c1LCH[2] + pct * dh);
  color[3] = c1[3] + pct * da;
  return color;
};

XColorUtils.HSVtoRGB = function (h, s, v) {
  var i = floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);
  var r, g, b;
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return [r, g, b];
};

XColorUtils.RGBtoHSV = function (r, g, b) {
  var mx = max(r, g, b);
  var mn = min(r, g, b);
  var d = mx - mn;
  var h;
  var s = (mx === 0 ? 0 : d / mx);
  var v = mx;
  switch (mx) {
    case mn: h = 0; break;
    case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
    case g: h = (b - r) + d * 2; h /= 6 * d; break;
    case b: h = (r - g) + d * 4; h /= 6 * d; break;
  }
  return [h, s, v];
};

XColorUtils.RGBtoHSL = function (r, g, b) {
  var vmax = max(r, g, b), vmin = min(r, g, b);
  var h, s, l = (vmax + vmin) / 2;
  if (vmax === vmin) {
    return [0, 0, l];
  }

  var d = vmax - vmin;
  s = l > 0.5 ? d / (2 - vmax - vmin) : d / (vmax + vmin);
  if (vmax === r) h = (g - b) / d + (g < b ? 6 : 0);
  if (vmax === g) h = (b - r) / d + 2;
  if (vmax === b) h = (r - g) / d + 4;
  h /= 6;

  return [h, s, l];
};

XColorUtils.HSLtoRGB = function (h, s, l) {
  var a = s * min(l, 1 - l);
  var f = (n, k = (n + 360 * h / 30) % 12) => l - a * max(min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
};

XColorUtils.RGBtoLAB = function (r, g, b, normalized) {
  var xyz = XColorUtils.RGBtoXYZ(r, g, b);
  var lab = XColorUtils.XYZtoLAB(xyz[0], xyz[1], xyz[2]);
  return normalized ? XColorUtils.normalizeLAB(lab[0], lab[1], lab[2]) : lab;
};

XColorUtils.RGBtoXYZ = function (r, g, b) {
  r = 100 * SRGBtoRGB(r);
  g = 100 * SRGBtoRGB(g);
  b = 100 * SRGBtoRGB(b);
  var x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  var y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  var z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  return [x, y, z];
};

XColorUtils.XYZtoLAB = function (x, y, z) {
  x /= 95.047;
  y /= 100.000;
  z /= 108.883;
  x = x > 0.008856 ? pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? pow(z, 1 / 3) : (7.787 * z) + (16 / 116);
  var l = (116 * y) - 16;
  var a = 500 * (x - y);
  var b = 200 * (y - z);
  return [l, a, b];
};

XColorUtils.normalizeLAB = function (l, a, b) {
  l /= 100;
  a = (a + 86) / 184;
  b = (b + 107) / 201;
  return [l, a, b];
};

XColorUtils.RGBtoLCH = function (r, g, b) {
  var xyz = XColorUtils.RGBtoXYZ(r, g, b);
  var lab = XColorUtils.XYZtoLAB(xyz[0], xyz[1], xyz[2]);
  return XColorUtils.LABtoLCH(lab[0], lab[1], lab[2]);
};

XColorUtils.LABtoLCH = function (l, a, b) {
  var c = sqrt(a * a + b * b);
  var h = atan2(b, a);
  h = h > 0 ? (h / PI) * 180 : 360 - abs((h / PI) * 180);
  return [l, c, h];
};

XColorUtils.LCHtoRGB = function (l, c, h) {
  var lab = XColorUtils.LCHtoLAB(l, c, h);
  var xyz = XColorUtils.LABtoXYZ(lab[0], lab[1], lab[2]);
  return XColorUtils.XYZtoRGB(xyz[0], xyz[1], xyz[2]);
};

XColorUtils.LCHtoLAB = function (l, c, h) {
  var radians = (PI / 180) * h;
  var a = c * cos(radians);
  var b = c * sin(radians);
  return [l, a, b];
};

XColorUtils.LABtoXYZ = function (l, a, b) {
  var y = (l + 16) / 116;
  var x = a / 500 + y;
  var z = y - b / 200;
  x = 95.047 * ((x > 0.206897) ? pow(x, 3) : (x - 16 / 116) / 7.787);
  y = 100.000 * ((y > 0.206897) ? pow(y, 3) : (y - 16 / 116) / 7.787);
  z = 108.883 * ((z > 0.206897) ? pow(z, 3) : (z - 16 / 116) / 7.787);
  return [x, y, z];
};

XColorUtils.XYZtoRGB = function (x, y, z) {
  x /= 100;
  y /= 100;
  z /= 100;
  var r = x *  3.2406 + y * -1.5372 + z * -0.4986;
  var g = x * -0.9689 + y *  1.8758 + z *  0.0415;
  var b = x *  0.0557 + y * -0.2040 + z *  1.0570;
  r = min(max(0, RGBtoSRGB(r)), 1);
  g = min(max(0, RGBtoSRGB(g)), 1);
  b = min(max(0, RGBtoSRGB(b)), 1);
  return [r, g, b];
};

XColorUtils.sortByRed = function (a, b) { return a[0] - b[0]; };
XColorUtils.sortByGreen = function (a, b) { return a[1] - b[1]; };
XColorUtils.sortByBlue = function (a, b) { return a[2] - b[2]; };

XColorUtils.sortRGBByHue = function (a, b) {
  var aHSL = XColorUtils.RGBtoHSL(a[0] / 255, a[1] / 255, a[2] / 255);
  var bHSL = XColorUtils.RGBtoHSL(b[0] / 255, b[1] / 255, b[2] / 255);
  return aHSL[0] - bHSL[0];
};

XColorUtils.sortRGBBySaturation = function (a, b) {
  var aHSL = XColorUtils.RGBtoHSL(a[0] / 255, a[1] / 255, a[2] / 255);
  var bHSL = XColorUtils.RGBtoHSL(b[0] / 255, b[1] / 255, b[2] / 255);
  return aHSL[1] - bHSL[1];
};

XColorUtils.sortRGBByLightness = function (a, b) {
  var aHSL = XColorUtils.RGBtoHSL(a[0] / 255, a[1] / 255, a[2] / 255);
  var bHSL = XColorUtils.RGBtoHSL(b[0] / 255, b[1] / 255, b[2] / 255);
  return aHSL[2] - bHSL[2];
};

XColorUtils.sortRGBByLCHLightness = function (a, b) {
  var aLCH = XColorUtils.RGBtoLCH(a[0] / 255, a[1] / 255, a[2] / 255);
  var bLCH = XColorUtils.RGBtoLCH(b[0] / 255, b[1] / 255, b[2] / 255);
  return aLCH[0] - bLCH[0];
};

XColorUtils.sortRGBByLCHChroma = function (a, b) {
  var aLCH = XColorUtils.RGBtoLCH(a[0] / 255, a[1] / 255, a[2] / 255);
  var bLCH = XColorUtils.RGBtoLCH(b[0] / 255, b[1] / 255, b[2] / 255);
  return aLCH[1] - bLCH[1];
};

XColorUtils.sortRGBByLCHHue = function (a, b) {
  var aLCH = XColorUtils.RGBtoLCH(a[0] / 255, a[1] / 255, a[2] / 255);
  var bLCH = XColorUtils.RGBtoLCH(b[0] / 255, b[1] / 255, b[2] / 255);
  return aLCH[2] - bLCH[2];
};

XColorUtils.getRGBDistance = function (a, b) {
  var dr = b[0] - a[0];
  var dg = b[1] - a[1];
  var db = b[2] - a[2];
  return sqrt(dr * dr + dg * dg + db * db);
};

XColorUtils.getHSLDistance = function (a, b) {
  var dh = b[0] - a[0];
  var ds = b[1] - a[1];
  var dl = b[2] - a[2];
  return sqrt(dh * dh + ds * ds + dl * dl);
};

XColorUtils.getLABDistance = function (a, b) {
  var dl = b[0] - a[0];
  var da = b[1] - a[1];
  var db = b[2] - a[2];
  return sqrt(dl * dl + da * da + db * db);
};
