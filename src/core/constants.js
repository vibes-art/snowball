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
var DEBUG_LIGHTS = false;
var VERBOSE = false;
var LIVE_RENDER = false;
var SHOW_NORMAL_MAPS = false;
var CAMERA_FOV = 45 * PI / 180;
var CAMERA_Z_NEAR = 0.1;
var CAMERA_Z_FAR = 100.0;
var UP_VECTOR = [0, 1, 0];
var USE_FLOATING_POINT_TEXTURES = true;
var USE_PBR = true;
var USE_MSAA = false;
var AA_SUPERSAMPLE = 4;
var AMBIENT_LIGHT = [0.8, 0.8, 0.8];
var MAX_LIGHTS = 9;
var MAX_POINT_LIGHTS = 9;
var SHADOW_MAP_SIZE = 4096;
var ATTEN_CONST = 1.0;
var ATTEN_LINEAR = 0.09;
var ATTEN_QUAD = 0.032;
var SHARED_TEXTURE_UNIT = 0;
var BASE_SCENE_TEXTURE_UNIT = 1;

var DIM_X = 0;
var DIM_Z = 1;

var NO_SHADER_LOCATION = -1;

var RENDER_PASS_LIGHTS = 'lights';
var RENDER_PASS_MAIN = 'main';
var RENDER_PASS_ANTIALIAS = 'antialias';

var LIGHT_DIRECTIONAL = 'directional';
var LIGHT_POINT = 'point';
var LIGHT_SPOT = 'spot';

var ATTR_KEY_POSITIONS = 'positions';
var ATTR_KEY_NORMALS = 'normals';
var ATTR_KEY_COLORS = 'colors';
var ATTR_KEY_TEX_COORDS = 'texCoords';
var ATTR_KEY_TANGENTS = 'tangents';
var ATTR_KEY_BITANGENTS = 'bitangents';

var UNI_TYPE_FLOAT = 0;
var UNI_TYPE_INT = 1;
var UNI_TYPE_UINT = 2;
var UNI_TYPE_MATRIX = 3;
var UNI_TYPE_TEXTURE = 4;

// XShader
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
var UNI_KEY_ATTEN_CONST = 'attenConst';
var UNI_KEY_ATTEN_LINEAR = 'attenLinear';
var UNI_KEY_ATTEN_QUAD = 'attenQuad';

// PBRShader
var UNI_KEY_BASE_COLOR = 'baseColor';
var UNI_KEY_METALLIC = 'metallic';
var UNI_KEY_ROUGHNESS = 'roughness';
var UNI_KEY_ALBEDO_MAP = 'albedoMap';
var UNI_KEY_NORMAL_MAP = 'normalMap';
var UNI_KEY_ROUGHNESS_MAP = 'roughnessMap';
var UNI_KEY_HAS_ALBEDO_MAP = 'hasAlbedoMap';
var UNI_KEY_HAS_NORMAL_MAP = 'hasNormalMap';
var UNI_KEY_HAS_ROUGHNESS_MAP = 'hasRoughnessMap';

// PBRTexShader
var MATERIAL_TEXTURE_BOOLS = [UNI_KEY_HAS_ALBEDO_MAP, UNI_KEY_HAS_NORMAL_MAP, UNI_KEY_HAS_ROUGHNESS_MAP];
var MATERIAL_TEXTURE_MAPS = [UNI_KEY_ALBEDO_MAP, UNI_KEY_NORMAL_MAP, UNI_KEY_ROUGHNESS_MAP];

var NOISE_TYPE_HEIGHT = 'height';
var NOISE_TYPE_COLOR_HEIGHT_OFFSET = 'colorHeightOffset';
