// --- Game Constants ---
const NES_WIDTH_PX = 256;
const NES_HEIGHT_PX = 240;
const TILE_SIZE = 16;
const META_SIZE = 16;
const SCALE = 3;

// -- has the user interacted with the page yet?
let firstInteract = false;

// --- Player Sprite ---
const playerSprite = new Image();
let playerSpriteReady = false;

// --- Camera ---
const camera = {
    x: 0,        // top-left X of what is visible
    y: 0,        // top-left Y (usually 0 for side-scroller)
    width: NES_WIDTH_PX,
    height: NES_HEIGHT_PX
};

// --- Sounds ---
const sounds = {
    jump: new Audio('sound/jump.wav'),
    collectCoin: new Audio('sound/coincollect.wav'),
    music: new Audio("sound/8bitmusic.wav"),
    gameover: new Audio("sound/gameover.wav")
};

//  preload sound
for (const key in sounds) {
    sounds[key].volume = 0.5; // default volume
    sounds[key].load();
}

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

// --- Input State ---
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

const collectibleSprite = new Image();
let collectibleReady = false;
collectibleSprite.src = 'entities/bitcoin_s.png'; // path to your image
collectibleSprite.onload = () => collectibleReady = true;

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
                console.log('Player sprite loaded successfully.');
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

    // Debug: Check collision data
    console.log('Screen data:', screenData);
    console.log('Collision data:', screenData.collision);
    if (screenData.collision && screenData.collision.length > 0) {
        console.log('Sample collision row:', screenData.collision[0]);
        console.log('Collision value at [0][0]:', screenData.collision[0][0], 'Type:', typeof screenData.collision[0][0]);
    }

    // Load entities 
    loadAllEntities();

    // Reset player position
    gameState.player.x = 32;
    gameState.player.y = 200;
    gameState.player.velocityX = 0;
    gameState.player.velocityY = 0;
}

function loadAllEntities() {
    gameState.enemies = [];
    gameState.collectibles = [];
    gameState.breakables = [];
    gameState.totalCollectibles = 0;

    const screens = gameState.levelData.screens;

    Object.keys(screens).forEach(screenIndexStr => {
        const screenIndex = Number(screenIndexStr);
        const screenData = screens[screenIndex];
        if (!screenData || !screenData.entities) return;

        const screenOffsetX = screenIndex * NES_WIDTH_PX;

        screenData.entities.forEach(entity => {
            const obj = {
                type: entity.type,
                x: entity.col * TILE_SIZE + screenOffsetX,
                y: entity.row * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                active: true
            };

            if (entity.type.startsWith('enemy')) {
                gameState.enemies.push(obj);
            } else if (entity.type === 'collectible') {              
                gameState.collectibles.push(obj);
                gameState.totalCollectibles++;
            } else if (entity.type === 'breakable') {
                gameState.breakables.push(obj);
            }
        });
    });

    updateStats();
}

// --- Load Entities ---
function loadEntities(screenData) {
    gameState.enemies = [];
    gameState.collectibles = [];
    gameState.breakables = [];
    gameState.totalCollectibles = 0;

    // Determine which entity list to use based on available data
    const entities = screenData.entities || screenData.metaEntities || [];

    entities.forEach(entity => {
        const entityObj = {
            type: entity.type,
            col: entity.col,
            row: entity.row,
            x: entity.col * TILE_SIZE,
            y: entity.row * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            active: true
        };

        if (entity.type === 'enemy1' || entity.type === 'enemy2') {
            gameState.enemies.push(entityObj);
        } else if (entity.type === 'collectible') {
            gameState.collectibles.push(entityObj);
            gameState.totalCollectibles++;
        } else if (entity.type === 'breakable') {
            gameState.breakables.push(entityObj);
        }
    });

    updateStats();
}

function updateCamera() {
    const player = gameState.player;

    // Desired camera X: center player on screen
    let targetX = player.x + player.width / 2 - NES_WIDTH_PX / 2;

    // Clamp camera so it doesn't scroll past level bounds
    const screenData = gameState.levelData.screens[0]; // assume all screens same width
    const levelWidthPx = screenData.tiles[0].length * TILE_SIZE; // total width in px

    targetX = Math.max(0, Math.min(levelWidthPx - NES_WIDTH_PX, targetX));

    // Smooth scrolling using linear interpolation
    const SCROLL_SPEED = 0.1; // adjust 0–1 for smoothness
    camera.x += (targetX - camera.x) * SCROLL_SPEED;

    // Camera Y (optional if vertical scroll)
    camera.y = 0;
}

