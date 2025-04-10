if (typeof tokenData === 'undefined') {
  tokenData = { hash: '' };
}

var USE_RANDOM_HASH = !tokenData.hash;
var IS_HEADLESS = /\bHeadlessChrome\//.test(navigator.userAgent);
var OUTPUT = IS_HEADLESS;
var OUTPUT_MAX = USE_RANDOM_HASH ? 999 : 1;
var OUTPUT_WIDTH = 2400;
var OUTPUT_DEPTH = 1350;
var OUTPUT_SCALE = 1;
var LIVE_RENDER = !OUTPUT;

var TIME_MULT = 1;
var TIME_STEP = 16;
var WORK_STEP = 8;
var MAX_TICK = 6 * TIME_STEP;
var BG_COLOR = [0.95, 0.94, 0.89];
var AMBIENT_LIGHT = [0.8, 0.8, 0.8];
var CAMERA_FOV = 45 * PI / 180;
var CAMERA_Z_NEAR = 0.1;
var CAMERA_Z_FAR = 10000.0;

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
  { r: 225, g: 47, b: 57, weight: 1 },
];
