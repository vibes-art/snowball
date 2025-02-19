class XBloomExtractShader extends XSourceTexShader {

  defineFSHeader (opts) {
    super.defineFSHeader(opts);

    this.fragmentShaderSource += `
      uniform float ${UNI_KEY_THRESHOLD};
    `;
  }

  addFSMainHeader (opts) {
    super.addFSMainHeader(opts);

    this.fragmentShaderSource += `
        float brightness = max(finalColor.r, max(finalColor.g, finalColor.b));
        float softFactor = smoothstep(${UNI_KEY_THRESHOLD}, ${UNI_KEY_THRESHOLD} + 0.3, brightness);
        finalColor *= softFactor;
    `;
  }

  connect () {
    super.connect();
    this.setUniformLocation(UNI_KEY_THRESHOLD);
  }

}
