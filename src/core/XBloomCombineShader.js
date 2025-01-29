class XBloomCombineShader extends XShader {

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
      uniform sampler2D bloomTexture;
      uniform float intensity;

      vec3 ACESFilm(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      void main(void) {
        vec3 sceneColor = texture(sceneTexture, vUV).rgb;
        vec3 bloomColor = texture(bloomTexture, vUV).rgb * intensity;

        vec3 result = sceneColor + bloomColor;
        result = pow(result, vec3(1.0/2.2));
        fragColor = vec4(result, 1.0);

        // Combine in HDR
        // vec3 hdrColor = sceneColor + bloomColor;
        // Optional global exposure control
        // hdrColor *= 1.0;
        // Tone map
        // vec3 mapped = ACESFilm(hdrColor);
        // mapped = pow(mapped, vec3(1.0/2.2));
        // fragColor = vec4(mapped, 1.0);
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_SCENE_TEXTURE);
    this.setUniformLocation(UNI_KEY_BLOOM_TEXTURE);
    this.setUniformLocation(UNI_KEY_INTENSITY);
  }

}
