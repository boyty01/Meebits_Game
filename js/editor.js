// --- NES constants ---
const NES_WIDTH_TILES  = 32;
const NES_HEIGHT_TILES = 30;

const TILE_SIZE = 8;          // 8x8 px
const META_SIZE = 16;         // 16x16 px (2x2 tiles)

// Derived
const NES_WIDTH_PX  = NES_WIDTH_TILES * TILE_SIZE;   // 256
const NES_HEIGHT_PX = NES_HEIGHT_TILES * TILE_SIZE;  // 240

// key tracking
const keys = {
  Shift: false
};

// --- Editor modes ---
const EditorMode = Object.freeze({
  TILE: 'tile',      // 32x30
  META: 'meta',      // 16x15
  COLLISION: 'collision',  // Paint collision
  ENTITY: 'entity'   // Place entities
});

const editorState = {
  mode: EditorMode.META,
  currentScreen: 0,  // Current screen index
  baseMode: EditorMode.META  // Track whether we're in TILE or META for collision/entity modes
};

// Multi-screen level data storage
// Key: screen index, Value: { tiles, collision, entities }
let levelScreens = {
  0: createScreenData()
};

// --- UI wiring ---
const tileBtn = document.getElementById('mode-tile');
const metaBtn = document.getElementById('mode-meta');
const collisionBtn = document.getElementById('mode-collision');
const entityBtn = document.getElementById('mode-entity');

// --- Canvas setup ---
const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');

// Internal resolution = NES resolution
canvas.width  = NES_WIDTH_PX;
canvas.height = NES_HEIGHT_PX;

// Disable smoothing for pixel accuracy
ctx.imageSmoothingEnabled = false;

// --- Mouse state ---
const mouseState = {
  col: -1,
  row: -1,
  isDrawing: false  // Add this
};

// Add mousedown handler
canvas.addEventListener('mousedown', (e) => {
  mouseState.isDrawing = true;
  // Trigger initial paint
  const evt = new MouseEvent('click');
  canvas.dispatchEvent(evt);
});

// Add mouseup handlers
canvas.addEventListener('mouseup', () => {
  mouseState.isDrawing = false;
});

document.addEventListener('mouseup', () => {
  mouseState.isDrawing = false;
});


// --- Palette state ---
let selectedTileID = 1;
let selectedEntityType = 'enemy1'; // Default entity type

const EntityTypes = Object.freeze({
  ENEMY1: 'enemy1',
//  ENEMY2: 'enemy2',
  GOAL:`goal`,
  COLLECTIBLE: 'collectible',
  BREAKABLE: 'breakable'
});

const EntityColors = {
  enemy1: { bg: 'rgba(255, 100, 100, 0.8)', label: 'E1' },
  goal: { bg: 'rgba(0, 255, 85, 0.8)', label: 'G' },
  collectible: { bg: 'rgba(255, 215, 0, 0.8)', label: 'C' },
  breakable: { bg: 'rgba(150, 100, 200, 0.8)', label: 'B' }
};

// --- Sprite sheet setup ---
const spriteSheet = new Image();
spriteSheet.src = 'tilesets/Assets_City.png';

const TILE_SIZE_PIXELS = 16;   // actual sprite size
const TILE_SPACING = 0;        // if your sheet has 1px spacing, put 1

// Calculate sprite position from tile ID dynamically
function getTileSpritePos(tileID) {
  if (!spriteSheet.complete) return null;
  
  const sheetCols = spriteSheet.width / TILE_SIZE_PIXELS;
  const index = tileID - 1; // tileID starts at 1
  const col = index % sheetCols;
  const row = Math.floor(index / sheetCols);
  
  return {
    x: col * TILE_SIZE_PIXELS,
    y: row * TILE_SIZE_PIXELS,
    w: TILE_SIZE_PIXELS,
    h: TILE_SIZE_PIXELS
  };
}

// --- Palette setup for 16x16 tiles ---
const palette = document.getElementById('palette');

