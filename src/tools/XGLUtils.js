var XGLUtils = {};

// global texture cache
XGLUtils.textureCache = {};
XGLUtils.currentTextureMemory = 0;
XGLUtils.maxTextureMemory = min(
  (navigator.deviceMemory || 4) * 0.33 * 1024 * 1024 * 1024, // 33% device memory
  (IS_MOBILE ? 512 : 1024) * 1024 * 1024 // capped at 512 MB mobile, 1 GB desktop
);

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

XGLUtils.deleteBuffer = function (gl, buffer) {
  gl.deleteBuffer(buffer);
};

XGLUtils.bindVertexAttributeArray = function (gl, location, components, opts = {}) {
  var type = opts.type || gl.FLOAT;
  var normalize = opts.normalize || false;
  var stride = opts.stride || 0;
  var offset = opts.offset || 0;

  gl.vertexAttribPointer(location, components, type, normalize, stride, offset);
  gl.enableVertexAttribArray(location);
};

XGLUtils.applyUniform = function (gl, type, components, data, location) {
  switch (type) {
    case UNI_TYPE_FLOAT: XGLUtils.applyUniformFloats(gl, components, data, location); break;
    case UNI_TYPE_INT: XGLUtils.applyUniformInts(gl, components, data, location); break;
    case UNI_TYPE_UINT: XGLUtils.applyUniformUnsignedInts(gl, components, data, location); break;
    case UNI_TYPE_MATRIX: XGLUtils.applyUniformMatrices(gl, components, data, location); break;
  }
};

XGLUtils.applyUniformFloats = function (gl, components, data, location) {
  switch (components) {
    case 1: gl.uniform1f(location, data); break;
    case 2: gl.uniform2fv(location, data); break;
    case 3: gl.uniform3fv(location, data); break;
    case 4: gl.uniform4fv(location, data); break;
  }
};

XGLUtils.applyUniformInts = function (gl, components, data, location) {
  switch (components) {
    case 1: gl.uniform1i(location, data); break;
    case 2: gl.uniform2iv(location, data); break;
    case 3: gl.uniform3iv(location, data); break;
    case 4: gl.uniform4iv(location, data); break;
  }
};

XGLUtils.applyUniformUnsignedInts = function (gl, components, data, location) {
  switch (components) {
    case 1: gl.uniform1ui(location, data); break;
    case 2: gl.uniform2uiv(location, data); break;
    case 3: gl.uniform3uiv(location, data); break;
    case 4: gl.uniform4uiv(location, data); break;
  }
};

XGLUtils.applyUniformMatrices = function (gl, components, data, location) {
  switch (components) {
    case 2: gl.uniformMatrix2fv(location, false, data); break;
    case 3: gl.uniformMatrix3fv(location, false, data); break;
    case 4: gl.uniformMatrix4fv(location, false, data); break;
  }
};

XGLUtils.createTexture = function (gl, data, width, height, components) {
  var texture = gl.createTexture();
  XGLUtils.updateTexture(gl, texture, data, width, height, components);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
};

XGLUtils.updateTexture = function (gl, texture, data, width, height, components) {
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

  XGLUtils.bindTexture(gl, SHARED_TEXTURE_UNIT, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.FLOAT, data, 0);
};

XGLUtils.bindTexture = function (gl, textureUnit, texture) {
  var url = texture.url;
  var cacheEntry = XGLUtils.textureCache[url];
  if (cacheEntry) {
    cacheEntry.lastUsedTime = performance.now();
  }

  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
};

