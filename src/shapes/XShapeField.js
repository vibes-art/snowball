class XShapeField {

  constructor () {
    this.shapes = [];
  }

  addShape (shape) {
    this.shapes.push(shape);
  }

  get () {
    return this.shapes;
  }

  getCount () {
    return this.shapes.length;
  }

  getCollidingShape (x, z) {
    var shapes = this.shapes;
    var count = shapes.length;
    for (var i = 0; i < count; i++) {
      var shape = shapes[i];
      if (shape.isInside(x, z)) return shape;
    }
    return null;
  }

  getCollidingShapes (x, z) {
    var shapes = this.shapes;
    var count = shapes.length;
    var results = [];
    for (var i = 0; i < count; i++) {
      var shape = shapes[i];
      if (shape.isInside(x, z)) results.push(shape);
    }
    return results;
  }

  getClosestShape (x, z) {
    var shapes = this.shapes;
    var count = shapes.length;
    var closestDist = MAX_SAFE_INTEGER;
    var result = null;

    for (var i = 0; i < count; i++) {
      var shape = shapes[i];
      var dist = shape.getSignedDistance(x, z);
      if (dist >= 0 && dist < closestDist) {
        closestDist = dist;
        result = shape;
      }
    }

    return result;
  }

  getSignedDistance (x, z) {
    var count = this.shapes.length;
    if (!count) return 0;

    var sumDistance = 0;
    var countInside = 0;
    var sumDistanceInside = 0;

    for (var i = 0; i < count; i++) {
      var shape = this.shapes[i];
      var distance = shape.getSignedDistance(x, z);
      if (distance >= 0) {
        sumDistance += distance;
      } else {
        sumDistanceInside += distance;
        countInside++;
      }
    }

    if (sumDistanceInside !== 0) {
      return sumDistanceInside / countInside;
    } else {
      return sumDistance / count;
    }
  }

}