// After spriteSheet is loaded
spriteSheet.onload = () => {
  const sheetCols = spriteSheet.width / TILE_SIZE_PIXELS;
  const sheetRows = spriteSheet.height / TILE_SIZE_PIXELS;

  palette.innerHTML = ''; // clear old buttons

  for (let row = 0; row < sheetRows; row++) {
    for (let col = 0; col < sheetCols; col++) {
      const tileID = row * sheetCols + col + 1; // unique tile ID
      const btn = document.createElement('button');
      btn.classList.add('palette-tile');

      const preview = document.createElement('canvas');
      preview.width = 32;  // scaled for visibility
      preview.height = 32;
      btn.appendChild(preview);

      const ctx2 = preview.getContext('2d');
      ctx2.imageSmoothingEnabled = false;

      // Draw the correct tile portion
      ctx2.drawImage(
        spriteSheet,
        col * TILE_SIZE_PIXELS,
        row * TILE_SIZE_PIXELS,
        TILE_SIZE_PIXELS,
        TILE_SIZE_PIXELS,
        0, 0,
        preview.width,
        preview.height
      );

      // Tile selection
      btn.addEventListener('click', () => {
        selectedTileID = tileID;
        document.querySelectorAll('.palette-tile').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });

      if (tileID === 1) btn.classList.add('active'); // default first tile

      palette.appendChild(btn);
    }
  }

  // Update palette grid columns dynamically
  palette.style.gridTemplateColumns = `repeat(${sheetCols}, 36px)`; // 32px preview + 4px gap
  
  drawGrid();
};

// --- Helpers ---
function getGridDimensions() {
  // Use baseMode to determine grid size for collision/entity modes
  const modeToUse = (editorState.mode === EditorMode.COLLISION || editorState.mode === EditorMode.ENTITY) 
    ? editorState.baseMode 
    : editorState.mode;
    
  if (modeToUse === EditorMode.TILE) {
    return {
      cols: NES_WIDTH_TILES,
      rows: NES_HEIGHT_TILES,
      cellSize: TILE_SIZE
    };
  }

  // META mode
  return {
    cols: NES_WIDTH_TILES / 2,   // 16
    rows: NES_HEIGHT_TILES / 2,  // 15
    cellSize: META_SIZE
  };
}

function getCurrentScreenData() {
  if (!levelScreens[editorState.currentScreen]) {
    levelScreens[editorState.currentScreen] = createScreenData();
  }
  return levelScreens[editorState.currentScreen];
}

function getCurrentLevelData() {
  const screenData = getCurrentScreenData();
  return editorState.baseMode === EditorMode.TILE ? screenData.tiles : screenData.metaTiles;
}

function getCurrentCollisionData() {
  const screenData = getCurrentScreenData();
  return editorState.baseMode === EditorMode.TILE ? screenData.collision : screenData.metaCollision;
}

function getCurrentEntityData() {
  const screenData = getCurrentScreenData();
  return editorState.baseMode === EditorMode.TILE ? screenData.entities : screenData.metaEntities;
}

function setMode(mode) {
  // Track base mode (TILE or META) separately from overlay modes (COLLISION, ENTITY)
  if (mode === EditorMode.TILE || mode === EditorMode.META) {
    editorState.baseMode = mode;
  }
  
  editorState.mode = mode;

  tileBtn.classList.toggle('active', mode === EditorMode.TILE);
  metaBtn.classList.toggle('active', mode === EditorMode.META);
  collisionBtn.classList.toggle('active', mode === EditorMode.COLLISION);
  entityBtn.classList.toggle('active', mode === EditorMode.ENTITY);
  
  // Show/hide palette based on mode
  const palette = document.getElementById('palette');
  const entityPalette = document.getElementById('entity-palette');
  const collisionInstructions = document.getElementById('collision-instructions');
  const entityInstructions = document.getElementById('entity-instructions');
  
  // Remove old instructions if they exist
  if (collisionInstructions) collisionInstructions.remove();
  if (entityInstructions) entityInstructions.remove();
  
  if (mode === EditorMode.COLLISION) {
    palette.style.display = 'none';
    if (entityPalette) entityPalette.style.display = 'none';
    
    // Create collision instructions
    createInstructionPanel('collision-instructions', [
      '🖱️ Click & Drag: Paint collision',
      '⇧ Shift + Drag: Erase collision',
      '📦 Red tiles = solid/blocked',
      '⬜ Empty = passable'
    ]);
    
  } else if (mode === EditorMode.ENTITY) {
    palette.style.display = 'none';
    if (!entityPalette) {
      createEntityPalette();
    } else {
      entityPalette.style.display = 'grid';
    }
    
    // Create entity instructions
    createInstructionPanel('entity-instructions', [
      '🖱️ Click & Drag: Place entities',
      '⇧ Shift + Drag: Remove entities',
      '👆 Select entity type from palette',
      '📍 One entity per cell'
    ]);
    
  } else {
    palette.style.display = 'grid';
    if (entityPalette) entityPalette.style.display = 'none';
  }
  
  drawGrid();
  updateScreenIndicator();
}

