class XStateModelGroup {

  constructor (opts) {
    this.models = {};

    var sharedConfig = opts;
    var modelConfigs = opts.models;
    for (var i = 0; i < modelConfigs.length; i++) {
      this.addModel({ ...sharedConfig, ...modelConfigs[i] });
    }
  }

  addModel (opts) {
    var key = opts.key;
    this.models[key] = new XStateModel(opts);
  }

  getModel (key) {
    return this.models[key];
  }

  getValues (modelKey, attribKey) {
    var model = this.getModel(modelKey);
    return model.getAttributeValues(attribKey);
  }

  setState (stateKey, animTime, animEasing, callback) {
    for (var key in this.models) {
      this.models[key].setState(stateKey, animTime, animEasing, callback);
      callback = null; // only pass the callback once
    }
  }

  setMultiplier (stateKey, multiplier) {
    for (var key in this.models) {
      this.models[key].setMultiplier(stateKey, multiplier);
    }
  }

}
