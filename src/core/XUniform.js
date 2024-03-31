class XUniform {

  constructor (opts) {
    this.key = opts.key;
    this.type = opts.type || UNIFORM_TYPE_FLOAT;
    this.components = opts.components || 4;

    this.fvData = null;
    this.ivData = null;
    this.uivData = null;
    this.matrixData = null;
    this.isDirty = true;

    this.initializeData();
    DEBUG_LOGS && this.validateData();

    if (opts.data !== undefined) {
      this.data = opts.data;
    }
  }

  initializeData () {
    switch (this.type) {
      case UNIFORM_TYPE_FLOAT: this.fvData = new Float32Array(this.components); break;
      case UNIFORM_TYPE_INT: this.ivData = new Int32Array(this.components); break;
      case UNIFORM_TYPE_UINT: this.uivData = new Uint32Array(this.components); break;
      case UNIFORM_TYPE_MATRIX: this.matrixData = XMatrix4.get(); break;
    }
  }

  validateData () {
    if (this.components < 1 || this.components > 4) {
      console.error(`Invalid Uniform components: ${this.components}`);
    }

    if (this.type === UNIFORM_TYPE_MATRIX) {
      if (this.components !== 4) { // TODO: support other matrices
        console.error(`Unsupported Matrix dimensions, must be 4x4: ${this.components}`);
      }
    }
  }

  get data () {
    var data;
    switch (this.type) {
      case UNIFORM_TYPE_FLOAT: data = this.fvData; break;
      case UNIFORM_TYPE_INT: data = this.ivData; break;
      case UNIFORM_TYPE_UINT: data = this.uivData; break;
      case UNIFORM_TYPE_MATRIX: data = this.matrixData; break;
    }
    return this.components === 1 ? data[0] : data;
  }

  set data (data) {
    if (this.components === 1) {
      data = [data];
    }

    switch (this.type) {
      case UNIFORM_TYPE_FLOAT: this.fvData.set(data); break;
      case UNIFORM_TYPE_INT: this.ivData.set(data); break;
      case UNIFORM_TYPE_UINT: this.uivData.set(data); break;
      case UNIFORM_TYPE_MATRIX: this.matrixData.set(data); break;
    }

    this.isDirty = true;
  }

  setValue (componentIndex, value) {
    switch (this.type) {
      case UNIFORM_TYPE_FLOAT: this.fvData[componentIndex] = value; break;
      case UNIFORM_TYPE_INT: this.ivData[componentIndex] = value; break;
      case UNIFORM_TYPE_UINT: this.uivData[componentIndex] = value; break;
      case UNIFORM_TYPE_MATRIX: this.matrixData[componentIndex] = value; break;
    }

    this.isDirty = true;
  }

  apply (gl, location) {
    switch (this.type) {
      case UNIFORM_TYPE_FLOAT: this.applyFloats(gl, location); break;
      case UNIFORM_TYPE_INT: this.applyInts(gl, location); break;
      case UNIFORM_TYPE_UINT: this.applyUnsignedInts(gl, location); break;
      case UNIFORM_TYPE_MATRIX: this.applyMatrices(gl, location); break;
    }

    this.isDirty = false;
  }

  applyFloats (gl, location) {
    switch (this.components) {
      case 1: gl.uniform1f(location, this.data); break;
      case 2: gl.uniform2fv(location, this.data); break;
      case 3: gl.uniform3fv(location, this.data); break;
      case 4: gl.uniform4fv(location, this.data); break;
    }
  }

  applyInts (gl, location) {
    switch (this.components) {
      case 1: gl.uniform1i(location, this.data); break;
      case 2: gl.uniform2iv(location, this.data); break;
      case 3: gl.uniform3iv(location, this.data); break;
      case 4: gl.uniform4iv(location, this.data); break;
    }
  }

  applyUnsignedInts (gl, location) {
    switch (this.components) {
      case 1: gl.uniform1ui(location, this.data); break;
      case 2: gl.uniform2uiv(location, this.data); break;
      case 3: gl.uniform3uiv(location, this.data); break;
      case 4: gl.uniform4uiv(location, this.data); break;
    }
  }

  applyMatrices (gl, location) {
    switch (this.components) {
      case 2: gl.uniformMatrix2fv(location, false, this.data); break;
      case 3: gl.uniformMatrix3fv(location, false, this.data); break;
      case 4: gl.uniformMatrix4fv(location, false, this.data); break;
    }
  }

}
