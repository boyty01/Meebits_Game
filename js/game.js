// --- Game Constants ---
const NES_WIDTH_PX = 256;
const NES_HEIGHT_PX = 240;
const TILE_SIZE = 16;
const META_SIZE = 16;
const SCALE = 3;
const MOBILE_SPEED_MULTIPLIER = 0.3


// --- Game State ---
const gameState = {
    levelData: null,
    currentScreen: 0,
    cameraX: 0,
    cameraY: 0,
    cameraSpeed: 0.1,
    player: {
        x: 32,
        y: 200,
        width: 16,
        height: 16,
        velocityX: 0,
        velocityY: 0,
        speed: 2,
        jumpPower: 5,
        gravity: 0.3,
        onGround: false,
        direction: 'right',      // 'left' or 'right'
        animFrame: 0,            // current frame index
        animTimer: 0,            // counter to cycle frames
        animSpeed: 6             // frames to wait per sprite frame
    },
    score: 0,
    collectiblesCollected: 0,
    totalCollectibles: 0,
    paused: false,
    gameOver: false,
    enemies: [],
    collectibles: [],
    breakables: []
};

// --- Canvas Setup ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = NES_WIDTH_PX;
canvas.height = NES_HEIGHT_PX;
ctx.imageSmoothingEnabled = false;



// --- Sprite Sheet ---
const spriteSheet = new Image();
const TILE_SIZE_PIXELS = 16;

// --- Load Level ---
function loadLevel() {
    const levelJSON = sessionStorage.getItem('currentLevel');
    const levelFileName = sessionStorage.getItem('levelFileName');

    if (!levelJSON) {
        alert('No level data found! Redirecting to menu...');
        window.location.href = 'index.html';
        return;
    }

    try {
        
        gameState.levelData = JSON.parse(levelJSON);
        document.getElementById('level-name').textContent = levelFileName || 'Unknown Level';

        // Load player sprite from sessionStorage
        const spriteURL = sessionStorage.getItem('playerSprite');
        if (spriteURL) {
            playerSprite.src = spriteURL;
            playerSprite.onload = () => {
                playerSpriteReady = true;
            };
            playerSprite.onerror = () => {
                playerSpriteReady = false;
                console.warn('Failed to load player sprite. Using fallback.');
            };
        } else {
            playerSpriteReady = false;
        }


        // Load tileset
        spriteSheet.src = gameState.levelData.tileset || 'tilesets/Assets_City.png';
        spriteSheet.onload = () => {
            initializeLevel();
            gameLoop();
            
        };
    } catch (error) {
        console.error('Error loading level:', error);
        alert('Failed to load level data!');
        window.location.href = 'index.html';
    }
}



// --- Initialize Level ---
function initializeLevel() {
    // Get current screen data
    const screenData = gameState.levelData.screens[gameState.currentScreen];
    if (!screenData) {
        console.error('Screen data not found for screen:', gameState.currentScreen);
        return;
    }


    // Load entities 
    loadAllEntities();

    // Reset player position
    gameState.player.x = 32;
    gameState.player.y = 200;
    gameState.player.velocityX = 0;
    gameState.player.velocityY = 0;
}





// --- Game Loop ---
function gameLoop() {
    if (!gameState.paused && !gameState.gameOver) {
        update();
        render();
    }

    requestAnimationFrame(gameLoop);
}

// --- Update ---
function update() {
    updatePlayer();
    updateEntities();
    updateCamera();
    checkCollisions();
}



function getTileAtWorld(worldX, worldY) {
    const TILE = TILE_SIZE;
    const tilesPerScreen = NES_WIDTH_PX / TILE;

    const worldCol = Math.floor(worldX / TILE);
    const row = Math.floor(worldY / TILE);

    const screenIndex = Math.floor(worldCol / tilesPerScreen);
    const localCol = worldCol % tilesPerScreen;

    const screen = gameState.levelData.screens[screenIndex];
    if (!screen || !screen.tiles) return null;

    return screen.tiles[row]?.[localCol] ?? null;
}


// --- Render ---
function render() {
    // Clear screen
    ctx.fillStyle = '#5c94fc'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render tiles
    renderTiles();

    // Render entities
    renderEntities();

    // Render player
    renderPlayer();
}

// --- Render Tiles ---
function renderTiles() {
    const screens = gameState.levelData.screens;
    if (!screens) return;

    const cellSize = TILE_SIZE; // using 8x8 tiles

    // For each screen
    Object.keys(screens).forEach(screenIndexStr => {
        const screenIndex = Number(screenIndexStr);
        const screenData = screens[screenIndex];
        if (!screenData) return;

        const tiles = screenData.tiles || screenData.metaTiles;
        if (!tiles) return;

        const screenOffsetX = screenIndex * NES_WIDTH_PX - gameState.cameraX;

        // Skip screens that are completely off-screen
        if (screenOffsetX + NES_WIDTH_PX < 0 || screenOffsetX > NES_WIDTH_PX) return;

        const rows = tiles.length;
        const cols = tiles[0] ? tiles[0].length : 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tileID = tiles[r][c];
                if (tileID !== null) {
                    const sprite = getTileSpritePos(tileID);
                    if (sprite && spriteSheet.complete) {
                        ctx.drawImage(
                            spriteSheet,
                            sprite.x, sprite.y, sprite.w, sprite.h,
                            c * cellSize + screenOffsetX,
                            r * cellSize,
                            cellSize,
                            cellSize
                        );
                    }
                }
            }
        }
    });
}


// --- Get Tile Sprite Position ---
function getTileSpritePos(tileID) {
    if (!spriteSheet.complete) return null;

    const sheetCols = spriteSheet.width / TILE_SIZE_PIXELS;
    const index = tileID - 1;
    const col = index % sheetCols;
    const row = Math.floor(index / sheetCols);

    return {
        x: col * TILE_SIZE_PIXELS,
        y: row * TILE_SIZE_PIXELS,
        w: TILE_SIZE_PIXELS,
        h: TILE_SIZE_PIXELS
    };
}




// --- Update Stats ---
function updateStats() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
    document.getElementById('collectibles').textContent = `Items: ${gameState.collectiblesCollected}/${gameState.totalCollectibles}`;
}

// --- Pause/Resume ---
function togglePause() {
    if (gameState.gameOver) return;

    gameState.paused = !gameState.paused;
    document.getElementById('pause-menu').classList.toggle('hidden', !gameState.paused);
}

// --- Game Over ---
function gameOver(message, isWin = false) {
    gameState.gameOver = true;
    sounds.music.pause();
    sounds.gameover.currentTime = 0;
    sounds.gameover.play();
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over-menu').classList.remove('hidden');
}

// --- Restart Level ---
function restartLevel() {
    gameState.paused = false;
    gameState.gameOver = false;
    gameState.score = 0;
    gameState.collectiblesCollected = 0;
    sounds.music.currentTime = 0;
    sounds.music.play();
    sounds.gameover.pause();
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over-menu').classList.add('hidden');

    initializeLevel();
}

// --- Menu Buttons ---
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('restart-btn').addEventListener('click', () => {
    togglePause();
    restartLevel();
});
document.getElementById('menu-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('retry-btn').addEventListener('click', restartLevel);
document.getElementById('game-over-menu-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});
