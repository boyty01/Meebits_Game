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

function setPlayerSpawn(spawn) {
    if (spawn && spawn.x && spawn.y) {
        gameState.player.x = spawn.x;
        gameState.player.y = spawn.y;
        return;
    }
    gameState.player.x = 32;
    gameState.player.y = 200;
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
            p.animFrame = (p.animFrame + 1) % 8;
        }
    } else {
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
        if (sounds.jump) sounds.jump.currentTime = 0;
        sounds.jump.play();
    }

    
    // --- Collision (NO position updates here) ---
    handleTileCollision();

    // --- Gravity ---
    p.velocityY += p.gravity;

    // Cap velocityY to prevent falling through floor
    const maxFallSpeed = 10;
    if (p.velocityY > maxFallSpeed) p.velocityY = maxFallSpeed;

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

// --- Handle Tile Collision (multi-screen aware) ---
// --- Handle Tile Collision (multi-screen aware) ---
function handleTileCollision() {
    const player = gameState.player;
    const levelScreens = gameState.levelData.screens;
    const collisionBox = player.collisionBox;
    const pLeft = player.x + (collisionBox?.offsetX || 0);
    const pTop = player.y + (collisionBox?.offsetY || 0);
    const pWidth = collisionBox?.width || player.width;
    const pHeight = collisionBox?.height || player.height;

    const screenWidthTiles = NES_WIDTH_PX / TILE_SIZE;

    // --- Horizontal Collision ---
    if (player.velocityX !== 0) {
        const nextX = player.x + player.velocityX;
        const nextLeft = nextX + (collisionBox?.offsetX || 0);
        const leftCol = Math.floor(nextLeft / TILE_SIZE);
        const rightCol = Math.floor((nextLeft + pWidth - 1) / TILE_SIZE);

        const top = Math.floor(pTop / TILE_SIZE);
        const bottom = Math.floor((pTop + pHeight - 1) / TILE_SIZE);

        const leftScreen = Math.floor(leftCol / screenWidthTiles);
        const rightScreen = Math.floor(rightCol / screenWidthTiles);

        let collidedX = false;

        for (let r = top; r <= bottom; r++) {
            for (let screenIndex of [leftScreen, rightScreen]) {
                const screen = levelScreens[screenIndex];
                if (!screen || !screen.collision) continue;

                const screenOffsetCol = screenIndex * screenWidthTiles;

                for (let c = leftCol; c <= rightCol; c++) {
                    const localCol = c - screenOffsetCol;
                    if (r < 0 || r >= screen.collision.length) continue;
                    if (localCol < 0 || localCol >= screen.collision[0].length) continue;

                    if (screen.collision[r][localCol] === true) {
                        // Snap to edge of tile
                        if (player.velocityX > 0) {
                            player.x = c * TILE_SIZE - pWidth - (collisionBox?.offsetX || 0);
                        } else if (player.velocityX < 0) {
                            player.x = (c + 1) * TILE_SIZE - (collisionBox?.offsetX || 0);
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
    }

    // --- Vertical Collision ---
    if (player.velocityY !== 0) {
        const nextY = player.y + player.velocityY;
        const nextTop = nextY + (collisionBox?.offsetY || 0);
        const topRow = Math.floor(nextTop / TILE_SIZE);
        const bottomRow = Math.floor((nextTop + pHeight - 1) / TILE_SIZE);

        const left = Math.floor(pLeft / TILE_SIZE);
        const right = Math.floor((pLeft + pWidth - 1) / TILE_SIZE);

        const leftScreen = Math.floor(left / screenWidthTiles);
        const rightScreen = Math.floor(right / screenWidthTiles);

        let collidedY = false;

        for (let c = left; c <= right; c++) {
            for (let screenIndex of [leftScreen, rightScreen]) {
                const screen = levelScreens[screenIndex];
                if (!screen || !screen.collision) continue;

                const screenOffsetCol = screenIndex * screenWidthTiles;
                const localCol = c - screenOffsetCol;

                if (localCol < 0 || localCol >= screen.collision[0].length) continue;

                if (player.velocityY > 0) { // falling
                    if (screen.collision[bottomRow] && localCol >= 0 && localCol < screen.collision[0].length) {
                        if (screen.collision[bottomRow][localCol] === true) {
                            // Only snap if moving significantly or not already on ground
                            if (!player.onGround || player.velocityY > 0.5) {
                                player.y = bottomRow * TILE_SIZE - player.height;
                            }
                            player.velocityY = 0;
                            player.onGround = true;
                            collidedY = true;
                            break;
                        }
                    }

                } else if (player.velocityY < 0) { // jumping
                    if (topRow >= 0 && topRow < screen.collision.length) {
                        if (screen.collision[topRow][localCol] === true) {
                            player.y = (topRow + 1) * TILE_SIZE - (collisionBox?.offsetY || 0);
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

    if (debug.collision) renderCollisionBoxes();

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
            player.y - 16 * (RENDER_SCALE - 1),                     // canvas y
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

    if (!gameState.goal) return;

    if (checkRectCollision(player, gameState.goal)) {
        gameOver(`You reached the goal!`, true);
    }
}

function checkRectCollision(a, b) {
    // Player uses collisionBox, entities use def.collision
    const aCollision = a.collisionBox || a.def?.collision;
    const bCollision = b.collisionBox || b.def?.collision;

    const aLeft = a.x + (aCollision?.offsetX || 0);
    const aRight = aLeft + (aCollision?.width || a.width);
    const aTop = a.y + (aCollision?.offsetY || 0);
    const aBottom = aTop + (aCollision?.height || a.height);

    const bLeft = b.x + (bCollision?.offsetX || 0);
    const bRight = bLeft + (bCollision?.width || b.width);
    const bTop = b.y + (bCollision?.offsetY || 0);
    const bBottom = bTop + (bCollision?.height || b.height);

    return (
        aLeft < bRight &&
        aRight > bLeft &&
        aTop < bBottom &&
        aBottom > bTop
    );
}


// ------ debug -----

function renderCollisionBoxes() {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 1;

    // Player collision box
    const p = gameState.player;
    const pCollision = p.collisionBox;
    const pLeft = p.x + (pCollision?.offsetX || 0);
    const pTop = p.y + (pCollision?.offsetY || 0);
    const pWidth = pCollision?.width || p.width;
    const pHeight = pCollision?.height || p.height;

    ctx.strokeRect(
        pLeft - gameState.cameraX,
        pTop - gameState.cameraY,
        pWidth,
        pHeight
    );

    // Enemy collision boxes
    gameState.enemies.forEach(ent => {
        if (!ent.active) return;
        const left = ent.x + (ent.def?.collision?.offsetX || 0);
        const top = ent.y + (ent.def?.collision?.offsetY || 0);
        const width = ent.def?.collision?.width || ent.width;
        const height = ent.def?.collision?.height || ent.height;

        ctx.strokeRect(
            left - gameState.cameraX,
            top - gameState.cameraY,
            width,
            height
        );
    });

    // Collectible collision boxes
    gameState.collectibles.forEach(ent => {
        if (!ent.active) return;
        const left = ent.x + (ent.def?.collision?.offsetX || 0);
        const top = ent.y + (ent.def?.collision?.offsetY || 0);
        const width = ent.def?.collision?.width || ent.width;
        const height = ent.def?.collision?.height || ent.height;

        ctx.strokeRect(
            left - gameState.cameraX,
            top - gameState.cameraY,
            width,
            height
        );

    });

    if (gameState.goal) {
        const left = gameState.goal.x + (gameState.goal.def.collision?.offsetX || 0);
        const top = gameState.goal.y + (gameState.goal.def.collision?.offsetY || 0);
        const width = gameState.goal.def.collision?.width || gameState.goal.width;
        const height = gameState.goal.def.collision?.height || gameState.goal.height;

        ctx.strokeRect(
            left - gameState.cameraX,
            top - gameState.cameraY,
            width,
            height
        );

    }
}