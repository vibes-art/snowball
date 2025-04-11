var XVector3 = {};

XVector3.get = function (x = 0, y = 0, z = 0) {
  return new Float32Array([x, y, z]);
};

XVector3.add = function (a, b) {
  return XVector3.get(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
};

XVector3.subtract = function (a, b) {
  return XVector3.get(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

XVector3.dot = function (a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

XVector3.cross = function (a, b) {
  return XVector3.get(
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  );
};

XVector3.scale = function (v, scale) {
  return XVector3.get(scale * v[0], scale * v[1], scale * v[2]);
};

XVector3.length = function (v) {
  return sqrt(XVector3.dot(v, v));
};

XVector3.normalize = function (v) {
  var len = XVector3.length(v);
  return len > ZERO_LENGTH
    ? XVector3.get(v[0] / len, v[1] / len, v[2] / len)
    : XVector3.get();
};

XVector3.distance = function (a, b) {
  var d = XVector3.subtract(a, b);
  return sqrt(XVector3.dot(d, d));
};

// returns distance from rayOrigin to sphere collision, or null
XVector3.rayIntersectsSphere = function (rayOrigin, rayDir, sphere) {
  var L = XVector3.subtract(rayOrigin, sphere.center);
  var a = XVector3.dot(rayDir, rayDir);
  var b = 2 * XVector3.dot(rayDir, L);
  var c = XVector3.dot(L, L) - sphere.radius * sphere.radius;
  var discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  var sqrtD = sqrt(discriminant);
  var t1 = (-b - sqrtD) / (2 * a);
  var t2 = (-b + sqrtD) / (2 * a);
  var t = null;

  if (t1 >= 0 && t2 >= 0) {
    t = min(t1, t2);
  } else if (t1 >= 0 && t2 < 0) {
    t = t1;
  } else if (t2 >= 0 && t1 < 0) {
    t = t2;
  }

  return t;
};

XVector3.rayIntersectsTriangle = function (rayOrigin, rayDir, v0, v1, v2) {
  var epsilon = 1e-6;
  var edge1 = XVector3.subtract(v1, v0);
  var edge2 = XVector3.subtract(v2, v0);
  var h = XVector3.cross(rayDir, edge2);
  var a = XVector3.dot(edge1, h);
  if (a > -epsilon && a < epsilon) return null;

  var f = 1 / a;
  var s = XVector3.subtract(rayOrigin, v0);
  var u = f * XVector3.dot(s, h);
  if (u < 0 || u > 1) return null;

  var q = XVector3.cross(s, edge1);
  var v = f * XVector3.dot(rayDir, q);
  if (v < 0 || (u + v) > 1) return null;

  var t = f * XVector3.dot(edge2, q);
  return t > epsilon ? t : null;
};
