const canvas_body = document.getElementById("canvas-body");
const ctx = canvas_body.getContext("2d");

// Drawing properties
let strokeColor = "#000000";
let fillColor = "#000000";
let lineWidth = 2;
let brushSize = 10;
let eraserSize = 20;

// Drawing state
let currentTool = "pencil";
let isDrawing = false;
let startX = null;
let startY = null;
let currentX = null;
let currentY = null;
let lastX = null;
let lastY = null;

// Store the current drawing state for preview
let savedImageData = null;

// Text input state
let textInput = null;
let textStartX = null;
let textStartY = null;

// Set canvas internal size to match its display size
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

// Convert pointer position → canvas coordinates
function getCanvasCoordinates(event) {
  const rect = canvas_body.getBoundingClientRect();
  const scaleX = canvas_body.width / rect.width;
  const scaleY = canvas_body.height / rect.height;

  return {
    x: Math.round((event.clientX - rect.left) * scaleX),
    y: Math.round((event.clientY - rect.top) * scaleY),
  };
}

// Save / restore canvas state
function saveCanvasState() {
  savedImageData = ctx.getImageData(0, 0, canvas_body.width, canvas_body.height);
}

function restoreCanvasState() {
  if (savedImageData) {
    ctx.putImageData(savedImageData, 0, 0);
  }
}

// Tool selection
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

  if (textInput) {
    textInput.remove();
    textInput = null;
  }
}

// Tool click handlers
document.querySelectorAll(".tool-item").forEach((item) => {
  item.addEventListener("click", () => {
    switchTool(item.dataset.tool);
  });
});

/* ======================================================
   POINTER EVENTS (mouse + touch + pen)
====================================================== */

// POINTER DOWN
canvas_body.addEventListener("pointerdown", (event) => {
  // Only block non-left mouse clicks (touch/pen unaffected)
  if (event.pointerType === "mouse" && event.button !== 0) return;

  canvas_body.setPointerCapture(event.pointerId);

  const { x, y } = getCanvasCoordinates(event);

  const twoClickTools = ["line", "rectangle", "circle"];

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
  } else if (["pencil", "brush", "eraser"].includes(currentTool)) {
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
});

// POINTER MOVE
canvas_body.addEventListener("pointermove", (event) => {
  if (!isDrawing) return;

  const { x, y } = getCanvasCoordinates(event);
  currentX = x;
  currentY = y;

  if (["line", "rectangle", "circle"].includes(currentTool)) {
    restoreCanvasState();

    ctx.setLineDash([5, 5]);
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

    ctx.setLineDash([]);
  } else if (["pencil", "brush", "eraser"].includes(currentTool)) {
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  }
});

// POINTER UP / CANCEL
function endPointer() {
  isDrawing = false;
  lastX = lastY = null;
  ctx.globalCompositeOperation = "source-over";
}

canvas_body.addEventListener("pointerup", endPointer);
canvas_body.addEventListener("pointerleave", endPointer);
canvas_body.addEventListener("pointercancel", endPointer);

// Initialize
switchTool("pencil");
