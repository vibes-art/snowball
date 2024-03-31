var XGLUtils = {};

XGLUtils.setBuffer = function (gl, buffer, srcData, opts) {
  var target = opts.target !== undefined ? opts.target : gl.ARRAY_BUFFER;
  var isDirty = opts.isDirty;

  if (isDirty) {
    if (buffer) {
      this.bindBufferSubData(gl, buffer, srcData, opts);
    } else {
      buffer = this.bindNewBuffer(gl, srcData, target);
    }
  } else {
    this.bindBuffer(gl, buffer, target);
  }

  return buffer;
};

XGLUtils.bindBuffer = function (gl, buffer, target) {
  target = target !== undefined ? target : gl.ARRAY_BUFFER;

  gl.bindBuffer(target, buffer);
};

XGLUtils.bindNewBuffer = function (gl, srcData, target, usage) {
  target = target !== undefined ? target : gl.ARRAY_BUFFER;
  usage = usage !== undefined ? usage : gl.STATIC_DRAW;

  var buffer = gl.createBuffer();
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, srcData, usage);
  return buffer;
};

XGLUtils.bindBufferSubData = function (gl, buffer, srcData, opts) {
  var offset = opts.offset || 0;
  var length = opts.length || 0;
  var target = opts.target !== undefined ? opts.target : gl.ARRAY_BUFFER;

  gl.bindBuffer(target, buffer);

  if (length) {
    gl.bufferSubData(target, 4 * offset, srcData, offset, length);
  } else {
    gl.bufferSubData(target, offset, srcData);
  }
};

XGLUtils.createTexture = function (gl, data, width, height, components) {
  var internalFormat, format;
  switch (components) {
    case 4: internalFormat = gl.RGBA32F; format = gl.RGBA; break;
    case 3: internalFormat = gl.RGB32F; format = gl.RGB; break;
    case 1: internalFormat = gl.R32F; format = gl.RED; break;
    default: console.error("Unsupported component size: " + components);
  }

  if (data.length !== width * height * components) {
    console.error("Data size does not match texture dimensions.");
  }

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.FLOAT, data, 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
};

XGLUtils.bindTexture = function (gl, textureUnit, texture) {
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
};

XGLUtils.loadTexture = function (gl, url) {
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // temp pixel while image loads
  var level = 0;
  var internalFormat = gl.RGBA;
  var width = 1;
  var height = 1;
  var border = 0;
  var srcFormat = gl.RGBA;
  var srcType = gl.UNSIGNED_BYTE;
  var pixel = new Uint8Array([0, 0, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

  var image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (XUtils.isPowerOf2(image.width) && XUtils.isPowerOf2(image.height)) {
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };

  image.crossOrigin = 'anonymous';
  image.src = url;

  return texture;
};

XGLUtils.initShaderProgram = function (gl, vertexShaderSource, fragmentShaderSource) {
  var vertexShader = XGLUtils.loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = XGLUtils.loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(`Shader Init Error: ${gl.getProgramInfoLog(shaderProgram)}`);
    return null;
  }

  return { shaderProgram, vertexShader, fragmentShader };
};

XGLUtils.loadShader = function (gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`Shader Compile Error: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
};
