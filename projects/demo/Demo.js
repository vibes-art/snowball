var USE_PBR = true;

var MODEL_SCALE = 1;
var FLOOR_WIDTH = 100 * MODEL_SCALE;
var FLOOR_DEPTH = 200 * MODEL_SCALE;
var WALL_HEIGHT = 12 * MODEL_SCALE;

var CAMERA_FOV = 45 * PI / 180;
var CAMERA_Z_NEAR = 0.1 * MODEL_SCALE;
var CAMERA_Z_FAR = 100.0 * MODEL_SCALE;
var CAMERA_VEL_MAX = 0.002 * MODEL_SCALE;
var CAMERA_ACCEL_TIME = 2500;
var CAMERA_X = 0;
var CAMERA_Y = 1 * MODEL_SCALE;
var CAMERA_Z = 1.5 * MODEL_SCALE;
var SKY_COLOR = [0, 0, 1, 1];
var FLOOR_COLOR = [0.49, 0.43, 0.37, 1];
var AMBIENT_LIGHT = [0.05, 0.025, 0.0125];

var FOG_COLOR = [4, 2, 1];
var FOG_DENSITY = 0.004;
var SHADOW_BIAS = 0.001;

var SUN_X = 0.25 * FLOOR_WIDTH;
var SUN_Y = 5 * WALL_HEIGHT;
var SUN_Z = -FLOOR_DEPTH;
var SPHERE_X = 0.13 * FLOOR_WIDTH;
var SPHERE_Y = SUN_Y / 2;
var SPHERE_Z = -FLOOR_DEPTH + 1;

var BLOOM_SCALE = 0.25;
var BLOOM_INTENSITY = 1;
var BLOOM_THRESHOLD = 0.7;

var BOX_SIZE = 0.4;
var BOX_PAD = 1 * BOX_SIZE;
var GRID_X = 0;
var GRID_Y = 0;
var GRID_Z = -1.5;
var GRID_SIZE = 20;

var COLORS = [
  { r: 176, g: 234, b: 219, weight: 9 },
  { r: 0, g: 39, b: 71, weight: 9 },
  { r: 16, g: 64, b: 76, weight: 9 },
  { r: 66, g: 182, b: 181, weight: 9 },
  { r: 0, g: 74, b: 91, weight: 9 },
  { r: 252, g: 223, b: 143, weight: 8 },
  { r: 247, g: 226, b: 208, weight: 8 },
  { r: 250, g: 232, b: 189, weight: 4 },
  { r: 255, g: 194, b: 0, weight: 4 },
  { r: 253, g: 203, b: 76, weight: 4 },
  { r: 249, g: 97, b: 41, weight: 4 },
  { r: 209, g: 137, b: 21, weight: 3 },
  { r: 255, g: 204, b: 199, weight: 3 },
  { r: 253, g: 210, b: 112, weight: 3 },
  { r: 238, g: 68, b: 64, weight: 2 },
  { r: 162, g: 223, b: 220, weight: 2 },
  { r: 23, g: 137, b: 141, weight: 2 },
  { r: 146, g: 195, b: 134, weight: 2 },
  { r: 255, g: 120, b: 109, weight: 2 },
  { r: 2, g: 74, b: 117, weight: 2 },
  { r: 255, g: 160, b: 5, weight: 1 },
  { r: 0, g: 146, b: 204, weight: 1 },
  { r: 255, g: 139, b: 0, weight: 1 },
  { r: 255, g: 154, b: 130, weight: 1 },
  { r: 225, g: 47, b: 57, weight: 1 }
];



class Demo extends XCanvas {

  constructor (opts) {
    super(opts);

    this.materials = {};
    this.objects = {};
  }

  initLights (opts) {
    var gridWidth = GRID_SIZE * BOX_SIZE + (GRID_SIZE - 1) * BOX_PAD;
    var cx = GRID_X + gridWidth / 2;
    var cy = GRID_Y;
    var cz = GRID_Z + gridWidth / 2;

    // smaller bounds => crisper shadows, larger bounds hide the shadow behind the camera
    // but without cascading shadow maps or other solution, we get a large "shadow" on the floor
    var bounds = 1 * (gridWidth + BOX_SIZE);

    this.scene.addDirectionalLight({
      color: [5, 2.5, 1.25, 1],
      position: [SUN_X, SUN_Y, SUN_Z],
      lookAtPoint: [0, 0, 0],
      shadowBounds: [
        [cx + -bounds, cy + -bounds, cz + -bounds],
        [cx + -bounds, cy + -bounds, cz +  bounds],
        [cx + -bounds, cy +  bounds, cz + -bounds],
        [cx + -bounds, cy +  bounds, cz +  bounds],
        [cx +  bounds, cy + -bounds, cz + -bounds],
        [cx +  bounds, cy + -bounds, cz +  bounds],
        [cx +  bounds, cy +  bounds, cz + -bounds],
        [cx +  bounds, cy +  bounds, cz +  bounds]
      ]
    });
  }

