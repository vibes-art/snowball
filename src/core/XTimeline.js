
class _XTimeline {

  constructor () {
    this.reset();
  }

  reset () {
    this.animations = [];

    XClock.onTick((dt) => this.tick(dt));
  }

  animate (subject, target, opts) {
    opts = opts || {};

    var anim = new XAnimation({ subject, target, ...opts });
    this.animations.push(anim);
    return anim;
  }

  clear (subject) {
    var animations = this.animations;
    var count = animations.length;

    for (var i = count - 1; i >= 0; i--) {
      if (!subject || subject === animations[i].subject) {
        animations.splice(i, 1);
      }
    }
  }

  tick (dt) {
    var animations = this.animations;
    var count = animations.length;

    for (var i = count - 1; i >= 0; i--) {
      if (animations[i].tick(dt)) {
        animations.splice(i, 1);
      }
    }
  }

}



class XAnimation {

  constructor (opts) {
    this.subject = opts.subject;
    this.target = opts.target;

    this.duration = opts.duration || 1;
    this.easing = opts.easing || XEasings.linear
    this.callback = opts.callback || null;

    this.elapsed = 0;

    this.calculate();
  }

  calculate () {
    this.initial = {};
    this.delta = {};

    for (var key in this.target) {
      var initial = (this.subject[key] || 0);
      this.initial[key] = initial;
      this.delta[key] = this.target[key] - initial;
    }
  }

  tick (dt) {
    this.elapsed += dt;

    var pct = max(0, min(1, this.easing(this.elapsed / this.duration)));
    for (var key in this.initial) {
      this.subject[key] = this.initial[key] + pct * this.delta[key];
    }

    var isComplete = this.elapsed >= this.duration;
    isComplete && this.callback && this.callback();
    return isComplete;
  }

}



var XTimeline = new _XTimeline();
