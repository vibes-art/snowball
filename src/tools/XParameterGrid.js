class XParameterGrid {

  constructor (opts) {
    this.scene = opts.scene;
    this.objectClass = opts.objectClass;
    this.parameterBase = opts.parameterBase;
    this.parameterX = opts.parameterX;
    this.parameterZ = opts.parameterZ;

    this.x = 0;
    this.z = 0;
    this.objects = [];
    this.isFinished = false;

    this.scene.onDraw(this, (dt) => this.onDraw(dt));
  }

  getParameters (x, z) {
    var params = { ...this.parameterBase };
    this.addParameter(params, x, this.parameterX);
    this.addParameter(params, z, this.parameterZ);

    params.modelMatrix = XMatrix4.getTranslation(
      x * this.parameterX.offset,
      0,
      z * this.parameterZ.offset
    );

    return params;
  }

  addParameter (params, index, config) {
    var paramKey = config.key;
    var paramBase = config.base;
    var paramStep = config.step;
    params[paramKey] = paramBase + index * paramStep;
  }

  onDraw (dt) {
    if (this.isFinished) {
      return;
    }

    USE_RANDOM_HASH = false;
    setSeed();

    var objectRow = this.objects[this.x] = this.objects[this.x] || [];
    var params = this.getParameters(this.x, this.z);
    var obj = new this.objectClass(params);
    this.scene.addObject(obj);
    objectRow.push(obj);

    this.z++;
    if (this.z >= this.parameterZ.count) {
      this.z = 0;
      this.x++;
      if (this.x >= this.parameterX.count) {
        this.x = 0;
        this.isFinished = true;
      }
    }
  }

}