tileBtn.addEventListener('click', () => setMode(EditorMode.TILE));
metaBtn.addEventListener('click', () => setMode(EditorMode.META));
collisionBtn.addEventListener('click', () => setMode(EditorMode.COLLISION));
entityBtn.addEventListener('click', () => setMode(EditorMode.ENTITY));

// Init
setMode(EditorMode.META);

canvas.addEventListener('mousemove', (e) => {
  updateHoverCell(e);
 // Paint if mouse is down
  if (mouseState.isDrawing && mouseState.col !== -1 && mouseState.row !== -1) {
    paintCell(mouseState.col, mouseState.row);
  }
  
  drawGrid();
});

canvas.addEventListener('mouseleave', () => {
  mouseState.col = -1;
  mouseState.row = -1;
  drawGrid();
});

// Placeholder clear
function clearCanvas() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

clearCanvas();

// Extract paint logic into function
// Update paintCell function
function paintCell(col, row) {
  if (editorState.mode === EditorMode.COLLISION) {
    const collisionData = getCurrentCollisionData();
    collisionData[row][col] = !keys.Shift;  // Shift = erase, no Shift = paint
  } else if (editorState.mode === EditorMode.ENTITY) {
    const entityData = getCurrentEntityData();
    const existingIndex = entityData.findIndex(e => e.col === col && e.row === row);
    
    if (keys.Shift) {
      // Shift held = remove entity
      if (existingIndex >= 0) {
        entityData.splice(existingIndex, 1);
      }
    } else {
      // No shift = add entity
      if (existingIndex < 0) {
        entityData.push({
          type: selectedEntityType,
          col: col,
          row: row,
          properties: {}
        });
      }
    }
  } else {
    const levelData = getCurrentLevelData();
    levelData[row][col] = selectedTileID;
  }
}

// --- Grid rendering ---
function drawGrid() {
  clearCanvas();

  const { cols, rows, cellSize } = getGridDimensions();
  
  if (editorState.mode === EditorMode.COLLISION) {
    drawCollisionGrid(cols, rows, cellSize);
  } else if (editorState.mode === EditorMode.ENTITY) {
    drawEntityGrid(cols, rows, cellSize);
  } else {
    drawTileGrid(cols, rows, cellSize);
  }

  // Draw grid lines
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    const x = c * cellSize;
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * cellSize;
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
  }
  ctx.stroke();

  // Hover overlay
  drawHover();
}

function drawTileGrid(cols, rows, cellSize) {
  const levelData = getCurrentLevelData();
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = levelData[r][c];
      if (tile !== null) {
        const sprite = getTileSpritePos(tile);
        if (sprite && spriteSheet.complete) {
          ctx.drawImage(
            spriteSheet,
            sprite.x, sprite.y, sprite.w, sprite.h,
            c * cellSize,
            r * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }
  }
}

function drawCollisionGrid(cols, rows, cellSize) {
  const levelData = getCurrentLevelData();
  const collisionData = getCurrentCollisionData();
  
  // Draw tiles first (semi-transparent)
  ctx.globalAlpha = 0.5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = levelData[r][c];
      if (tile !== null) {
        const sprite = getTileSpritePos(tile);
        if (sprite && spriteSheet.complete) {
          ctx.drawImage(
            spriteSheet,
            sprite.x, sprite.y, sprite.w, sprite.h,
            c * cellSize,
            r * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }
  }
  ctx.globalAlpha = 1.0;
  
  // Draw collision overlay
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (collisionData[r][c]) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(
          c * cellSize,
          r * cellSize,
          cellSize,
          cellSize
        );
        
        // Draw X pattern
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c * cellSize, r * cellSize);
        ctx.lineTo((c + 1) * cellSize, (r + 1) * cellSize);
        ctx.moveTo((c + 1) * cellSize, r * cellSize);
        ctx.lineTo(c * cellSize, (r + 1) * cellSize);
        ctx.stroke();
      }
    }
  }
}