XGLUtils.loadTexture = function (gl, url, sRGB, onLoad) {
  sRGB = sRGB || false;

  var time = performance.now();
  var cacheEntry = XGLUtils.textureCache[url];

  if (cacheEntry) {
    cacheEntry.lastUsedTime = time;
    return cacheEntry.texture;
  }

  var texture = gl.createTexture();
  texture.url = url;
  cacheEntry = XGLUtils.textureCache[url] = {
    texture,
    isLoaded: false,
    width: 1,
    height: 1,
    sizeInBytes: 4,
    lastUsedTime: time
  };

  XGLUtils.bindTexture(gl, SHARED_TEXTURE_UNIT, texture);

  // temp pixel while image loads
  var level = 0;
  var internalFormat = sRGB ? gl.SRGB8_ALPHA8 : gl.RGBA;
  var width = 1;
  var height = 1;
  var border = 0;
  var srcFormat = gl.RGBA;
  var srcType = gl.UNSIGNED_BYTE;
  var pixel = new Uint8Array([0, 0, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

  var image = new Image();
  image.onload = function() {
    XGLUtils.bindTexture(gl, SHARED_TEXTURE_UNIT, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

    var isPowerOf2 = XUtils.isPowerOf2(image.width) && XUtils.isPowerOf2(image.height);
    if (isPowerOf2) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);

    cacheEntry.isLoaded = true;
    cacheEntry.width = image.width;
    cacheEntry.height = image.height;

    // estimate GPU memory usage, width * height * 4 (RGBA)
    var sizeInBytes = ceil((isPowerOf2 ? 1.33 : 1) * image.width * image.height * 4);
    XGLUtils.currentTextureMemory += sizeInBytes;
    cacheEntry.sizeInBytes = sizeInBytes;
    XGLUtils.maybeUnloadTextures(gl);

    onLoad && onLoad(texture);
  };

  image.crossOrigin = 'anonymous';
  image.src = url;

  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
};

XGLUtils.maybeUnloadTextures = function (gl) {
  if (XGLUtils.currentTextureMemory <= XGLUtils.maxTextureMemory) return;

  var entries = Object.values(XGLUtils.textureCache);
  entries.sort((a, b) => a.lastUsedTime - b.lastUsedTime);

  var i = 0;
  while (XGLUtils.currentTextureMemory > XGLUtils.maxTextureMemory && i < entries.length) {
    XGLUtils.unloadTexture(gl, entries[i++].texture);
  }
};

XGLUtils.unloadTexture = function (gl, texture) {
  var url = texture.url;
  var cacheEntry = XGLUtils.textureCache[url];
  if (cacheEntry) {
    XGLUtils.currentTextureMemory -= cacheEntry.sizeInBytes;
    XGLUtils.currentTextureMemory = max(0, XGLUtils.currentTextureMemory);
    delete XGLUtils.textureCache[url];
  }

  gl.deleteTexture(texture);
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

XGLUtils.createFramebuffer = function (gl, width, height) {
  var framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  var colorsTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, colorsTexture);
  XGLUtils.textureBestColorBuffer(gl, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorsTexture, 0);

  var renderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { framebuffer, colorsTexture, renderbuffer };
};

XGLUtils.deleteFramebuffer = function (gl, fbo) {
  gl.deleteFramebuffer(fbo.framebuffer);
  gl.deleteRenderbuffer(fbo.renderbuffer);
  XGLUtils.unloadTexture(gl, fbo.colorsTexture);
};

XGLUtils.textureBestColorBuffer = function (gl, width, height) {
  if (USE_FLOATING_POINT_TEXTURES && ENABLE_COLOR_BUFFER_FLOAT) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
  } else if (USE_FLOATING_POINT_TEXTURES && ENABLE_COLOR_BUFFER_HALF_FLOAT) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
};

XGLUtils.createDepthFramebuffer = function (gl, width, height) {
  var framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  var depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, width, height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

  var debugColorTex = null;
  if (DEBUG_LIGHTS) {
    debugColorTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, debugColorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, debugColorTex, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { framebuffer, depthTexture, debugColorTex };
};

XGLUtils.loadMaterial = function (gl, path, mat) {
  mat.useTextures = true;
  XGLUtils.loadTexture(gl, `${path}.png`, true, t => mat.setMaterialTexture(UNI_KEY_ALBEDO_MAP, t));
  XGLUtils.loadTexture(gl, `${path}_normal.png`, false, t => mat.setMaterialTexture(UNI_KEY_NORMAL_MAP, t));
  XGLUtils.loadTexture(gl, `${path}_roughness.png`, false, t => mat.setMaterialTexture(UNI_KEY_ROUGHNESS_MAP, t));
};
