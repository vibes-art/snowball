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
var ZERO_LENGTH = 1e-8;

var PI = Math.PI;
var TAU = 2 * PI;
var GLD = (1 + sqrt(5)) / 2;
var GLD_RECT = 1 / GLD;

var IS_MOBILE = false;
var IS_IOS = false;
var IS_HEADLESS = false;

function detectDevicePerformance () {
  var isMobile = false;
  var deviceMemory = navigator.deviceMemory || 4;
  var isLowMemory = deviceMemory < 1;

  if (navigator.userAgentData) {
    isMobile = navigator.userAgentData.mobile;
  } else {
    if (navigator.maxTouchPoints > 1) {
      isMobile = true;
    } else {
      isMobile = /Mobi|Android/i.test(navigator.userAgent);
    }
  }

  IS_MOBILE = isMobile;
  IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  IS_HEADLESS = /\bHeadlessChrome\//.test(navigator.userAgent);

  ENABLE_LOGS && console.log(`IS_MOBILE: ${IS_MOBILE}, Mobile detection: ${isMobile}, Memory (GB): ${deviceMemory}`);
};

detectDevicePerformance();

var ENABLE_LOGS = true;
var DEBUG_LOGS = ENABLE_LOGS && false;
var DEBUG_LIGHTS = false;
var VERBOSE = false;
var SHOW_NORMAL_MAPS = false;
var USE_PBR = true;
var USE_MSAA = false;
var USE_FLOATING_POINT_TEXTURES = true;
var ENABLE_COLOR_BUFFER_FLOAT = true;
var ENABLE_COLOR_BUFFER_HALF_FLOAT = true;
var ENABLE_FOG = true;
var ENABLE_SHADOWS = true;
var ENABLE_TONE_MAPPING = false;
var ENABLE_HDR = true;

var CAMERA_FOV = 45 * PI / 180;
var CAMERA_Z_NEAR = 0.1;
var CAMERA_Z_FAR = 100.0;
var UP_VECTOR = [0, 1, 0];
var AA_SUPERSAMPLE = 4;
var AMBIENT_LIGHT = [0.8, 0.8, 0.8];
var MAX_DIR_LIGHTS = 1;
var MAX_SPOT_LIGHTS = 3;
var MAX_POINT_LIGHTS = 9;
var SHADOW_MAP_SIZE = 4096;
var ATTEN_CONST = 1.0;
var SHARED_TEXTURE_UNIT = 0;
var BASE_SCENE_TEXTURE_UNIT = 1;
var NO_SHADER_LOCATION = -1;

var DIM_X = 0;
var DIM_Z = 1;
var QUILT_RECURSION_CHANCE = 0.8;
var QUILT_RECURSION_DECREMENT = 0.1;

var PRECISION = IS_MOBILE ? 'lowp' : 'highp';
var RENDER_PASS_SHADOWS = 'shadows';
var RENDER_PASS_MAIN = 'main';
var RENDER_PASS_UI = 'ui';
var RENDER_PASS_ANTIALIAS = 'antialias';
var RENDER_PASS_BLOOM_EXTRACT = 'bloomExtract';
var RENDER_PASS_BLOOM_BLUR_HORZ = 'bloomBlurHorz';
var RENDER_PASS_BLOOM_BLUR_VERT = 'bloomBlurVert';
var RENDER_PASS_COMBINE_BLOOM = 'combineBloom';

var ATTR_KEY_POSITIONS = 'positions';
var ATTR_KEY_NORMALS = 'normals';
var ATTR_KEY_COLORS = 'colors';
var ATTR_KEY_TEX_COORDS = 'texCoords';
var ATTR_KEY_TANGENTS = 'tangents';

var UNI_TYPE_FLOAT = 0;
var UNI_TYPE_INT = 1;
var UNI_TYPE_UINT = 2;
var UNI_TYPE_MATRIX = 3;
var UNI_TYPE_TEXTURE = 4;

// shader uniform keys
var UNI_KEY_PROJ_MATRIX = 'projectionMatrix';
var UNI_KEY_MODEL_MATRIX = 'modelMatrix';
var UNI_KEY_VIEW_MATRIX = 'viewMatrix';
var UNI_KEY_NORMAL_MATRIX = 'normalMatrix';
var UNI_KEY_RESOLUTION = 'resolution';
var UNI_KEY_AMBIENT_LIGHT = 'ambient';
var UNI_KEY_BACKGROUND_LIGHT = 'background';
var UNI_KEY_DIR_LIGHT = 'dirLight';
var UNI_KEY_SPOT_LIGHT = 'spotLight';
var UNI_KEY_POINT_LIGHT = 'pointLight';
var UNI_KEY_SPECULAR_SHININESS = 'specularShininess';
var UNI_KEY_SPECULAR_STRENGTH = 'specularStrength';
var UNI_KEY_FOG_COLOR = 'fogColor';
var UNI_KEY_FOG_DENSITY = 'fogDensity';
var UNI_KEY_ATTEN_CONST = 'attenConst';
var UNI_KEY_BASE_COLOR = 'baseColor';
var UNI_KEY_EMISSIVE_COLOR = 'emissiveColor';
var UNI_KEY_METALLIC = 'metallic';
var UNI_KEY_ROUGHNESS = 'roughness';
var UNI_KEY_ALBEDO_MAP = 'albedoMap';
var UNI_KEY_NORMAL_MAP = 'normalMap';
var UNI_KEY_ROUGHNESS_MAP = 'roughnessMap';
var UNI_KEY_SOURCE_TEXTURE = `sourceTexture`;
var UNI_KEY_COLORS_TEXTURE = `${ATTR_KEY_COLORS}Texture`;
var UNI_KEY_THRESHOLD = 'threshold';
var UNI_KEY_COMBINE_TEXTURE = 'combineTexture';
var UNI_KEY_INTENSITY = 'intensity';
var UNI_KEY_TEXTURE_SIZE = 'textureSize';
var UNI_KEY_EXPOSURE = 'exposure';
var UNI_KEY_THICKNESS = 'thickness';
var UNI_KEY_SOFTNESS = 'softness';

var NOISE_TYPE_HEIGHT = 'height';
var NOISE_TYPE_COLOR_HEIGHT_OFFSET = 'colorHeightOffset';
