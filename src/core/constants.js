var abs = Math.abs;
var min = Math.min;
var max = Math.max;
var sin = Math.sin;
var cos = Math.cos;
var tan = Math.tan;
var pow = Math.pow;
var exp = Math.exp;
var log = Math.log;
var log2 = Math.log2;
var sqrt = Math.sqrt;
var ceil = Math.ceil;
var floor = Math.floor;
var round = Math.round;
var asin = Math.asin;
var acos = Math.acos;
var atan2 = Math.atan2;
var random = Math.random;
var MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

var PI = Math.PI;
var TAU = 2 * PI;
var GLD = (1 + sqrt(5)) / 2;
var GLD_RECT = 1 / GLD;
var QUILT_RECURSION_CHANCE = 0.8;
var QUILT_RECURSION_DECREMENT = 0.1;

var ENABLE_LOGS = true;
var DEBUG_LOGS = ENABLE_LOGS && false;
var VERBOSE = false;
var LIVE_RENDER = false;
var SHOW_NORMAL_MAPS = false;
var CAMERA_FOV = 45 * PI / 180;
var CAMERA_Z_NEAR = 0.1;
var CAMERA_Z_FAR = 1000000.0;
var USE_FLOATING_POINT_TEXTURES = false;
var USE_MSAA = false;
var AA_SUPERSAMPLE = 4;
var MAX_LIGHTS = 9;
var MAX_POINT_LIGHTS = 9;

var DIM_X = 0;
var DIM_Z = 1;

var NO_SHADER_LOCATION = -1;

var ATTR_KEY_POSITIONS = 'positions';
var ATTR_KEY_NORMALS = 'normals';
var ATTR_KEY_COLORS = 'colors';
var ATTR_KEY_TEX_COORDS = 'texCoords';

var UNIFORM_TYPE_FLOAT = 0;
var UNIFORM_TYPE_INT = 1;
var UNIFORM_TYPE_UINT = 2;
var UNIFORM_TYPE_MATRIX = 3;

var NOISE_TYPE_HEIGHT = 'height';
var NOISE_TYPE_COLOR_HEIGHT_OFFSET = 'colorHeightOffset';
