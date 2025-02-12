class XMultiplex {

  constructor (opts) {
    opts = opts || {};

    this.dimensions = opts.dimensions || 3;

    this.vectors = [];
    this.multipliers = [];
  }

  addVector (vector, mult) {
    mult = mult !== undefined ? mult : 1;

    this.vectors.push(vector);
    this.multipliers.push(mult);

    return vector;
  }

  getVector (index) {
    return this.vectors[index];
  }

  setVectorValues (index, values) {
    var vector = this.vectors[index];
    values.forEach((value, i) => {
      vector[i] = value;
    });
  }

  getValues () {
    var values = [];

    for (var i = 0; i < this.vectors.length; i++) {
      var vector = this.vectors[i];
      var mult = this.multipliers[i];

      for (var j = 0; j < this.dimensions; j++) {
        var value = i === 0 ? 0 : values[j];
        values[j] = value + mult * vector[j];
      }
    }

    return values;
  }

  getZeroVector () {
    return Array(this.dimensions).fill(0);
  }

}
