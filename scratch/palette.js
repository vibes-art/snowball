var SORT_BY_HUE = true;
var PAD = 16;
var windowWidth = 0;
var windowHeight = 0;
var visCanvasSize = 0;
var paletteCanvas = null;
var paletteCtx = null;
var inputBox = null;

var COLORS_SOURCED = WN_ARTISAN;
var COLORS_CHOSEN = [];
var COLORS_MIXING = [];
var TOUCH_TILES = new XShapeField();
var MIX_MODE = 0;
var IS_MIXING = false;

var CONTROLS = [
  { label: "MIX" },
  { isColors: true },
  { isInput: true },
  { label: "ADD", isMix: true },
  { label: "LOG" },
  { label: "SPC", mixMode: 0 },
  { label: "RGB", mixMode: 1 },
  { label: "HSL", mixMode: 2 },
  { label: "LCH", mixMode: 3 }
];

window.onload = function () { initialize(); };

function initialize () {
  setRenderOptions();
  createElements();
  startRender();
  setResizeHandler();
  listenForClicks();
};

function setRenderOptions () {
  var body = document.body;
  body.style.overflow = 'hidden';

  windowWidth = max(body.clientWidth, window.innerWidth);
  windowHeight = max(body.clientHeight, window.innerHeight);

  var isLandscape = windowWidth > windowHeight;
  var windowSize = isLandscape ? windowHeight : windowWidth;
  visCanvasSize = windowSize;
};

function createElements () {
  paletteCanvas = document.createElement("canvas");
  paletteCanvas.style.position = "absolute";
  document.body.appendChild(paletteCanvas);
  paletteCtx = paletteCanvas.getContext("2d");

  inputBox = document.createElement("input");
  inputBox.type = "number";
  inputBox.min = "1";
  inputBox.value = "50";
  inputBox.max = "100";
  inputBox.style.position = "absolute";
  inputBox.style.top = "50px";
  inputBox.style.left = "10px";
  document.body.appendChild(inputBox);

  inputBox.addEventListener("input", () => {
    var value = inputBox.value;
    if (value !== "") {
      value = max(1, min(100, value));
      inputBox.value = value;
      resetRender();
    }
  });
};

function startRender () {
  if (SORT_BY_HUE) {
    COLORS_SOURCED.sort(XColorUtils.sortRGBByHue);
  }

  resizeVisibleCanvas();
  resetRender();
  printPaletteData(COLORS_SOURCED);
};

function resetRender () {
  TOUCH_TILES.shapes.length = 0;
  paletteCtx.fillStyle='#FFF';
  paletteCtx.fillRect(0, 0, visCanvasSize, visCanvasSize);
  renderColorSwatches(COLORS_SOURCED, PAD);
  renderControls(visCanvasSize / 3 + PAD);
  renderColorSwatches(COLORS_CHOSEN, 2 * visCanvasSize / 3 + PAD);
};

function renderColorSwatches (palette, startY) {
  var count = palette.length;
  var width = ceil(2 * sqrt(count));
  var height = ceil(count / width);
  var size = floor(min(visCanvasSize / 8, (visCanvasSize - 2 * PAD - 2 * width) / width));
  var border = size + 2;

  for (var row = 0; row < height; row++) {
    for (var col = 0; col < width; col++) {
      var index = row * width + col;
      if (index >= count) {
        continue;
      }

      var color = palette[index];
      var x = PAD + col * border;
      var y = startY + row * border;

      paletteCtx.fillStyle='#000';
      paletteCtx.fillRect(x, y, border, border);
      paletteCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
      paletteCtx.fillRect(x + 1, y + 1, size, size);

      var touchTile = new XRect({
        x: x + 1 + size / 2,
        z: y + 1 + size / 2,
        width: size,
        depth: size
      });
      touchTile.color = color;
      touchTile.isChosenColor = palette === COLORS_CHOSEN;
      TOUCH_TILES.addShape(touchTile);
    }
  }
};

