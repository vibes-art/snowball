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
        float brightness = dot(finalColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        float softFactor = smoothstep(${UNI_KEY_THRESHOLD} - 0.2, ${UNI_KEY_THRESHOLD} + 0.2, brightness);
        finalColor *= softFactor;
    `;
  }

  connect () {
    super.connect();
    this.setUniformLocation(UNI_KEY_THRESHOLD);
  }

}
