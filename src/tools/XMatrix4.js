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
  for (var row = 0; row < 4; ++row) {
    for (var col = 0; col < 4; ++col) {
      var sum = 0;
      for (var k = 0; k < 4; ++k) {
        sum += a[row + k * 4] * b[k + col * 4];
      }
      result[row * 4 + col] = sum;
    }
  }
  return result;
};

XMatrix4.getTranslation = function (x, y, z) {
  return new Float32Array([
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1
  ]);
};

XMatrix4.translate = function (target, x, y, z) {
  return XMatrix4.multiply(target, XMatrix4.getTranslation(x, y, z));
};

XMatrix4.getRotationX = function (angle) {
  var c = cos(angle);
  var s = sin(angle);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ]);
};

XMatrix4.rotateX = function (target, angle) {
  var rotX = XMatrix4.getRotationX(angle);
  var temp4 = target[4] * rotX[5] + target[8] * rotX[6];
  var temp5 = target[5] * rotX[5] + target[9] * rotX[6];
  var temp6 = target[6] * rotX[5] + target[10] * rotX[6];
  var temp7 = target[7] * rotX[5] + target[11] * rotX[6];
  target[8] = target[4] * rotX[9] + target[8] * rotX[10];
  target[9] = target[5] * rotX[9] + target[9] * rotX[10];
  target[10] = target[6] * rotX[9] + target[10] * rotX[10];
  target[11] = target[7] * rotX[9] + target[11] * rotX[10];
  target[4] = temp4;
  target[5] = temp5;
  target[6] = temp6;
  target[7] = temp7;
  return target;
};

XMatrix4.getRotationY = function (angle) {
  var c = cos(angle);
  var s = sin(angle);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ]);
};

XMatrix4.rotateY = function (target, angle) {
  var rotY = XMatrix4.getRotationY(angle);
  var temp0 = target[0] * rotY[0] + target[8] * rotY[2];
  var temp1 = target[1] * rotY[0] + target[9] * rotY[2];
  var temp2 = target[2] * rotY[0] + target[10] * rotY[2];
  var temp3 = target[3] * rotY[0] + target[11] * rotY[2];
  target[8] = target[0] * rotY[8] + target[8] * rotY[10];
  target[9] = target[1] * rotY[8] + target[9] * rotY[10];
  target[10] = target[2] * rotY[8] + target[10] * rotY[10];
  target[11] = target[3] * rotY[8] + target[11] * rotY[10];
  target[0] = temp0;
  target[1] = temp1;
  target[2] = temp2;
  target[3] = temp3;
  return target;
};

XMatrix4.getRotationZ = function (angle) {
  var c = cos(angle);
  var s = sin(angle);
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
};

XMatrix4.rotateZ = function (target, angle) {
  var rotZ = XMatrix4.getRotationZ(angle);
  var temp0 = target[0] * rotZ[0] + target[4] * rotZ[1];
  var temp1 = target[1] * rotZ[0] + target[5] * rotZ[1];
  var temp2 = target[2] * rotZ[0] + target[6] * rotZ[1];
  var temp3 = target[3] * rotZ[0] + target[7] * rotZ[1];
  target[4] = target[0] * rotZ[4] + target[4] * rotZ[5];
  target[5] = target[1] * rotZ[4] + target[5] * rotZ[5];
  target[6] = target[2] * rotZ[4] + target[6] * rotZ[5];
  target[7] = target[3] * rotZ[4] + target[7] * rotZ[5];
  target[0] = temp0;
  target[1] = temp1;
  target[2] = temp2;
  target[3] = temp3;
  return target;
};

XMatrix4.getScale = function (sx, sy, sz) {
  return new Float32Array([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1
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

  inverse[0] = (target[5] * c5 - target[6] * c4 + target[7] * c3) / det;
  inverse[4] = (-target[4] * c5 + target[6] * c2 - target[7] * c1) / det;
  inverse[8] = (target[4] * c4 - target[5] * c2 + target[7] * c0) / det;
  inverse[12] = (-target[4] * c3 + target[5] * c1 - target[6] * c0) / det;
  inverse[1] = (-target[1] * c5 + target[2] * c4 - target[3] * c3) / det;
  inverse[5] = (target[0] * c5 - target[2] * c2 + target[3] * c1) / det;
  inverse[9] = (-target[0] * c4 + target[1] * c2 - target[3] * c0) / det;
  inverse[13] = (target[0] * c3 - target[1] * c1 + target[2] * c0) / det;
  inverse[2] = (target[13] * s5 - target[14] * s4 + target[15] * s3) / det;
  inverse[6] = (-target[12] * s5 + target[14] * s2 - target[15] * s1) / det;
  inverse[10] = (target[12] * s4 - target[13] * s2 + target[15] * s0) / det;
  inverse[14] = (-target[12] * s3 + target[13] * s1 - target[14] * s0) / det;
  inverse[3] = (-target[9] * s5 + target[10] * s4 - target[11] * s3) / det;
  inverse[7] = (target[8] * s5 - target[10] * s2 + target[11] * s1) / det;
  inverse[11] = (-target[8] * s4 + target[9] * s2 - target[11] * s0) / det;
  inverse[15] = (target[8] * s3 - target[9] * s1 + target[10] * s0) / det;
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
  var f = 1 / tan(fov / 2);
  var nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
};

XMatrix4.frustum = function (left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  return new Float32Array([
    (near * 2) * rl, 0, 0, 0,
    0, (near * 2) * tb, 0, 0,
    (right + left) * rl, (top + bottom) * tb, (far + near) * nf, -1,
    0, 0, (far * near * 2) * nf, 0
  ]);
};

XMatrix4.ortho = function (left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var fn = 1 / (far - near);
  return new Float32Array([
    2 * rl, 0, 0, 0,
    0, 2 * tb, 0, 0,
    0, 0, -2 * fn, 0,
    -(right + left) * rl, -(top + bottom) * tb, -(far + near) * fn, 1
  ]);
};

XMatrix4.lookAt = function (eye, center, up) {
  // TODO: refactor, XVector3?
  function subtract (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross (a, b) { return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }
  function dot (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function length (v) { return sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
  function normalize(v) {
    var len = length(v);
    if (len < 1e-10) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  var f = normalize(subtract(center, eye));
  var s = normalize(cross(f, up));
  var u = cross(s, f);

  var out = new Float32Array(16);
  out[0] =  s[0];
  out[1] =  u[0];
  out[2] = -f[0];
  out[3] =  0.0;
  out[4] =  s[1];
  out[5] =  u[1];
  out[6] = -f[1];
  out[7] =  0.0;
  out[8] =  s[2];
  out[9] =  u[2];
  out[10] = -f[2];
  out[11] = 0.0;
  out[12] = -dot(s, eye);
  out[13] = -dot(u, eye);
  out[14] =  dot(f, eye);
  out[15] =  1.0;
  return out;
};

XMatrix4.transformPoint = function (m, p) {
  var x = p[0], y = p[1], z = p[2];

  var xPrime = m[0] * x + m[4] * y + m[8]  * z + m[12];
  var yPrime = m[1] * x + m[5] * y + m[9]  * z + m[13];
  var zPrime = m[2] * x + m[6] * y + m[10] * z + m[14];
  var wPrime = m[3] * x + m[7] * y + m[11] * z + m[15];

  if (abs(wPrime) > 1e-8) {
    xPrime /= wPrime;
    yPrime /= wPrime;
    zPrime /= wPrime;
  }

  return [xPrime, yPrime, zPrime];
};
