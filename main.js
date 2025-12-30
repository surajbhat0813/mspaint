const canvas_body = document.getElementById("canvas-body");
const ctx = canvas_body.getContext("2d");
const fillColorPicker = document.getElementById("fill-color-picker");

// =========================
// Drawing properties
// =========================
let strokeColor = "#000000";
let fillColor = "#ff0000";
let lineWidth = 2;
let brushSize = 10;
let eraserSize = 20;

// =========================
// Drawing state
// =========================
let currentTool = "pencil";
let isDrawing = false;
let startX = null;
let startY = null;
let currentX = null;
let currentY = null;
let lastX = null;
let lastY = null;

// Canvas preview state
let savedImageData = null;

// =========================
// Canvas resize
// =========================
function resizeCanvas() {
  canvas_body.width = canvas_body.offsetWidth;
  canvas_body.height = canvas_body.offsetHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas_body.width, canvas_body.height);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// =========================
// Coordinate mapping
// =========================
function getCanvasCoordinates(event) {
  const rect = canvas_body.getBoundingClientRect();
  const scaleX = canvas_body.width / rect.width;
  const scaleY = canvas_body.height / rect.height;

  return {
    x: Math.round((event.clientX - rect.left) * scaleX),
    y: Math.round((event.clientY - rect.top) * scaleY),
  };
}

// =========================
// Canvas state helpers
// =========================
function saveCanvasState() {
  savedImageData = ctx.getImageData(0, 0, canvas_body.width, canvas_body.height);
}

function restoreCanvasState() {
  if (savedImageData) {
    ctx.putImageData(savedImageData, 0, 0);
  }
}

// =========================
// Tool selection
// =========================
function switchTool(toolName) {
  currentTool = toolName;

  document
    .querySelectorAll(".tool-item")
    .forEach((t) => t.classList.remove("active"));

  const toolElement = document.querySelector(`[data-tool="${toolName}"]`);
  if (toolElement) toolElement.classList.add("active");

  const cursors = {
    pencil: "crosshair",
    brush: "crosshair",
    eraser: "grab",
    line: "crosshair",
    rectangle: "crosshair",
    circle: "crosshair",
    fill: "grab",
    text: "text",
    eyedropper: "crosshair",
    select: "crosshair",
  };

  canvas_body.style.cursor = cursors[toolName] || "default";

  isDrawing = false;
  startX = startY = currentX = currentY = lastX = lastY = null;
  savedImageData = null;

const fillWrapper = document.querySelector(".fill-color-wrapper");
fillWrapper.style.display = toolName === "fill" ? "block" : "none";
}

// =========================
// Tool click handlers
// =========================
document.querySelectorAll(".tool-item").forEach((item) => {
  item.addEventListener("click", () => {
    switchTool(item.dataset.tool);
  });
});

// =========================
// Fill color picker
// =========================
fillColorPicker.addEventListener("input", (e) => {
  fillColor = e.target.value;
});

/* ======================================================
   POINTER EVENTS (mouse + touch + pen)
====================================================== */

// POINTER DOWN
canvas_body.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  canvas_body.setPointerCapture(event.pointerId);
  const { x, y } = getCanvasCoordinates(event);
  const twoClickTools = ["line", "rectangle", "circle"];

  // -------- Shapes --------
  if (twoClickTools.includes(currentTool)) {
    if (!isDrawing) {
      startX = x;
      startY = y;
      isDrawing = true;
      saveCanvasState();
    } else {
      restoreCanvasState();

      if (currentTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      } else if (currentTool === "rectangle") {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (currentTool === "circle") {
        const r = Math.hypot(x - startX, y - startY);
        ctx.beginPath();
        ctx.arc(startX, startY, r, 0, Math.PI * 2);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      isDrawing = false;
      startX = startY = null;
      savedImageData = null;
    }
  }

  // -------- Freehand --------
  else if (["pencil", "brush", "eraser"].includes(currentTool)) {
    isDrawing = true;
    lastX = x;
    lastY = y;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);

    ctx.strokeStyle =
      currentTool === "eraser" ? "#ffffff" : strokeColor;
    ctx.lineWidth =
      currentTool === "brush"
        ? brushSize
        : currentTool === "eraser"
        ? eraserSize
        : lineWidth;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    }
  }

  // -------- Fill --------
  else if (currentTool === "fill") {
    const imageData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
    const targetColor = [
      imageData.data[0],
      imageData.data[1],
      imageData.data[2],
      imageData.data[3],
    ];
    const fillColorArray = hexToRgba(fillColor);
    floodFill(x, y, targetColor, fillColorArray);
  }
});

// POINTER MOVE
canvas_body.addEventListener("pointermove", (event) => {
  if (!isDrawing) return;

  const { x, y } = getCanvasCoordinates(event);

  if (["line", "rectangle", "circle"].includes(currentTool)) {
    restoreCanvasState();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    if (currentTool === "line") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (currentTool === "rectangle") {
      ctx.strokeRect(startX, startY, x - startX, y - startY);
    } else if (currentTool === "circle") {
      const r = Math.hypot(x - startX, y - startY);
      ctx.beginPath();
      ctx.arc(startX, startY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (["pencil", "brush", "eraser"].includes(currentTool)) {
    ctx.lineTo(x, y);
    ctx.stroke();
  }
});

// POINTER END
function endPointer() {
  isDrawing = false;
  ctx.globalCompositeOperation = "source-over";
}

canvas_body.addEventListener("pointerup", endPointer);
canvas_body.addEventListener("pointerleave", endPointer);
canvas_body.addEventListener("pointercancel", endPointer);

// =========================
// Color helpers
// =========================
function hexToRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
}

// =========================
// Flood fill
// =========================
function floodFill(x, y, targetColor, fillColor) {
  const imageData = ctx.getImageData(
    0,
    0,
    canvas_body.width,
    canvas_body.height
  );
  const data = imageData.data;
  const width = canvas_body.width;
  const height = canvas_body.height;

  const stack = [[Math.floor(x), Math.floor(y)]];

  function getPixel(x, y) {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }

  function setPixel(x, y, c) {
    const i = (y * width + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = c[3];
  }

  function match(a, b) {
    return a.every((v, i) => v === b[i]);
  }

  while (stack.length) {
    const [px, py] = stack.pop();
    if (px < 0 || py < 0 || px >= width || py >= height) continue;
    if (!match(getPixel(px, py), targetColor)) continue;

    setPixel(px, py, fillColor);
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

// =========================
// Init
// =========================
switchTool("pencil");
