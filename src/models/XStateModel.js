var QUATERNION = 'quaternion';

class XStateModel {

  constructor (opts) {
    this.stateIndex = opts.stateIndex || 0;
    this.animTime = opts.animTime || 0;
    this.animEasing = opts.animEasing || XEasings.easeOutQuad;

    this.states = [];
    this.attributes = [];
    this.values = {};

    this.lastStateIndex = this.stateIndex;
    this.isAnimating = false;
    this.lastAnimation = null;

    this.init(opts);
  }

  init (opts) {
    var states = opts.states || [];
    var attributes = opts.attributes || [];
    var dimensions = opts.dimensions || [];
    var values = opts.values || {};

    // allow simpler config by automatically from values
    if (!states.length) states = Object.keys(values);
    if (!attributes.length) attributes = Object.keys(values[states[0]]);

    attributes.forEach((attrKey, i) => {
      this.attributes.push(attrKey);
      this.values[attrKey] = new XMultiplex({
        dimensions: dimensions[i],
        isQuaternion: attrKey === QUATERNION
      });
    });

    states.forEach((stateKey, index) => {
      this.addState(stateKey, {
        values: values[stateKey] || null,
        multiplier: this.stateIndex === index ? 1 : 0
      });
    });

    // allow "always on" global states to offset values
    var globalValues = opts.globalValues;
    if (globalValues) {
      for (var stateKey in globalValues) {
        this.addState(stateKey, {
          values: globalValues[stateKey],
          multiplier: 1
        });
      }
    }
  }

  isState (stateKey) {
    return stateKey === this.getState();
  }

  getState () {
    return this.states[this.stateIndex];
  }

  setState (stateKey, animTime, animEasing, callback) {
    animTime = animTime !== undefined ? animTime : this.animTime;
    animEasing = animEasing !== undefined ? animEasing : this.animEasing;

    this.lastStateIndex = this.stateIndex;
    this.stateIndex = this.states.indexOf(stateKey);

    if (this.stateIndex === -1) {
      ENABLE_LOGS && console.error(`Invalid state: ${stateKey}`);
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
        animOpts.easing = animEasing;
        animOpts.callback = () => {
          this.isAnimating = false;
          if (i === 0 && callback) callback();
        };

        multiplex.animation = XTimeline.animate(multiplex.multipliers, targets, animOpts);
        this.lastAnimation = multiplex.animation;
      } else {
        this.isAnimating = false;

        multiplex.multipliers[this.lastStateIndex] = 0;
        multiplex.multipliers[this.stateIndex] = 1;

        callback && callback();
      }
    });
  }

  addState (stateKey, opts) {
    opts = opts || {};

    this.states.push(stateKey);

    this.attributes.forEach(attrKey => {
      var multiplex = this.values[attrKey];
      var vector = multiplex.getZeroVector();

      var values = opts.values;
      if (values) {
        var attrValue = values[attrKey];
        if (attrValue && attrValue.length === vector.length) {
          vector = attrValue;
        }
      }

      var multiplier = opts.multiplier || 0;
      multiplex.addVector(vector, multiplier);
    });
  }

  setMultiplier (stateKey, multiplier) {
    var stateIndex = this.states.indexOf(stateKey);
    this.attributes.forEach(attrKey => {
      var multiplex = this.values[attrKey];
      multiplex.multipliers[stateIndex] = multiplier;
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

  get animationPercent () {
    if (this.isAnimating && this.lastAnimation) {
      return this.lastAnimation.percent;
    } else {
      return 1;
    }
  }

}