function drawEntityGrid(cols, rows, cellSize) {
  const levelData = getCurrentLevelData();
  const entityData = getCurrentEntityData();
  
  // Draw tiles first (semi-transparent)
  ctx.globalAlpha = 0.3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = levelData[r][c];
      if (tile !== null) {
        const sprite = getTileSpritePos(tile);
        if (sprite && spriteSheet.complete) {
          ctx.drawImage(
            spriteSheet,
            sprite.x, sprite.y, sprite.w, sprite.h,
            c * cellSize,
            r * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }
  }
  ctx.globalAlpha = 1.0;
  
  // Draw entities
  entityData.forEach(entity => {
    const x = entity.col * cellSize;
    const y = entity.row * cellSize;
    const entityStyle = EntityColors[entity.type];
    
    // Draw entity background
    ctx.fillStyle = entityStyle.bg;
    ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    
    // Draw border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    
    // Draw label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entityStyle.label, x + cellSize / 2, y + cellSize / 2);
  });
}

// --- Mouse helpers ---
function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: Math.floor((evt.clientX - rect.left) * scaleX),
    y: Math.floor((evt.clientY - rect.top) * scaleY)
  };
}

function updateHoverCell(evt) {
  const { x, y } = getMousePos(evt);
  const { cols, rows, cellSize } = getGridDimensions();

  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);

  if (col < 0 || col >= cols || row < 0 || row >= rows) {
    mouseState.col = -1;
    mouseState.row = -1;
    return;
  }

  mouseState.col = col;
  mouseState.row = row;
}

// --- Hover rendering ---
function drawHover() {
  if (mouseState.col === -1) return;

  const { cellSize } = getGridDimensions();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(
    mouseState.col * cellSize,
    mouseState.row * cellSize,
    cellSize,
    cellSize
  );
}

// --- Level data ---
function createLevelData(cols, rows) {
  if (!cols || !rows) {
    const dims = getGridDimensions();
    cols = dims.cols;
    rows = dims.rows;
  }
  const data = new Array(rows);
  for (let r = 0; r < rows; r++) {
    data[r] = new Array(cols).fill(null); // null = empty
  }
  return data;
}

function createCollisionData(cols, rows) {
  if (!cols || !rows) {
    const dims = getGridDimensions();
    cols = dims.cols;
    rows = dims.rows;
  }
  const data = new Array(rows);
  for (let r = 0; r < rows; r++) {
    data[r] = new Array(cols).fill(false); // false = no collision
  }
  return data;
}

function createScreenData() {
  // Create data for both TILE (8x8) and META (16x16) modes
  const tileCols = NES_WIDTH_TILES;
  const tileRows = NES_HEIGHT_TILES;
  const metaCols = NES_WIDTH_TILES / 2;
  const metaRows = NES_HEIGHT_TILES / 2;
  
  return {
    // 8x8 tile mode data
    tiles: createLevelData(tileCols, tileRows),
    collision: createCollisionData(tileCols, tileRows),
    entities: [],
    
    // 16x16 meta mode data
    metaTiles: createLevelData(metaCols, metaRows),
    metaCollision: createCollisionData(metaCols, metaRows),
    metaEntities: []
  };
}

// Update click handler to use paintCell
canvas.addEventListener('click', () => {
  const { col, row } = mouseState;
  if (col === -1 || row === -1) return;
  paintCell(col, row);
  drawGrid();
});

// --- Screen navigation ---
function navigateScreen(direction) {
  editorState.currentScreen += direction;
  
  // Ensure the screen exists
  if (!levelScreens[editorState.currentScreen]) {
    levelScreens[editorState.currentScreen] = createScreenData(); // full screen object
  }
  
  drawGrid();
  updateScreenIndicator();
}
function floodFill() {
  const levelData = getCurrentLevelData();
  const { cols, rows } = getGridDimensions();
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (levelData[r][c] === null) {
        levelData[r][c] = selectedTileID;
      }
    }
  }
  
  drawGrid();
}


// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateScreen(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    navigateScreen(1);
  } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    exportLevel();
  }
});

