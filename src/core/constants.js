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
var CAMERA_Z_FAR = 100.0;
var UP_VECTOR = [0, 1, 0];
var USE_FLOATING_POINT_TEXTURES = false;
var USE_MSAA = false;
var AA_SUPERSAMPLE = 4;
var MAX_LIGHTS = 9;
var MAX_POINT_LIGHTS = 9;
var SHADOW_MAP_SIZE = 4096;

var DIM_X = 0;
var DIM_Z = 1;

var NO_SHADER_LOCATION = -1;

var RENDER_PASS_LIGHTS = 'lights';
var RENDER_PASS_MAIN = 'main';
var RENDER_PASS_ANTIALIAS = 'antialias';

var ATTR_KEY_POSITIONS = 'positions';
var ATTR_KEY_NORMALS = 'normals';
var ATTR_KEY_COLORS = 'colors';
var ATTR_KEY_TEX_COORDS = 'texCoords';

var UNI_TYPE_FLOAT = 0;
var UNI_TYPE_INT = 1;
var UNI_TYPE_UINT = 2;
var UNI_TYPE_MATRIX = 3;
var UNI_TYPE_TEXTURE = 4;

var UNI_KEY_PROJ_MATRIX = 'projectionMatrix';
var UNI_KEY_MODEL_MATRIX = 'modelMatrix';
var UNI_KEY_VIEW_MATRIX = 'viewMatrix';
var UNI_KEY_NORMAL_MATRIX = 'normalMatrix';
var UNI_KEY_RESOLUTION = 'resolution';
var UNI_KEY_AMBIENT_LIGHT = 'ambient';
var UNI_KEY_BACKGROUND_LIGHT = 'background';
var UNI_KEY_DIRECTIONAL_LIGHT = 'light';
var UNI_KEY_POINT_LIGHT = 'pointLight';
var UNI_KEY_DIRECTIONAL_LIGHT_COUNT = 'lightCount';
var UNI_KEY_POINT_LIGHT_COUNT = 'pointLightCount';
var UNI_KEY_FOG_COLOR = 'fogColor';
var UNI_KEY_FOG_DENSITY = 'fogDensity';

var NOISE_TYPE_HEIGHT = 'height';
var NOISE_TYPE_COLOR_HEIGHT_OFFSET = 'colorHeightOffset';
