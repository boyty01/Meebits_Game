const collectibleSprite = new Image();
let collectibleReady = false;
collectibleSprite.src = 'entities/bitcoin_s.png'; // path to your image
collectibleSprite.onload = () => collectibleReady = true;


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

// --- Update Entities ---
function updateEntities() {
    // Simple enemy movement (back and forth)
    gameState.enemies.forEach(enemy => {
        if (!enemy.active) return;

        // TODO: Add enemy AI
    });
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

