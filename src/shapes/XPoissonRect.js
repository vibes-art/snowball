class XPoissonRect extends XRect {

  constructor (opts) {
    super(opts);

    this.radius = opts.radius;
    this.tries = opts.tries || 30;

    this.cellSize = this.radius / sqrt(2);
    this.gridWidth = ceil(this.width / this.cellSize);
    this.gridDepth = ceil(this.depth / this.cellSize);
    this.grid = new Array(this.gridWidth * this.gridDepth).fill(-1);
    this.activeList = [];
    this.samples = [];
  }

  getGridIndex (x, z) {
    return x + z * this.gridWidth;
  }

  sample () {
    var point = {
      x: this.x - this._halfWidth + this.width * random(),
      z: this.z - this._halfDepth + this.depth * random()
    };

    var i = floor(point.x / this.cellSize);
    var j = floor(point.z / this.cellSize);

    this.activeList.push(point);
    this.grid[this.getGridIndex(i, j)] = point;

    while (this.activeList.length > 0) {
      var activeIndex = floor(random() * this.activeList.length);
      var active = this.activeList[activeIndex];
      var added = false;

      for (var t = 0; t < this.tries; t++) {
        var angle = TAU * random();
        var r = this.radius * (1 + random());
        var newPoint = {
          x: active.x + r * cos(angle),
          z: active.z + r * sin(angle)
        };

        if (this.isInside(newPoint.x, newPoint.z)) {
          var i = floor(newPoint.x / this.cellSize);
          var j = floor(newPoint.z / this.cellSize);
          var fit = true;
          var xs = max(i - 1, 0);
          var xe = min(i + 1, this.gridWidth - 1);
          var zs = max(j - 1, 0);
          var ze = min(j + 1, this.gridDepth - 1);

          for (var x = xs; x <= xe; x++) {
            for (var z = zs; z <= ze; z++) {
              var neighbor = this.grid[this.getGridIndex(x, z)];
              if (neighbor !== -1 && XUtils.distance(newPoint, neighbor) < this.radius) {
                fit = false;
                break;
              }
            }
            if (!fit) break;
          }

          if (fit) {
            this.activeList.push(newPoint);
            this.samples.push(newPoint);
            this.grid[this.getGridIndex(i, j)] = newPoint;
            added = true;
            break;
          }
        }
      }

      if (!added) {
        this.activeList.splice(activeIndex, 1);
      }
    }

    return this.samples;
  }
}