// --- Screen indicator ---
function updateScreenIndicator() {
  let indicator = document.getElementById('screen-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'screen-indicator';
    indicator.style.cssText = 'background: rgba(0,0,0,0.9); color: #fff; padding: 8px 12px; border: 1px solid #555; font-size: 14px; margin-bottom: 8px;';
    
    // Insert before the editor-container
    const editorContainer = document.getElementById('editor-container');
    if (!editorContainer) {
      // Fallback: insert after toolbar
      const toolbar = document.getElementById('toolbar');
      toolbar.parentNode.insertBefore(indicator, toolbar.nextSibling);
    } else {
      editorContainer.parentNode.insertBefore(indicator, editorContainer);
    }
  }
  
  const screenCount = Object.keys(levelScreens).length;
  const minScreen = Math.min(...Object.keys(levelScreens).map(Number));
  const maxScreen = Math.max(...Object.keys(levelScreens).map(Number));
  
  const modeText = editorState.mode === EditorMode.COLLISION || editorState.mode === EditorMode.ENTITY 
    ? `${editorState.mode.toUpperCase()} (${editorState.baseMode === EditorMode.TILE ? '8×8' : '16×16'})`
    : editorState.mode.toUpperCase();
  
  indicator.textContent = `Mode: ${modeText} | Screen: ${editorState.currentScreen} | Total: ${screenCount} | Range: ${minScreen} to ${maxScreen} | ← → to navigate | Ctrl+S to save`;
}

updateScreenIndicator();

