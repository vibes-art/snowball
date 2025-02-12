class XStateModel {

  constructor (opts) {
    this.states = opts.states;
    this.attributes = opts.attributes;

    this.stateIndex = opts.stateIndex || 0;
    this.dimensions = opts.dimensions || 3;
    this.animTime = opts.animTime || 0;
    this.animEasing = opts.animEasing || XEasings.easeOutQuad;

    this.values = {};
    this.lastStateIndex = this.stateIndex;
    this.isAnimating = false;
    this.lastAnimation = null;

    this.attributes.forEach((attrKey, i) => {
      var multiplex = this.values[attrKey] = new XMultiplex({ dimensions: this.dimensions });
      this.states.forEach((stateKey, j) => {
        var vector = multiplex.getZeroVector();

        var values = opts.values;
        if (values) {
          var stateValues = values[stateKey];
          if (stateValues) {
            var attrValue = stateValues[attrKey];
            if (attrValue && attrValue.length === vector.length) {
              vector = attrValue;
            }
          }
        }

        multiplex.addVector(vector, this.stateIndex === j ? 1 : 0);
      });
    });
  }

  get animationPercent () {
    if (this.isAnimating && this.lastAnimation) {
      return this.lastAnimation.percent;
    } else {
      return 1;
    }
  }

  isState (stateKey) {
    return stateKey === this.getState();
  }

  getState () {
    return this.states[this.stateIndex];
  }

  setState (stateKey, animTime) {
    animTime = animTime !== undefined ? animTime : this.animTime;

    this.lastStateIndex = this.stateIndex;
    this.stateIndex = this.states.indexOf(stateKey);

    if (this.stateIndex === -1) {
      console.error(`Invalid state: ${stateKey}`);
    }

    this.attributes.forEach((attrKey, i) => {
      var multiplex = this.values[attrKey];
      if (multiplex.animation) {
        XTimeline.clear(multiplex.animation);
      }

      if (animTime) {
        this.isAnimating = true;

        var targets = {};
        targets[this.lastStateIndex] = 0;
        targets[this.stateIndex] = 1;

        var animOpts = {};
        animOpts.duration = animTime;
        animOpts.easing = this.animEasing;
        animOpts.callback = () => { this.isAnimating = false; };

        multiplex.animation = XTimeline.animate(multiplex.multipliers, targets, animOpts);
        this.lastAnimation = multiplex.animation;
      } else {
        this.isAnimating = false;

        multiplex.multipliers[this.lastStateIndex] = 0;
        multiplex.multipliers[this.stateIndex] = 1;
      }
    });
  }

  getAttributeValues (attrKey) {
    var multiplex = this.values[attrKey];
    return multiplex.getValues();
  }

  setAttributeValues (attrKey, stateKey, values) {
    var stateIndex = stateKey ? this.states.indexOf(stateKey) : this.stateIndex;
    var multiplex = this.values[attrKey];
    multiplex.setVectorValues(stateIndex, values);
  }

  getAttributeVector (attrKey, stateKey) {
    var stateIndex = stateKey ? this.states.indexOf(stateKey) : this.stateIndex;
    var multiplex = this.values[attrKey];
    return multiplex.getVector(stateIndex);
  }

}
