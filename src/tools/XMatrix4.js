// column-major matrix library
var XMatrix4 = {};

XMatrix4.get = function () {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
};

XMatrix4.multiply = function (a, b) {
  var result = new Float32Array(16);
  for (var col = 0; col < 4; ++col) {
    for (var row = 0; row < 4; ++row) {
      var sum = 0;
      for (var k = 0; k < 4; ++k) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      result[col * 4 + row] = sum;
    }
  }
  return result;
};

XMatrix4.getTranslation = function (x, y, z) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1
  ]);
};

XMatrix4.translate = function (target, x, y, z) {
  return XMatrix4.multiply(target, XMatrix4.getTranslation(x, y, z));
};

XMatrix4.getRotationX = function (angle) {
  var c = cos(angle);
  var s = sin(angle);
  return new Float32Array([
    1,  0,  0, 0,
    0,  c,  s, 0,
    0, -s,  c, 0,
    0,  0,  0, 1
  ]);
};

XMatrix4.getRotationY = function (angle) {
  var c = cos(angle);
  var s = sin(angle);
  return new Float32Array([
     c, 0, -s, 0,
     0, 1,  0, 0,
     s, 0,  c, 0,
     0, 0,  0, 1
  ]);
};

XMatrix4.getRotationZ = function (angle) {
  var c = cos(angle);
  var s = sin(angle);
  return new Float32Array([
    c,  s,  0, 0,
   -s,  c,  0, 0,
    0,  0,  1, 0,
    0,  0,  0, 1
  ]);
};

XMatrix4.rotateX = function (target, angle) {
  var rotX = XMatrix4.getRotationX(angle);
  return XMatrix4.multiply(target, rotX);
};

XMatrix4.rotateY = function (target, angle) {
  var rotY = XMatrix4.getRotationY(angle);
  return XMatrix4.multiply(target, rotY);
};

XMatrix4.rotateZ = function (target, angle) {
  var rotZ = XMatrix4.getRotationZ(angle);
  return XMatrix4.multiply(target, rotZ);
};

XMatrix4.getScale = function (sx, sy, sz) {
  return new Float32Array([
    sx,  0,  0, 0,
     0, sy,  0, 0,
     0,  0, sz, 0,
     0,  0,  0, 1
  ]);
};

XMatrix4.scale = function (target, sx, sy, sz) {
  return XMatrix4.multiply(target, XMatrix4.getScale(sx, sy, sz));
};

XMatrix4.invert = function (target) {
  var inverse = new Float32Array(16);

  var s0 = target[0] * target[5] - target[4] * target[1];
  var s1 = target[0] * target[6] - target[4] * target[2];
  var s2 = target[0] * target[7] - target[4] * target[3];
  var s3 = target[1] * target[6] - target[5] * target[2];
  var s4 = target[1] * target[7] - target[5] * target[3];
  var s5 = target[2] * target[7] - target[6] * target[3];

  var c5 = target[10] * target[15] - target[14] * target[11];
  var c4 = target[9] * target[15] - target[13] * target[11];
  var c3 = target[9] * target[14] - target[13] * target[10];
  var c2 = target[8] * target[15] - target[12] * target[11];
  var c1 = target[8] * target[14] - target[12] * target[10];
  var c0 = target[8] * target[13] - target[12] * target[9];

  var det = s0 * c5 - s1 * c4 + s2 * c3 + s3 * c2 - s4 * c1 + s5 * c0;
  if (abs(det) <= 1e-10) return target;

  inverse[0] = ( target[5] * c5 - target[6] * c4 + target[7] * c3) / det;
  inverse[4] = (-target[4] * c5 + target[6] * c2 - target[7] * c1) / det;
  inverse[8] = ( target[4] * c4 - target[5] * c2 + target[7] * c0) / det;
  inverse[12] = (-target[4] * c3 + target[5] * c1 - target[6] * c0) / det;

  inverse[1] = (-target[1] * c5 + target[2] * c4 - target[3] * c3) / det;
  inverse[5] = ( target[0] * c5 - target[2] * c2 + target[3] * c1) / det;
  inverse[9] = (-target[0] * c4 + target[1] * c2 - target[3] * c0) / det;
  inverse[13] = ( target[0] * c3 - target[1] * c1 + target[2] * c0) / det;

  inverse[2] = ( target[13] * s5 - target[14] * s4 + target[15] * s3) / det;
  inverse[6] = (-target[12] * s5 + target[14] * s2 - target[15] * s1) / det;
  inverse[10] = ( target[12] * s4 - target[13] * s2 + target[15] * s0) / det;
  inverse[14] = (-target[12] * s3 + target[13] * s1 - target[14] * s0) / det;

  inverse[3] = (-target[9] * s5 + target[10] * s4 - target[11] * s3) / det;
  inverse[7] = ( target[8] * s5 - target[10] * s2 + target[11] * s1) / det;
  inverse[11] = (-target[8] * s4 + target[9]  * s2 - target[11] * s0) / det;
  inverse[15] = ( target[8] * s3 - target[9]  * s1 + target[10] * s0) / det;

  return inverse;
};