function renderControls (startY) {
  var width = 5;
  var height = 2;
  var size = floor(0.5 * (visCanvasSize - 2 * PAD - 2 * width) / width);
  var border = size + 2;
  var startX = (visCanvasSize - 2 * PAD - width * size) / 2;

  for (var row = 0; row < height; row++) {
    for (var col = 0; col < width; col++) {
      var index = row * width + col;
      if (index >= CONTROLS.length) continue;

      var controlConfig = CONTROLS[index];
      var color = MIXING_WHITE;
      var x = startX + col * border;
      var y = startY + row * border;

      if (controlConfig.isInput) {
        var inputWidth = floor(size / 2);
        var inputHeight = floor(size / 4);
        inputBox.style.left = `${x + 1 + inputWidth / 2}px`;
        inputBox.style.top = `${y + 1 + 3.5 * inputHeight}px`;
        inputBox.style.width = `${inputWidth}px`;
        inputBox.style.height = `${inputHeight}px`;
      } else if (controlConfig.isColors) {
        paletteCtx.fillStyle = '#000';
        paletteCtx.fillRect(x, y, border, border / 2);
        color = COLORS_MIXING[0] || color;
        paletteCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
        paletteCtx.fillRect(x + 1, y + 1, size, floor(size / 2));
        color = MIXING_WHITE;
        paletteCtx.fillStyle = '#000';
        paletteCtx.fillRect(x, y + border / 2, border, border / 2);
        color = COLORS_MIXING[1] || color;
        paletteCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
        paletteCtx.fillRect(x + 1, y + 1 + border / 2, size, floor(size / 2));
      } else {
        if (controlConfig.label === "MIX" && IS_MIXING) {
          color = { r: 255 - color.r, g: 255 - color.g, b: 255 - color.b };
        } else if (controlConfig.label === "ADD") {
          var mixPct = (+inputBox.value) / 100;
          var color0 = COLORS_MIXING[0] || color;
          var color1 = COLORS_MIXING[1] || color;
          color0 = [color0.r / 255, color0.g / 255, color0.b / 255];
          color1 = [color1.r / 255, color1.g / 255, color1.b / 255];

          switch (MIX_MODE) {
            case 0: color = XColorUtils.smashColorsSpectral(color0, color1, mixPct); break;
            case 1: color = XColorUtils.smashColorsRGB(color0, color1, mixPct); break;
            case 2: color = XColorUtils.smashColorsHSL(color0, color1, mixPct); break;
            case 3: color = XColorUtils.smashColorsLCH(color0, color1, mixPct); break;
          }

          color = { r: floor(255 * color[0]), g: floor(255 * color[1]), b: floor(255 * color[2]) };
        }

        if (controlConfig.mixMode === MIX_MODE && IS_MIXING) {
          color = { r: 255 - color.r, g: 255 - color.g, b: 255 - color.b };
        }

        paletteCtx.fillStyle = '#000';
        paletteCtx.fillRect(x, y, border, border);
        paletteCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
        paletteCtx.fillRect(x + 1, y + 1, size, size);

        if (controlConfig.label) {
          paletteCtx.fillStyle = `rgba(${255 - color.r}, ${255 - color.g}, ${255 - color.b}, 1)`;
          paletteCtx.font = '16px Arial';
          paletteCtx.textAlign = 'center';
          paletteCtx.textBaseline = 'middle';
          paletteCtx.fillText(controlConfig.label, x + border / 2, y + border / 2);
        }
  
        var touchTile = new XRect({
          x: x + 1 + size / 2,
          z: y + 1 + size / 2,
          width: size,
          depth: size
        });
        touchTile.color = color;
        touchTile.isChosenColor = false;
        touchTile.controlConfig = controlConfig;
        TOUCH_TILES.addShape(touchTile);
      }
    }
  }
};

var resizeCallback = null;
function setResizeHandler () {
  window.removeEventListener('resize', resizeCallback, true);

  resizeCallback = function () {
    setRenderOptions();
    startRender();
  };

  window.addEventListener('resize', resizeCallback, true);
};

function listenForClicks () {
  paletteCanvas.addEventListener("mousedown", (event) => {
    var x = event.offsetX;
    var z = event.offsetY;
    var touchTile = TOUCH_TILES.getCollidingShape(x, z);
    if (touchTile) {
      var controlConfig = touchTile.controlConfig;
      if (controlConfig) {
        switch (controlConfig.label) {
          case "MIX": IS_MIXING = !IS_MIXING; break;
          case "ADD": COLORS_CHOSEN.push(touchTile.color); logAndCopyColor(touchTile.color, false); break;
          case "LOG": printPaletteData(COLORS_CHOSEN); break;
          default: if (controlConfig.mixMode !== undefined) MIX_MODE = controlConfig.mixMode; break;
        }
      } else {
        var color = touchTile.color;
        var index = COLORS_CHOSEN.indexOf(color);
        var wasRemoved = false;

        if (IS_MIXING) {
          if (COLORS_MIXING.length === 2) COLORS_MIXING.shift();
          COLORS_MIXING.push(color);
        } else {
          if (index === -1) {
            COLORS_CHOSEN.push(color);
          } else if (touchTile.isChosenColor) {
            wasRemoved = true;
            COLORS_CHOSEN.splice(index, 1);
          }
        }

        logAndCopyColor(color, wasRemoved);
      }

      resetRender();
    }
  });
};

function logAndCopyColor (color, wasRemoved) {
  var text = JSON.stringify(color);
  text = text.replace(new RegExp('":', 'g'), ': ');
  text = text.replace(new RegExp('"', 'g'), ' ');
  text = text.replace(new RegExp('}', 'g'), ' }');
  navigator.clipboard.writeText(text)
    .then(() => console.log(text + (wasRemoved ? ' removed.' : '')))
    .catch(err => console.error('Error copying text: ', text, err));
};

function resizeVisibleCanvas () {
  var x = floor((windowWidth - visCanvasSize) / 2);
  var y = floor((windowHeight - visCanvasSize) / 2);

  paletteCanvas.style.left = x + "px";
  paletteCanvas.style.top = y + "px";
  paletteCanvas.width = visCanvasSize;
  paletteCanvas.height = visCanvasSize;
};

function printPaletteData (palette) {
  var output = '';
  for (var i = 0; i < palette.length; i++) {
    var colorData = palette[i];
    var r = round(colorData.r);
    var g = round(colorData.g);
    var b = round(colorData.b);
    var w = 1;
    var color = `{ r: ${r}, g: ${g}, b: ${b}, weight: ${w} }`;
    output += `  ${color},\n`;
  }

  console.log("___ RGB ___");
  console.log(output);
  console.log(`count: ${palette.length}`);
};
