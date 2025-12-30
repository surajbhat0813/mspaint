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

  // Enable image smoothing for smooth rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Clear and set white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas_body.width, canvas_body.height);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Helper function to get canvas coordinates (rounded to integers for crisp pixels)
function getCanvasCoordinates(event) {
  const rect = canvas_body.getBoundingClientRect();
  const scaleX = canvas_body.width / rect.width;
  const scaleY = canvas_body.height / rect.height;

  return {
    x: Math.round((event.clientX - rect.left) * scaleX),
    y: Math.round((event.clientY - rect.top) * scaleY),
  };
}

// Save current canvas state
function saveCanvasState() {
  savedImageData = ctx.getImageData(
    0,
    0,
    canvas_body.width,
    canvas_body.height
  );
}

// Restore canvas state (for preview)
function restoreCanvasState() {
  if (savedImageData) {
    ctx.putImageData(savedImageData, 0, 0);
  }
}

// Flood fill function
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
  const target = [
    Math.floor(targetColor[0]),
    Math.floor(targetColor[1]),
    Math.floor(targetColor[2]),
    Math.floor(targetColor[3]),
  ];
  const fill = [
    Math.floor(fillColor[0]),
    Math.floor(fillColor[1]),
    Math.floor(fillColor[2]),
    Math.floor(fillColor[3]),
  ];

  function getPixel(x, y) {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  }

  function setPixel(x, y, color) {
    const index = (y * width + x) * 4;
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = color[3];
  }

  function colorsMatch(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }

  while (stack.length > 0) {
    const [px, py] = stack.pop();

    if (px < 0 || px >= width || py < 0 || py >= height) continue;

    const currentColor = getPixel(px, py);
    if (!colorsMatch(currentColor, target) || colorsMatch(currentColor, fill))
      continue;

    let left = px;
    while (left > 0 && colorsMatch(getPixel(left - 1, py), target)) {
      left--;
    }

    let right = px;
    while (right < width - 1 && colorsMatch(getPixel(right + 1, py), target)) {
      right++;
    }

    for (let i = left; i <= right; i++) {
      setPixel(i, py, fill);
      if (py > 0 && colorsMatch(getPixel(i, py - 1), target)) {
        stack.push([i, py - 1]);
      }
      if (py < height - 1 && colorsMatch(getPixel(i, py + 1), target)) {
        stack.push([i, py + 1]);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}




// Tool selection
function switchTool(toolName) {
  currentTool = toolName;

  // Update UI
  // finds all tool items and removes the 'active' class from them
  document
    .querySelectorAll(".tool-item")
    .forEach((t) => t.classList.remove("active"));

  const toolElement = document.querySelector(`[data-tool="${toolName}"]`);
  if (toolElement) {
    // attaches active class to the selected tool using the toolname which was received in props
    toolElement.classList.add("active");
  }

  // Change cursor based on tool
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
  // sets the cursor style of the canvas based on the selected tool
  // Data structure: Hash table / Hash map
  // Operation: Lookup by key
  // Key-based lookup or hash lookup where O(1) and space complexity O(n),Each key and value takes memory
  canvas_body.style.cursor = cursors[toolName] || "default";

  // Reset drawing state when switching tools
  isDrawing = false;
  startX = null;
  startY = null;
  currentX = null;
  currentY = null;
  lastX = null;
  lastY = null;
  savedImageData = null;

  // Remove text input if exists
  if (textInput) {
    textInput.remove();
    textInput = null;
  }


}

// Add click handlers to all tool items

// use query selectorAll to find all elements with the class 'tool-item' and attach click event listeners to them
// and there we have the get attribute method to get the data-tool attribute value of the clicked item
// data-tool attribute is used to identify which tool was clicked
// and it was made using data prefix to store custom data private to the page or application

document.querySelectorAll(".tool-item").forEach((item) => {
  item.addEventListener("click", () => {
    switchTool(item.getAttribute("data-tool"));
  });
});



// Mouse down - start drawing
canvas_body.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return; // Only left click allowed
// | Value | Mouse button   |
// | ----- | -------------- |
// | `0`   | Left click     |
// | `1`   | Middle (wheel) |
// | `2`   | Right click    |



  const coords = getCanvasCoordinates(event);
  const x = coords.x;
  const y = coords.y;

  // Tools that need two clicks (line, rectangle, circle)
  const twoClickTools = ["line", "rectangle", "circle"];

  if (twoClickTools.includes(currentTool)) {
    if (!isDrawing) {
      // First click - store start point
      startX = x;
      startY = y;
      isDrawing = true;
      saveCanvasState();
    } else {
      // Second click - draw final shape
      const endX = x;
      const endY = y;

      restoreCanvasState();

      if (currentTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      } else if (currentTool === "rectangle") {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (currentTool === "circle") {
        const radius = Math.sqrt(
          Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
        );
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      // Reset for next shape
      isDrawing = false;
      startX = null;
      startY = null;
      savedImageData = null;
    }
  }
  // Freehand drawing tools (pencil, brush, eraser)
  else if (["pencil", "brush", "eraser"].includes(currentTool)) {
    isDrawing = true;
    // Round coordinates for crisp pixels
    lastX = Math.round(x);
    lastY = Math.round(y);

    if (currentTool === "pencil") {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else if (currentTool === "brush") {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else if (currentTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = eraserSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "destination-out";
    }
  }
  // Fill tool
  else if (currentTool === "fill") {
    const imageData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
    const targetColor = [
      imageData.data[0],
      imageData.data[1],
      imageData.data[2],
      imageData.data[3],
    ];
    const fillColorArray = hexToRgba(strokeColor);
    floodFill(x, y, targetColor, fillColorArray);
  }
  // Text tool
  else if (currentTool === "text") {
    textStartX = x;
    textStartY = y;
    createTextInput(x, y);
  }
  // Eyedropper tool
  else if (currentTool === "eyedropper") {
    const imageData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
    const r = imageData.data[0];
    const g = imageData.data[1];
    const b = imageData.data[2];
    strokeColor = rgbToHex(r, g, b);
  }
  // Select tool
  else if (currentTool === "select") {
    startX = x;
    startY = y;
    isDrawing = true;
    saveCanvasState();
  }
});

// Mouse move - drawing and preview
canvas_body.addEventListener("mousemove", (event) => {
  const coords = getCanvasCoordinates(event);
  currentX = coords.x;
  currentY = coords.y;

  // Preview for two-click tools
  if (
    ["line", "rectangle", "circle"].includes(currentTool) &&
    isDrawing &&
    startX !== null &&
    startY !== null
  ) {
    restoreCanvasState();

    if (currentTool === "line") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (currentTool === "rectangle") {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      ctx.setLineDash([]);
    } else if (currentTool === "circle") {
      const radius = Math.sqrt(
        Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)
      );
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // Freehand drawing - ensure integer coordinates for crisp pixels
  else if (["pencil", "brush", "eraser"].includes(currentTool) && isDrawing) {
    if (lastX !== null && lastY !== null) {
      // Round coordinates for crisp pixels
      const roundedX = Math.round(currentX);
      const roundedY = Math.round(currentY);
      const roundedLastX = Math.round(lastX);
      const roundedLastY = Math.round(lastY);

      ctx.lineTo(roundedX, roundedY);
      ctx.stroke();
    }
    lastX = currentX;
    lastY = currentY;
  }
  // Select tool preview
  else if (
    currentTool === "select" &&
    isDrawing &&
    startX !== null &&
    startY !== null
  ) {
    restoreCanvasState();
    ctx.strokeStyle = "#0066ff";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    ctx.setLineDash([]);
  }
});

// Mouse up - finish drawing
canvas_body.addEventListener("mouseup", (event) => {
  if (["pencil", "brush", "eraser"].includes(currentTool)) {
    isDrawing = false;
    lastX = null;
    lastY = null;
    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "source-over";
    }
  } else if (currentTool === "select" && isDrawing) {
    // Selection is complete, you could add selection logic here
    isDrawing = false;
    startX = null;
    startY = null;
    savedImageData = null;
  }
});

// Mouse leave canvas - cancel preview if drawing
canvas_body.addEventListener("mouseleave", () => {
  if (
    ["line", "rectangle", "circle", "select"].includes(currentTool) &&
    isDrawing
  ) {
    restoreCanvasState();
    currentX = null;
    currentY = null;
  } else if (["pencil", "brush", "eraser"].includes(currentTool)) {
    isDrawing = false;
    lastX = null;
    lastY = null;
    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "source-over";
    }
  }
});

// Helper functions for color conversion
function hexToRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

// Create text input
function createTextInput(x, y) {
  // Remove existing text input
  if (textInput) {
    textInput.remove();
  }

  textInput = document.createElement("input");
  textInput.type = "text";
  textInput.style.position = "absolute";
  textInput.style.left =
    canvas_body.getBoundingClientRect().left +
    (x * canvas_body.getBoundingClientRect().width) / canvas_body.width +
    "px";
  textInput.style.top =
    canvas_body.getBoundingClientRect().top +
    (y * canvas_body.getBoundingClientRect().height) / canvas_body.height +
    "px";
  textInput.style.border = "1px solid #000";
  textInput.style.padding = "2px 5px";
  textInput.style.fontSize = "16px";
  textInput.style.fontFamily = "Arial";
  textInput.style.outline = "none";
  textInput.style.zIndex = "1000";

  textInput.addEventListener("blur", () => {
    if (textInput.value) {
      ctx.fillStyle = strokeColor;
      ctx.font = "16px Arial";
      ctx.fillText(textInput.value, textStartX, textStartY);
    }
    textInput.remove();
    textInput = null;
  });

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      textInput.blur();
    }
  });

  document.body.appendChild(textInput);
  textInput.focus();
}

// Initialize with pencil tool
switchTool("pencil");