// --- Export level data ---
function exportLevel() {
  const { cols, rows } = getGridDimensions();
  
  const levelJSON = {
    mode: editorState.mode,
    gridDimensions: { cols, rows },
    tileset: 'tilesets/Assets_City.png',
    screens: {}
  };
  
  // Export all screens
  Object.keys(levelScreens).forEach(screenIndex => {
levelJSON.screens[screenIndex] = {
  tiles: levelScreens[screenIndex].metaTiles,
  collision: levelScreens[screenIndex].metaCollision,
  entities: levelScreens[screenIndex].metaEntities
};
  });
  
  const jsonString = JSON.stringify(levelJSON, null, 2);
  
  // Download as file
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `level_${editorState.mode}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('Level exported:', levelJSON);
  alert('Level saved! Check your downloads folder.');
}

// --- Import level data ---
function importLevel(jsonData) {
  try {
    const levelData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Validate the data structure
    if (!levelData.screens) {
      throw new Error('Invalid level data format');
    }
    
    // Load all screens
    levelScreens = {};
    Object.keys(levelData.screens).forEach(screenIndex => {
      const screenData = levelData.screens[screenIndex];
      
      // Handle old format (just tiles array) vs new format (object with tiles/collision/entities)
      if (Array.isArray(screenData)) {
        // Very old format - just tiles
        levelScreens[screenIndex] = {
          tiles: screenData,
          collision: createCollisionData(NES_WIDTH_TILES, NES_HEIGHT_TILES),
          entities: [],
          metaTiles: createLevelData(NES_WIDTH_TILES / 2, NES_HEIGHT_TILES / 2),
          metaCollision: createCollisionData(NES_WIDTH_TILES / 2, NES_HEIGHT_TILES / 2),
          metaEntities: []
        };
      } else {
        // New format - has separate tile and meta data
        levelScreens[screenIndex] = {
          tiles: screenData.tiles || createLevelData(NES_WIDTH_TILES, NES_HEIGHT_TILES),
          collision: screenData.collision || createCollisionData(NES_WIDTH_TILES, NES_HEIGHT_TILES),
          entities: screenData.entities || [],
          metaTiles: screenData.tiles || createLevelData(NES_WIDTH_TILES / 2, NES_HEIGHT_TILES / 2),
          metaCollision: screenData.collision || createCollisionData(NES_WIDTH_TILES / 2, NES_HEIGHT_TILES / 2),
          metaEntities: screenData.entities || []
        };
      }
    });
    
    // Go to first screen
    const firstScreen = Math.min(...Object.keys(levelScreens).map(Number));
    editorState.currentScreen = firstScreen;
    
    drawGrid();
    updateScreenIndicator();
    
    console.log('Level imported successfully:', levelData);
    alert('Level loaded successfully!');
  } catch (error) {
    console.error('Error importing level:', error);
    alert('Error loading level: ' + error.message);
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    importLevel(e.target.result);
  };
  reader.readAsText(file);
  
  // Reset input so same file can be loaded again
  event.target.value = '';
}

// Add import button and file input to toolbar
const toolbar = document.getElementById('toolbar');

const importBtn = document.createElement('button');
importBtn.textContent = 'Import Level';
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';
fileInput.style.display = 'none';
fileInput.addEventListener('change', handleFileUpload);

importBtn.addEventListener('click', () => {
  fileInput.click();
});

toolbar.appendChild(importBtn);
toolbar.appendChild(fileInput);

const exportBtn = document.createElement('button');
exportBtn.textContent = 'Export Level (Ctrl+S)';
exportBtn.addEventListener('click', exportLevel);
toolbar.appendChild(exportBtn);

// Add navigation buttons to toolbar
const navLeftBtn = document.createElement('button');
navLeftBtn.textContent = '← Prev Screen';
navLeftBtn.addEventListener('click', () => navigateScreen(-1));
toolbar.appendChild(navLeftBtn);

const navRightBtn = document.createElement('button');
navRightBtn.textContent = 'Next Screen →';
navRightBtn.addEventListener('click', () => navigateScreen(1));
toolbar.appendChild(navRightBtn);

// --- Entity Palette ---
function createEntityPalette() {
  const paletteContainer = document.querySelector('#editor-container');
  if (!paletteContainer) return;
  
  const entityPalette = document.createElement('div');
  entityPalette.id = 'entity-palette';
  entityPalette.style.cssText = 'display: grid; grid-template-columns: repeat(2, 80px); grid-gap: 8px; align-content: start;';
  
  Object.keys(EntityTypes).forEach(key => {
    const entityType = EntityTypes[key];
    const entityStyle = EntityColors[entityType];
    
    const btn = document.createElement('button');
    btn.classList.add('entity-btn');
    btn.style.cssText = `
      width: 80px;
      height: 60px;
      padding: 4px;
      border: 2px solid #555;
      cursor: pointer;
      background: ${entityStyle.bg};
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    `;
    
    const label = document.createElement('div');
    label.textContent = entityStyle.label;
    label.style.fontSize = '20px';
    
    const name = document.createElement('div');
    name.textContent = entityType;
    name.style.fontSize = '10px';
    
    btn.appendChild(label);
    btn.appendChild(name);
    
    btn.addEventListener('click', () => {
      selectedEntityType = entityType;
      document.querySelectorAll('.entity-btn').forEach(b => {
        b.style.border = '2px solid #555';
      });
      btn.style.border = '2px solid #fff';
    });
    
    if (entityType === selectedEntityType) {
      btn.style.border = '2px solid #fff';
    }
    
    entityPalette.appendChild(btn);
  });
  
  // Insert after the palette div
  const palette = document.getElementById('palette');
  palette.parentNode.insertBefore(entityPalette, palette.nextSibling);

}

function clearGrid() {
  if(!window.confirm("are you sure you want to clear this screen? Tiles, collision and entity data will be removed."))return;
  const levelData = getCurrentLevelData();
  const collisionData = getCurrentCollisionData();
  console.log(collisionData)
  const entityData = getCurrentEntityData();
  console.log(entityData)
  const { cols, rows } = getGridDimensions();
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        levelData[r][c] = null;
        collisionData[r][c] = false;        
    }
  }

  entityData.length = 0;


  drawGrid();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') {
    keys.Shift = true;
  }
  // ... your existing keydown code
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    keys.Shift = false;
  }
});


// Helper function to create instruction panels
function createInstructionPanel(id, instructions) {
  const panel = document.createElement('div');
  panel.id = id;
  panel.style.cssText = `
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #555;
    padding: 16px;
    font-size: 11px;
    line-height: 1.8;
    color: #eee;
    border-radius: 4px;
  `;
  
  const title = document.createElement('div');
  title.textContent = id === 'collision-instructions' ? 'COLLISION MODE' : 'ENTITY MODE';
  title.style.cssText = 'color: #ffd700; font-weight: bold; margin-bottom: 12px; font-size: 12px;';
  panel.appendChild(title);
  
  instructions.forEach(text => {
    const line = document.createElement('div');
    line.textContent = text;
    line.style.marginBottom = '6px';
    panel.appendChild(line);
  });
  
  // Insert after palette
  const palette = document.getElementById('palette');
  palette.parentNode.insertBefore(panel, palette.nextSibling);
}


  // Add button to toolbar (after the mode buttons)
const fillBtn = document.createElement('button');
fillBtn.textContent = 'Fill Empty';
fillBtn.addEventListener('click', floodFill);
toolbar.appendChild(fillBtn);

// add clear button
const clearBtn = document.createElement('button');
clearBtn.textContent = 'Clear Grid';
clearBtn.addEventListener(`click`, clearGrid);
toolbar.appendChild(clearBtn);