var XVector3 = {};

XVector3.get = function () {
  return new Float32Array([0, 0, 0]);
};

XVector3.subtract = function (a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
};

XVector3.dot = function (a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

XVector3.cross = function (a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
};

XVector3.length = function (v) {
  return sqrt(XVector3.dot(v, v));
};

XVector3.normalize = function (v) {
  var len = XVector3.length(v);
  return len > 1e-8 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
};

XVector3.distance = function (a, b) {
  var d = XVector3.subtract(a, b);
  return sqrt(XVector3.dot(d, d));
};

XVector3.rayIntersectsSphere = function (rayOrigin, rayDir, sphere) {
  var L = XVector3.subtract(rayOrigin, sphere.center);
  var a = XVector3.dot(rayDir, rayDir);
  var b = 2 * XVector3.dot(rayDir, L);
  var c = XVector3.dot(L, L) - sphere.radius * sphere.radius;
  var discriminant = b * b - 4 * a * c;
  return discriminant >= 0;
};

XVector3.rayIntersectsTriangle = function (rayOrigin, rayDir, v0, v1, v2) {
  var epsilon = 1e-6;
  var edge1 = XVector3.subtract(v1, v0);
  var edge2 = XVector3.subtract(v2, v0);
  var h = XVector3.cross(rayDir, edge2);
  var a = XVector3.dot(edge1, h);
  if (a > -epsilon && a < epsilon) return false;

  var f = 1 / a;
  var s = XVector3.subtract(rayOrigin, v0);
  var u = f * XVector3.dot(s, h);
  if (u < 0 || u > 1) return false;

  var q = XVector3.cross(s, edge1);
  var v = f * XVector3.dot(rayDir, q);
  if (v < 0 || (u + v) > 1) return false;

  var t = f * XVector3.dot(edge2, q);
  return t > epsilon;
};
