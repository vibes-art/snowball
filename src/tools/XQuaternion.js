var XQuaternion = {};

// returns an identity quaternion by default
XQuaternion.get = function (x = 0, y = 0, z = 0, w = 1) {
  return new Float32Array([x, y, z, w]);
};

XQuaternion.dot = function (a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

XQuaternion.length = function (q) {
  return sqrt(XQuaternion.dot(q, q));
};

XQuaternion.normalize = function (q) {
  var len = XQuaternion.length(q);
  return (len > ZERO_LENGTH)
    ? XQuaternion.get(q[0] / len, q[1] / len, q[2] / len, q[3] / len)
    : XQuaternion.get();
};

XQuaternion.multiply = function (a, b) {
  var ax = a[0], ay = a[1], az = a[2], aw = a[3];
  var bx = b[0], by = b[1], bz = b[2], bw = b[3];
  var rx = ax * bw + aw * bx + ay * bz - az * by;
  var ry = ay * bw + aw * by + az * bx - ax * bz;
  var rz = az * bw + aw * bz + ax * by - ay * bx;
  var rw = aw * bw - ax * bx - ay * by - az * bz;
  return XQuaternion.get(rx, ry, rz, rw);
};

XQuaternion.fromAxisAngle = function (axis, angle) {
  axis = XVector3.normalize(axis);
  var s = sin(angle / 2);
  var c = cos(angle / 2);
  return XQuaternion.get(s * axis[0], s * axis[1], s * axis[2], c);
};

XQuaternion.slerp = function (qa, qb, t) {
  var ax = qa[0], ay = qa[1], az = qa[2], aw = qa[3];
  var bx = qb[0], by = qb[1], bz = qb[2], bw = qb[3];

  var cosom = ax * bx + ay * by + az * bz + aw * bw;
  if (cosom < 0) {
    cosom *= -cosom;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }

  var omega, sinom, scale0, scale1;
  if ((1 - cosom) > 1e-6) {
    omega = acos(cosom);
    sinom = sin(omega);
    scale0 = sin((1 - t) * omega) / sinom;
    scale1 = sin(t * omega) / sinom;
  } else {
    scale0 = 1 - t;
    scale1 = t;
  }

  var rx = scale0 * ax + scale1 * bx;
  var ry = scale0 * ay + scale1 * by;
  var rz = scale0 * az + scale1 * bz;
  var rw = scale0 * aw + scale1 * bw;
  return XQuaternion.normalize(XQuaternion.get(rx, ry, rz, rw));
};

XQuaternion.log = function (q) {
  var n = XVector3.normalize(q);
  var angle = acos(q[3]);
  return XVector3.get(angle * n[0], angle * n[1], angle * n[2]);
};

XQuaternion.exp = function (v) {
  var len = XVector3.length(v);
  if (len < ZERO_LENGTH) return XQuaternion.get();

  var scale = sin(len) / len;
  return XQuaternion.get(
    scale * v[0],
    scale * v[1],
    scale * v[2],
    cos(len)
  );
};

XQuaternion.weightedQuaternionBlend = function (quats, weights) {
  var count = quats.length;
  if (count === 0) return XQuaternion.get();

  var sum = 0;
  for (var i = 0; i < count; i++) {
    sum += weights[i];
  }

  if (abs(sum) < ZERO_LENGTH) return XQuaternion.get();

  var logs = XVector3.get();
  var qRef = XQuaternion.normalize(quats[0].slice());
  var qRefInv = XQuaternion.get(-qRef[0], -qRef[1], -qRef[2], qRef[3]);
  for (var i = 0; i < count; i++) {
    var qi = quats[i];

    if (XQuaternion.dot(qi, qRef) < 0) {
      qi = XQuaternion.get(-qi[0], -qi[1], -qi[2], -qi[3]);
    }

    var qRel = XQuaternion.normalize(XQuaternion.multiply(qRefInv, qi));
    var logRel = XQuaternion.log(qRel);
    var w = weights[i] / sum;
    logs[0] += w * logRel[0];
    logs[1] += w * logRel[1];
    logs[2] += w * logRel[2];
  }

  var qExp = XQuaternion.exp(logs);
  var qBlend = XQuaternion.multiply(qRef, qExp);
  return XQuaternion.normalize(qBlend);
};

XQuaternion.transformVector = function (q, v) {
  var uv = XVector3.cross(q, v);
  var t = XVector3.scale(uv, 2);
  var uuv = XVector3.cross(q, t);
  return XVector3.get(
    v[0] + q[3] * t[0] + uuv[0],
    v[1] + q[3] * t[1] + uuv[1],
    v[2] + q[3] * t[2] + uuv[2]
  );
};
