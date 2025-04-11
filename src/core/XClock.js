class _XClock {

  constructor () {
    this.elapsed = 0;
    this.lastTimestamp = 0;
    this.isPaused = false;
    this.timeMultiplier = 1;

    this.onTickListeners = [];
    this.onNextTickListeners = [];
    this.frameDeltas = [];

    this._RAF = -1;
    this._requestAnimationFrame();
  }

  reset () {
    this.elapsed = 0;
    this.lastTimestamp = 0;
    this.isPaused = false;
    this.timeMultiplier = 1;

    this.onTickListeners.length = 0;
    this.onNextTickListeners.length = 0;
  }

  // subscribe to every tick
  onTick (callback) {
    this.onTickListeners.push(callback);
  }

  // subscribe once, only to the next tick
  onNextTick (callback) {
    this.onNextTickListeners.push(callback);
  }

  removeListener (callback) {
    var i = this.onTickListeners.indexOf(callback);
    if (i >= 0) {
      this.onTickListeners.splice(i, 1);
    }

    var j = this.onNextTickListeners.indexOf(callback);
    if (j >= 0) {
      this.onNextTickListeners.splice(j, 1);
    }
  }

  togglePause () {
    this.isPaused = !this.isPaused;
  }

  _requestAnimationFrame () {
    this._RAF !== -1 && window.cancelAnimationFrame(this._RAF);
    this._RAF = window.requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  trackFPS (dt) {
    this.frameDeltas.push(dt);
    if (this.frameDeltas.length > 60) this.frameDeltas.shift();
    if (this.elapsed % 1000 <= 16) {
      var sum = 0;
      for (var i = 0; i < this.frameDeltas.length; i++) {
        sum += this.frameDeltas[i];
      }
      console.log('FPS: ', floor(1000 / (sum / this.frameDeltas.length)));
    }
  }

  tick (timestamp) {
    this._RAF = -1;

    var dtReal = this.lastTimestamp ? timestamp - this.lastTimestamp : 0;
    var dt = this.timeMultiplier * (this.isPaused ? 0 : dtReal);
    this.elapsed += dtReal;
    DEBUG_LOGS && this.trackFPS(dtReal);

    var count = this.onNextTickListeners.length;
    for (var i = count - 1; i >= 0; i--) {
      var listener = this.onNextTickListeners[i];
      if (listener) {
        listener(dt, dtReal);
        this.onNextTickListeners.splice(i, 1);
      }
    }

    var count = this.onTickListeners.length;
    for (var i = count - 1; i >= 0; i--) {
      var listener = this.onTickListeners[i];
      if (listener) listener(dt, dtReal);
    }

    XGLUtils.processLoadQueue();

    this.lastTimestamp = timestamp;
    this._requestAnimationFrame();
  }

}



var XClock = new _XClock();