// input handlers
document.addEventListener('keydown', (e) => {
    if(!firstInteract){
        sounds.music.loop = true;
        sounds.music.play();
        firstInteract = true;
    }
        
    if (e.key in keys) {
        keys[e.key] = true;
    } else if (e.key === ' ' || e.key === 'Space' || e.key === 'Spacebar') {
        keys.Space = true;
    }

    if (e.key === 'Escape') togglePause();
    if (e.key === 'r' || e.key === 'R') restartLevel();

    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    } else if (e.key === ' ' || e.key === 'Space' || e.key === 'Spacebar') {
        keys.Space = false;
    }
});

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

    const player = gameState.player;
    console.log(
        "x:", player.x.toFixed(2),
        "vx:", player.velocityX.toFixed(2),
        "screen:", Math.floor(player.x / NES_WIDTH_PX)
    );
}

// --- Update Player ---
function updatePlayer() {
    const p = gameState.player;

    // Update direction
    if (p.velocityX > 0) p.direction = 'right';
    else if (p.velocityX < 0) p.direction = 'left';
    // Update animation timer
    if (Math.abs(p.velocityX) > 0) {
        p.animTimer++;
        if (p.animTimer >= p.animSpeed) {
            p.animTimer = 0;
            p.animFrame = (p.animFrame + 1) % 8; // 8 frames per walk cycle in APE sprite sheet.
        }
    } else {
        // Idle frame
        p.animFrame = 0;
        p.animTimer = 0;
    }

    // --- Input ---
    p.velocityX = 0;
    if (keys.ArrowLeft) p.velocityX = -p.speed;
    if (keys.ArrowRight) p.velocityX = p.speed;

    if (keys.Space && p.onGround) {
        p.velocityY = -p.jumpPower;
        p.onGround = false;
        if(sounds.jump) sounds.jump.currentTime = 0;
        sounds.jump.play();
    }

    // --- Gravity ---
    p.velocityY += p.gravity;

    // --- Collision (NO position updates here) ---
    handleTileCollision();

    // --- Apply final movement ONCE ---
    p.x += p.velocityX;
    p.y += p.velocityY;

    // --- Camera follow (AFTER movement) ---
    const halfScreen = NES_WIDTH_PX / 2;
    let camX = p.x + p.width / 2 - halfScreen;

    const totalScreens = Object.keys(gameState.levelData.screens).length;
    const maxCamX = totalScreens * NES_WIDTH_PX - NES_WIDTH_PX;

    gameState.cameraX = Math.max(0, Math.min(camX, maxCamX));

    // --- Death check ---
    if (p.y > NES_HEIGHT_PX) gameOver('You fell to your doom');
}


