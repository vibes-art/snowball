class XCombineShader extends XShader {

  setShaderSource () {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      in vec2 positions;
      out vec2 vUV;

      void main() {
        vUV = (positions * 0.5) + 0.5;
        gl_Position = vec4(positions, 0.0, 1.0);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec2 vUV;
      out vec4 fragColor;

      uniform sampler2D sceneTexture;
      uniform sampler2D combineTexture;
      uniform float intensity;

      void main(void) {
        vec3 sceneColor = texture(sceneTexture, vUV).rgb;
        vec3 combineColor = texture(combineTexture, vUV).rgb * intensity;
        fragColor = vec4(sceneColor + combineColor, 1.0);
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_SCENE_TEXTURE);
    this.setUniformLocation(UNI_KEY_COMBINE_TEXTURE);
    this.setUniformLocation(UNI_KEY_INTENSITY);
  }

}