  initCamera (opts) {
    this.camera = new XFlyingCamera({
      sensitivity: this.dragSensitivity,
      position: [CAMERA_X, CAMERA_Y, CAMERA_Z],
      lookAtPoint: [GRID_X, GRID_Y, 5 * GRID_Z],
      velocityMax: CAMERA_VEL_MAX,
      accelTime: CAMERA_ACCEL_TIME
    });
  }

  initScene () {
    try {
      var maxTexSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) || 0;
      SHADOW_MAP_SIZE = floor(max(4096, min(8192, maxTexSize / 2)));
    } catch (e) {
      console.error(e);
    }

    super.initScene({
      backgroundColor: [0.5, 0.5, 0.5],
      fogColor: FOG_COLOR,
      fogDensity: FOG_DENSITY
    });
  }

  initEffects (opts) {
    super.initEffects(opts);

    this.effects.push(new XBloomEffect({
      scene: this.scene,
      width: this.width,
      height: this.height,
      threshold: BLOOM_THRESHOLD,
      intensity: BLOOM_INTENSITY,
      scale: BLOOM_SCALE
    }));
  }

  initObjects () {
    this.objects.boxes = [];

    var boxMatOpts = { gl: this.gl };
    boxMatOpts[UNI_KEY_ROUGHNESS] = 0.45;

    var objOpts = {
      gl: this.gl,
      scene: this.scene
    };

    var gridWidth = GRID_SIZE * BOX_SIZE + (GRID_SIZE - 1) * BOX_PAD;

    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var cx = GRID_X + (BOX_SIZE - gridWidth) / 2 + r * (BOX_SIZE + BOX_PAD);
        var cy = GRID_Y + 0.5 * BOX_SIZE;
        var cz = GRID_Z - c * (BOX_SIZE + BOX_PAD);
        var vertices = [];
        var colorChoice;

        for (var v = 0; v < 8; v++) {
          colorChoice = v % 4 === 0 ? XUtils.chooseByWeight(COLORS) : colorChoice;
          var color = [colorChoice.r / 255, colorChoice.g / 255, colorChoice.b / 255, 1];
          var vertexSigns = BOX_VERTEX_SIGNS[v];
          var position = [
            cx + 0.5 * BOX_SIZE * vertexSigns[0],
            cy + 0.5 * BOX_SIZE * vertexSigns[1],
            cz + 0.5 * BOX_SIZE * vertexSigns[2]
          ];
          vertices.push({ position, color });
        }

        var boxMatOpts = { gl: this.gl };
        boxMatOpts[UNI_KEY_METALLIC] = 0.0 + 1.0 * random() * random();
        boxMatOpts[UNI_KEY_ROUGHNESS] = 0.1 + 0.6 * random();

        this.objects.boxes.push(new XQuadBox({
          ...objOpts,
          material: new XMaterial(boxMatOpts),
          vertices,
          center: [cx, cy, cz]
        }));
      }
    }

    var matOpts = { gl: this.gl };
    this.materials.sky = new XMaterial({ ...matOpts, baseColor: SKY_COLOR });
    this.materials.beach = new XMaterial({ ...matOpts, baseColor: FLOOR_COLOR, roughness: 0.6 });
    this.materials.sun = new XMaterial({
      ...matOpts,
      baseColor: [1, 1, 1, 0.5],
      emissiveColor: [5000, 100, 100, 1]
    });

    this.objects.walls = new XQuadBox({
      ...objOpts,
      material: this.materials.sky,
      center: [CAMERA_X, WALL_HEIGHT / 2, CAMERA_Z],
      dimensions: [FLOOR_WIDTH, WALL_HEIGHT, FLOOR_DEPTH],
      isInverted: true,
      skipFaces: [0, 1, 2, 3, 4]
    });

    // var sky = this.objects.walls.quads[0];
    var beach = this.objects.walls.quads[0];

    // sky.enableRenderPass(RENDER_PASS_SHADOWS, false);
    beach.setMaterial({ material: this.materials.beach });

    this.objects.sun = new XSphere({
      ...objOpts,
      radius: 1,
      rings: 32,
      segments: 64,
      material: this.materials.sun,
      modelMatrix: XMatrix4.getTranslation(SPHERE_X, SPHERE_Y, SPHERE_Z)
    });

    this.objects.sky = new XSphere({
      ...objOpts,
      frontFace: this.gl.CW,
      invertNormals: true,
      ignoreFrustumCulling: true,
      radius: CAMERA_Z_FAR / 2,
      rings: 32,
      segments: 64,
      material: this.materials.sky,
      modelMatrix: XMatrix4.getTranslation(CAMERA_X, CAMERA_Y, CAMERA_Z)
    });

    beach.enableRenderPass(RENDER_PASS_SHADOWS, false);
    this.objects.sky.enableRenderPass(RENDER_PASS_SHADOWS, false);

    super.initObjects();
  }

  onKeyDown (evt) {
    var key = super.onKeyDown(evt);
    switch (key) {
      case '1': this.resetCamera(); break;
      case 'R': this.reset(false); break;
    }
  }

}