function handleHorizontalCollision() {
    const player = gameState.player;
    const screenData = gameState.levelData.screens[gameState.currentScreen];
    const tiles = screenData.tiles;

    const nextX = player.x + player.velocityX;
    const leftCol = Math.floor(nextX / TILE_SIZE);
    const rightCol = Math.floor((nextX + player.width - 1) / TILE_SIZE);
    const topRow = Math.floor(player.y / TILE_SIZE);
    const bottomRow = Math.floor((player.y + player.height - 1) / TILE_SIZE);

    let collided = false;

    for (let r = topRow; r <= bottomRow; r++) {
        if (r < 0 || r >= tiles.length) continue;

        // Only check left-side tiles if within current screen bounds
        if (player.velocityX < 0 && leftCol >= 0) {
            if (tiles[r][leftCol]) {
                player.x = (leftCol + 1) * TILE_SIZE;
                collided = true;
            }
        }

        // Only check right-side tiles if within current screen bounds
        if (player.velocityX > 0 && rightCol < tiles[0].length) {
            if (tiles[r][rightCol]) {
                player.x = rightCol * TILE_SIZE - player.width;
                collided = true;
            }
        }
    }

    if (!collided) {
        // Move freely even if player goes slightly off-screen
        player.x += player.velocityX;
    } else {
        player.velocityX = 0;
    }
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

// --- Tile Collision ---
// --- Handle Tile Collision (multi-screen aware) ---
function handleTileCollision() {
    const player = gameState.player;
    const levelScreens = gameState.levelData.screens;

    const left = Math.floor(player.x / TILE_SIZE);
    const right = Math.floor((player.x + player.width - 1) / TILE_SIZE);
    const top = Math.floor(player.y  / TILE_SIZE);
    const bottom = Math.floor( (player.y  + player.height - 1) / TILE_SIZE);

    const screenWidthTiles = NES_WIDTH_PX / TILE_SIZE;

    // --- Horizontal Collision ---
    if (player.velocityX !== 0) {
        let collidedX = false;

        const nextX = player.x + player.velocityX;
        const leftCol = Math.floor(nextX / TILE_SIZE);
        const rightCol = Math.floor((nextX + player.width - 1) / TILE_SIZE);

        const leftScreen = Math.floor(leftCol / screenWidthTiles);
        const rightScreen = Math.floor(rightCol / screenWidthTiles);

        for (let r = top; r <= bottom; r++) {
            for (let screenIndex of [leftScreen, rightScreen]) {
                const screen = levelScreens[screenIndex];
                if (!screen || !screen.tiles) continue;

                const screenOffsetCol = screenIndex * screenWidthTiles;

                for (let c = leftCol; c <= rightCol; c++) {
                    const localCol = c - screenOffsetCol;
                    if (r < 0 || r >= screen.tiles.length) continue;
                    if (localCol < 0 || localCol >= screen.tiles[0].length) continue;

                    if (screen.tiles[r][localCol]) {
                        // Snap next to wall
                        if (player.velocityX > 0) {
                            player.x = c * TILE_SIZE - player.width;
                        } else if (player.velocityX < 0) {
                            player.x = (c + 1) * TILE_SIZE;
                        }
                        player.velocityX = 0;
                        collidedX = true;
                        break;
                    }
                }
                if (collidedX) break;
            }
            if (collidedX) break;
        }

        if (!collidedX) player.x += player.velocityX;
    }

    // --- Vertical Collision ---
    if (player.velocityY !== 0) {
        let collidedY = false;

        const nextY = player.y + player.velocityY;
        const topRow = Math.floor(nextY / TILE_SIZE );
        const bottomRow = Math.floor((nextY + player.height - 1) / TILE_SIZE);

        const leftScreen = Math.floor(left / screenWidthTiles);
        const rightScreen = Math.floor(right / screenWidthTiles);

        for (let c = left; c <= right; c++) {
            for (let screenIndex of [leftScreen, rightScreen]) {
                const screen = levelScreens[screenIndex];
                if (!screen || !screen.tiles) continue;

                const screenOffsetCol = screenIndex * screenWidthTiles;
                const localCol = c - screenOffsetCol;

                if (player.velocityY > 0) { // falling
                    if (screen.tiles[bottomRow] && localCol >= 0 && localCol < screen.tiles[0].length) {
                        if (screen.tiles[bottomRow][localCol]) {
                            player.y = bottomRow * TILE_SIZE - player.height;
                            player.velocityY = 0;
                            player.onGround = true;
                            collidedY = true;
                            break;
                        }
                    }
                } else if (player.velocityY < 0) { // jumping
                    if (screen.tiles[topRow] && localCol >= 0 && localCol < screen.tiles[0].length) {
                        if (screen.tiles[topRow][localCol]) {
                            player.y = (topRow + 1) * TILE_SIZE;
                            player.velocityY = 0;
                            collidedY = true;
                            break;
                        }
                    }
                }
            }
            if (collidedY) break;
        }

        if (!collidedY) {
            player.y += player.velocityY;
            player.onGround = false;
        }
    }
}



// Helper to check if collision data has any true values
function hasAnyCollision(collisionData) {
    if (!collisionData) return false;
    for (let row of collisionData) {
        for (let cell of row) {
            if (cell === true || cell === 1) return true;
        }
    }
    return false;
}

// --- Update Entities ---
function updateEntities() {
    // Simple enemy movement (back and forth)
    gameState.enemies.forEach(enemy => {
        if (!enemy.active) return;

        // TODO: Add enemy AI
    });
}

// --- Check Collisions ---
function checkCollisions() {
    const player = gameState.player;

    // Check collectible collision
    gameState.collectibles.forEach(collectible => {
        if (!collectible.active) return;

        if (checkRectCollision(player, collectible)) {
            collectible.active = false;
            gameState.collectiblesCollected++;
            gameState.score += 100;
            sounds.collectCoin.currentTime = 0;
            sounds.collectCoin.play();
            updateStats();

            // Win condition
            if (gameState.collectiblesCollected >= gameState.totalCollectibles) {
                // gameOver('You collected everything! You win!', true);
            }
        }
    });

    // Check enemy collision
    gameState.enemies.forEach(enemy => {
        if (!enemy.active) return;

        if (checkRectCollision(player, enemy)) {
            gameOver('You were defeated by an enemy!');
        }
    });

    // Check breakable collision (can break with jump from below or collision from side)
    gameState.breakables.forEach(breakable => {
        if (!breakable.active) return;

        if (checkRectCollision(player, breakable)) {
            breakable.active = false;
            gameState.score += 50;
            updateStats();
        }
    });
}

// --- Rectangle Collision ---
function checkRectCollision(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
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

// --- Render Entities ---
function renderEntities() {
    // Collectibles

    gameState.collectibles.forEach(ent => {
    if (!ent.active) return;

    if (collectibleReady) {
        ctx.drawImage(
            collectibleSprite,
            ent.x - gameState.cameraX,
            ent.y - gameState.cameraY,
            ent.width,
            ent.height
        );
    } else {
        // fallback rectangle if image not loaded yet
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(ent.x - gameState.cameraX, ent.y - gameState.cameraY, ent.width, ent.height);
    }
});


    // Breakables
    gameState.breakables.forEach(ent => {
        if (!ent.active) return;
        ctx.fillStyle = '#a06ecc';
        ctx.fillRect(ent.x - gameState.cameraX, ent.y - gameState.cameraY, ent.width, ent.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(ent.x - gameState.cameraX, ent.y - gameState.cameraY, ent.width, ent.height);
    });

    // Enemies
    gameState.enemies.forEach(ent => {
        if (!ent.active) return;
        const color = ent.type === 'enemy1' ? '#ff6464' : '#ff9632';
        ctx.fillStyle = color;
        ctx.fillRect(ent.x - gameState.cameraX + 2, ent.y - gameState.cameraY + 2, ent.width - 4, ent.height - 4);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(ent.x - gameState.cameraX + 2, ent.y - gameState.cameraY + 2, ent.width - 4, ent.height - 4);
    });
}

function renderPlayer() {
    const player = gameState.player;
    const SPRITE_FRAME = 80; // frame size in sheet
    const RENDER_SCALE = 3;  // how big you want player on-screen

    // Determine animation row/column
    let row = 7; // default row (idle)
    if (keys.ArrowLeft || keys.ArrowRight) {
        row = keys.ArrowLeft ? 2 : 0; // running row
    }
    let col = Math.floor((performance.now() / 150) % 8); // cycle through 8 columns over time

    // Draw the sprite
    if (playerSpriteReady) {
        ctx.drawImage(
            playerSprite,
            col * SPRITE_FRAME,      // source x
            row * SPRITE_FRAME,      // source y
            SPRITE_FRAME,            // source width
            SPRITE_FRAME,            // source height
            player.x - gameState.cameraX - 16,  // canvas x
            player.y - 16 * (RENDER_SCALE -1),                     // canvas y
            player.width * RENDER_SCALE,  // dest width
            player.height * RENDER_SCALE  // dest height
        );
    } else {
        // fallback rectangle
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(
            player.x - gameState.cameraX,
            player.y,
            player.width * RENDER_SCALE,
            player.height * RENDER_SCALE
        );
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            player.x - gameState.cameraX,
            player.y,
            player.width * RENDER_SCALE,
            player.height * RENDER_SCALE
        );
    }
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

// Reference buttons
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const jumpBtn = document.getElementById('jump-btn');

function bindTouchButton(btn, keyName) {
  // When finger touches down, set key to true
  btn.addEventListener('touchstart', e => {
    keys[keyName] = true;
    e.preventDefault(); // prevent scrolling
  });

  // When finger lifts, set key to false
  btn.addEventListener('touchend', e => {
    keys[keyName] = false;
    e.preventDefault();
  });

  btn.addEventListener('touchcancel', e => {
    keys[keyName] = false;
    e.preventDefault();
  });
}

// Bind the buttons
bindTouchButton(leftBtn, 'ArrowLeft');
bindTouchButton(rightBtn, 'ArrowRight');
bindTouchButton(jumpBtn, 'Space');

// --- Initialize ---
loadLevel();