XMatrix4.transpose = function (target) {
  var result = new Float32Array(16);
  result[0] = target[0];
  result[1] = target[4];
  result[2] = target[8];
  result[3] = target[12];
  result[4] = target[1];
  result[5] = target[5];
  result[6] = target[9];
  result[7] = target[13];
  result[8] = target[2];
  result[9] = target[6];
  result[10] = target[10];
  result[11] = target[14];
  result[12] = target[3];
  result[13] = target[7];
  result[14] = target[11];
  result[15] = target[15];
  return result;
};

XMatrix4.perspective = function (fov, aspect, near, far) {
  var f = 1 / tan(fov * 0.5);
  var rangeInv = 1 / (far - near);
  var out = new Float32Array(16);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8]  = 0;
  out[9]  = 0;
  out[10] = -(far + near) * rangeInv;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = -(2.0 * far * near) * rangeInv;
  out[15] = 0;
  return out;
};

XMatrix4.frustum = function (left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var fn = 1 / (far - near);
  return new Float32Array([
    (near * 2) * rl, 0,               0,  0,
    0,               (near * 2) * tb, 0,  0,
    (right + left) * rl, (top + bottom) * tb, (far + near) * fn, -1,
    0,               0,               (far * near * 2) * fn,  0
  ]);
};

XMatrix4.ortho = function (left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var fn = 1 / (far - near);
  return new Float32Array([
    2 * rl, 0,     0,     0,
    0,     2 * tb, 0,     0,
    0,     0,    -2 * fn, 0,
    -(right + left) * rl,
    -(top + bottom) * tb,
    -(far + near) * fn,
    1
  ]);
};

XMatrix4.lookAt = function (eye, center, up) {
  var f = XVector3.normalize(XVector3.subtract(center, eye));
  var s = XVector3.normalize(XVector3.cross(f, up));
  var u = XVector3.cross(s, f);

  var out = new Float32Array(16);
  out[0] = s[0];
  out[1] = u[0];
  out[2] = -f[0];
  out[3] = 0;
  out[4] = s[1];
  out[5] = u[1];
  out[6] = -f[1];
  out[7] = 0;
  out[8] = s[2];
  out[9] = u[2];
  out[10] = -f[2];
  out[11] = 0;
  out[12] = -XVector3.dot(s, eye);
  out[13] = -XVector3.dot(u, eye);
  out[14] = XVector3.dot(f, eye);
  out[15] = 1;

  return out;
};

XMatrix4.transformPoint = function (m, p) {
  var x = p[0], y = p[1], z = p[2];
  var xPrime = m[0] * x + m[4] * y + m[8] * z  + m[12];
  var yPrime = m[1] * x + m[5] * y + m[9] * z  + m[13];
  var zPrime = m[2] * x + m[6] * y + m[10] * z + m[14];
  var wPrime = m[3] * x + m[7] * y + m[11] * z + m[15];

  if (abs(wPrime) > 1e-8) {
    xPrime /= wPrime;
    yPrime /= wPrime;
    zPrime /= wPrime;
  }

  return [xPrime, yPrime, zPrime];
};

XMatrix4.multiplyWithVector = function (m, v) {
  var result = [];
  for (var i = 0; i < 4; i++) {
    result[i] = m[i] * v[0] + m[i + 4] * v[1] + m[i + 8] * v[2] + m[i + 12] * v[3];
  }
  return result;
};

XMatrix4.fromQuaternion = function (q) {
  var x = q[0], y = q[1], z = q[2], w = q[3];
  var xx = x * x, yy = y * y, zz = z * z;
  var xy = x * y, xz = x * z, yz = y * z;
  var wx = w * x, wy = w * y, wz = w * z;

  var out = new Float32Array(16);
  out[0] = 1 - 2 * (yy + zz);
  out[1] = 2 * (xy + wz);
  out[2] = 2 * (xz - wy);
  out[3] = 0;
  out[4] = 2 * (xy - wz);
  out[5] = 1 - 2 * (xx + zz);
  out[6] = 2 * (yz + wx);
  out[7] = 0;
  out[8] = 2 * (xz + wy);
  out[9] = 2 * (yz - wx);
  out[10] = 1 - 2 * (xx + yy);
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;

  return out;
};
