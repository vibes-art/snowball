var USE_PBR = true;

var MODEL_SCALE = 1;
var FLOOR_WIDTH = 48 * MODEL_SCALE;
var FLOOR_DEPTH = 22 * MODEL_SCALE;
var WALL_HEIGHT = 12 * MODEL_SCALE;

var CAMERA_FOV = 45 * PI / 180;
var CAMERA_Z_NEAR = 0.1 * MODEL_SCALE;
var CAMERA_Z_FAR = 100.0 * MODEL_SCALE;
var CAMERA_VEL_MAX = 0.002 * MODEL_SCALE;
var CAMERA_ACCEL_TIME = 2500;
var CAMERA_X = 0;
var CAMERA_Y = 1 * MODEL_SCALE;
var CAMERA_Z = 2 * MODEL_SCALE;
var SKY_COLOR = [0.37, 0.43, 0.49, 1];
var FLOOR_COLOR = [0.49, 0.43, 0.37, 1];
var AMBIENT_LIGHT = [0.05, 0.025, 0.0125];

var FOG_COLOR = [4, 2, 1];
var FOG_DENSITY = 0.00052;
var SHADOW_BIAS = 0.006;

var SUN_X = 10 * FLOOR_WIDTH / 8;
var SUN_Y = WALL_HEIGHT * 0.7;
var SUN_Z = -10 * FLOOR_DEPTH;
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
var GRID_SIZE = 4;

class BlankCanvas extends XCanvas {

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
    var bounds = gridWidth + BOX_SIZE;

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
      // lookAtPoint: [0, WALL_HEIGHT / 7, -FLOOR_DEPTH],
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

    var wallY = WALL_HEIGHT / 2;
    this.objects.walls = new XQuadBox({
      ...objOpts,
      material: this.materials.sky,
      center: [0, wallY, -FLOOR_DEPTH / 2],
      dimensions: [FLOOR_WIDTH, WALL_HEIGHT, FLOOR_DEPTH],
      isInverted: true,
      skipFaces: [0, 1, 2, 4]
    });

    var sky = this.objects.walls.quads[0];
    var beach = this.objects.walls.quads[1];

    sky.enableRenderPass(RENDER_PASS_SHADOWS, false);
    beach.setMaterial({ material: this.materials.beach });

    this.objects.sun = new XSphere({
      ...objOpts,
      radius: 1,
      rings: 32,
      segments: 64,
      material: this.materials.sun,
      modelMatrix: XMatrix4.getTranslation(SPHERE_X, SPHERE_Y, SPHERE_Z)
    });

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
