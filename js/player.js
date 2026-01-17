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


// --- Update Player ---
function updatePlayer() {
    const p = gameState.player;

    const speed = usingTouch
  ? p.speed * MOBILE_SPEED_MULTIPLIER
  : p.speed;

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
    if (keys.ArrowLeft) p.velocityX = -speed;
    if (keys.ArrowRight) p.velocityX = speed;

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

function checkRectCollision(a, b) {
    const aLeft   = a.x + (a.def?.collision?.offsetX || 0);
    const aRight  = aLeft + (a.def?.collision?.width || a.width);
    const aTop    = a.y + (a.def?.collision?.offsetY || 0);
    const aBottom = aTop + (a.def?.collision?.height || a.height);

    const bLeft   = b.x + (b.def?.collision?.offsetX || 0);
    const bRight  = bLeft + (b.def?.collision?.width || b.width);
    const bTop    = b.y + (b.def?.collision?.offsetY || 0);
    const bBottom = bTop + (b.def?.collision?.height || b.height);

    return (
        aLeft < bRight &&
        aRight > bLeft &&
        aTop < bBottom &&
        aBottom > bTop
    );
}
