class XCombineShader extends XShader {

  setShaderSource () {
    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec2 positions;
      out vec2 vUV;

      void main() {
        vUV = (positions * 0.5) + 0.5;
        gl_Position = vec4(positions, 0.0, 1.0);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec2 vUV;
      out vec4 fragColor;

      uniform sampler2D sourceTexture;
      uniform sampler2D combineTexture;
      uniform float intensity;

      void main(void) {
        vec3 sourceColor = texture(sourceTexture, vUV).rgb;
        vec4 combineColorFull = texture(combineTexture, vUV);
        vec3 combineColor = combineColorFull.rgb * intensity;

        if (combineColorFull.a == 1.0) {
          fragColor = vec4(combineColor, 1.0);
        } else if (combineColorFull.a == 0.0) {
          fragColor = vec4(sourceColor, 1.0);
        } else {
          fragColor = vec4(sourceColor + combineColor, 1.0);
        }
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_SOURCE_TEXTURE);
    this.setUniformLocation(UNI_KEY_COMBINE_TEXTURE);
    this.setUniformLocation(UNI_KEY_INTENSITY);
  }

}
