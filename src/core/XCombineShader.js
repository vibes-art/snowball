class XCombineShader extends XSourceTexShader {

  defineFSHeader (opts) {
    super.defineFSHeader(opts);

    this.fragmentShaderSource += `
      uniform sampler2D ${UNI_KEY_COMBINE_TEXTURE};
      uniform float ${UNI_KEY_INTENSITY};
    `;
  }

  addFSMainHeader (opts) {
    super.addFSMainHeader(opts);

    this.fragmentShaderSource += `
        vec4 combineColorFull = texture(${UNI_KEY_COMBINE_TEXTURE}, vUV);
        vec3 combineColor = combineColorFull.rgb * ${UNI_KEY_INTENSITY};

        if (combineColorFull.a == 1.0) {
          finalColor = combineColor;
        } else if (combineColorFull.a > 0.0) {
          finalColor = finalColor + combineColor;
        }
    `;
  }

  connect () {
    super.connect();
    this.setUniformLocation(UNI_KEY_COMBINE_TEXTURE);
    this.setUniformLocation(UNI_KEY_INTENSITY);
  }

}
