class XBloomExtractShader extends XShader {

  setShaderSource () {
    this.vertexShaderSource = `#version 300 es
      precision highp float;

      in vec2 positions;
      out vec2 vUV;

      void main(void) {
        vUV = (positions * 0.5) + 0.5;
        gl_Position = vec4(positions, 0.0, 1.0);
      }
    `;

    this.fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec2 vUV;
      out vec4 fragColor;

      uniform sampler2D sourceTexture;
      uniform float threshold;

      void main(void) {
        vec3 color = texture(sourceTexture, vUV).rgb;
        float brightness = max(color.r, max(color.g, color.b));
        float softFactor = smoothstep(threshold, threshold + 0.3, brightness);
        fragColor = vec4(color * softFactor, 1.0);
      }
    `;
  }

  connect () {
    this.setUniformLocation(UNI_KEY_SOURCE_TEXTURE);
    this.setUniformLocation(UNI_KEY_THRESHOLD);
  }

}
