class XNoiseShader extends XShader {

  defineVSHeader (opts) {
    this.vertexShaderSource = `#version 300 es
      precision ${PRECISION} float;

      in vec2 ${ATTR_KEY_POSITIONS};
      out vec2 vUV;
    `;
  }

  addVSMainHeader (opts) {
    this.vertexShaderSource += `
      void main() {
        vUV = (${ATTR_KEY_POSITIONS} * 0.5) + 0.5;
    `;
  }

  defineVSMain (opts) {
    this.addVSMainHeader(opts);

    this.vertexShaderSource += `
        gl_Position = vec4(${ATTR_KEY_POSITIONS}, 0.0, 1.0);
      }
    `;
  }

  defineFSHeader (opts) {
    this.fragmentShaderSource = `#version 300 es
      precision ${PRECISION} float;

      const float C_512 = 512.0;
      const float C_255 = 255.0;
      const float OFFSET = 0.5;
      const float F2 = 0.3660254038;
      const float G2 = 0.2113248654;
      const float G2D = 0.4226497308;

      const vec2 GRAD2D[12] = vec2[](
        vec2( 1.0,  1.0), vec2(-1.0,  1.0),
        vec2( 1.0, -1.0), vec2(-1.0, -1.0),
        vec2( 1.0,  0.0), vec2(-1.0,  0.0),
        vec2( 1.0,  0.0), vec2(-1.0,  0.0),
        vec2( 0.0,  1.0), vec2( 0.0, -1.0),
        vec2( 0.0,  1.0), vec2( 0.0, -1.0)
      );

      in vec2 vUV;
      out vec4 fragColor;

      int getPerm(in sampler2D tex, int index, float layerPct) {
        float x = (float(index) + OFFSET) / C_512;
        float rVal = texture(tex, vec2(x, layerPct)).r;
        return int(rVal * C_255 + OFFSET);
      }

      int getPermMod12(in sampler2D tex, int index, float layerPct) {
        float x = (float(index) + OFFSET) / C_512;
        float gVal = texture(tex, vec2(x, layerPct)).g;
        return int(gVal * C_255 + OFFSET);
      }

      float simplexNoise2D(in sampler2D tex, vec2 xy, float layerPct) {
        float x = xy.x;
        float y = xy.y;

        float s = (x + y) * F2;
        int i = int(floor(x + s));
        int j = int(floor(y + s));

        float t = float(i + j) * G2;
        float X0 = float(i) - t;
        float Y0 = float(j) - t;
        float x0 = x - X0;
        float y0 = y - Y0;

        int i1 = int(step(y0, x0));
        int j1 = 1 - i1;

        float x1 = x0 - float(i1) + G2;
        float y1 = y0 - float(j1) + G2;
        float x2 = x0 - 1.0 + G2D;
        float y2 = y0 - 1.0 + G2D;

        int ii = i & 255;
        int jj = j & 255;

        int perm0 = getPerm(tex, jj, layerPct);
        int perm1 = getPerm(tex, jj + j1, layerPct);
        int perm2 = getPerm(tex, jj + 1, layerPct);
        int gi0 = getPermMod12(tex, ii + perm0, layerPct);
        int gi1 = getPermMod12(tex, (ii + i1) + perm1, layerPct);
        int gi2 = getPermMod12(tex, (ii + 1) + perm2, layerPct);

        float t0 = max(0.0, 0.5 - x0 * x0 - y0 * y0);
        t0 *= t0;
        t0 *= t0;
        float n0 = t0 * dot(vec2(x0, y0), GRAD2D[gi0]);

        float t1 = max(0.0, 0.5 - x1 * x1 - y1 * y1);
        t1 *= t1;
        t1 *= t1;
        float n1 = t1 * dot(vec2(x1, y1), GRAD2D[gi1]);

        float t2 = max(0.0, 0.5 - x2 * x2 - y2 * y2);
        t2 *= t2;
        t2 *= t2;
        float n2 = t2 * dot(vec2(x2, y2), GRAD2D[gi2]);

        return 35.0 * (n0 + n1 + n2) + 0.5;
      }

      float getSimplexNoise2D(in sampler2D tex, in sampler2D texProps, vec2 uv, int layerCount) {
        float n = 0.0;

        for (int layer = 0; layer < layerCount; layer++) {
          float layerPct = (float(layer) + OFFSET) / float(layerCount);
          vec4 props = texture(texProps, vec2(OFFSET, layerPct));

          float scaleX = props.r;
          float scaleY = props.g;
          float exponent = props.b;
          float amplitude = props.a;

          float x = uv.x * scaleX;
          float y = uv.y * scaleY;
          n += amplitude * pow(simplexNoise2D(tex, vec2(x, y), layerPct), exponent);
        }

        return n;
      }
    `;
  }

  addFSMainHeader (opts) {
    this.fragmentShaderSource += `
      void main() {
        vec3 finalColor = vec3(1.0);
        float alpha = 1.0;
    `;
  }

  defineFSMain (opts) {
    this.addFSMainHeader(opts);

    this.fragmentShaderSource += `
        fragColor = vec4(finalColor, alpha);
      }
    `;
  }

}
