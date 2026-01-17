const collectibleSprite = new Image();
let collectibleReady = false;
collectibleSprite.src = 'entities/bitcoin_s.png';// path to your image
collectibleSprite.onload = () => collectibleReady = true;

const imageCache = {};

function loadEntityImages() {
    Object.values(ENTITY_DEFS).forEach(def => {
        if (!def.image) return;

        const img = new Image();
        img.src = def.image;
        imageCache[def.image] = img;
    });
}

const ENTITY_DEFS = {
    enemy1: {
        image: 'entities/goblin.png',
        sprite: {
            frameWidth: 64,   // actual pixels in the image
            frameHeight: 64,
            frames: 9,
            row: 1
        },
        render: {
            width: 25,
            height: 24,
            scale: 1
        },
        collision: {
            width: 32,
            height: 32,
            offsetX: 8,
            offsetY: 2
        }
    },
    enemy2: {
        image: 'entities/goblin.png',
        sprite: {
            frameWidth: 64,   // actual pixels in the image
            frameHeight: 64,
            frames: 9,
            row: 1
        },
        render: {
            width: 25,
            height: 24,
            scale: 1
        },
        collision: {
            width: 32,
            height: 32,
            offsetX: 8,
            offsetY: 2
        }
    },

    collectible: {
        image: 'entities/bitcoin_s.png',
        sprite: {
            frameWidth: 16,
            frameHeight: 16,
            frames: 6,
            row: 0
        },
        render: {
            width: 16,
            height: 16,
            scale: 1
        },
        collision: {
            width: 10,
            height: 10,
            offsetX: 3,
            offsetY: 3
        }
    }
};


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
                def: ENTITY_DEFS[entity.type],
                x: entity.col * TILE_SIZE + screenOffsetX,
                y: entity.row * TILE_SIZE,
                width: ENTITY_DEFS[entity.type].sprite.frameWidth,
                height: ENTITY_DEFS[entity.type].sprite.frameHeight,
                frame: 0,
                frameTick: 0,
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


function createEntity(type, x, y) {
    const def = ENTITY_DEFS[type];

    return {
        type,
        def,
        x,
        y,
        vx: 0,
        vy: 0,
        frame: 0,
        frameTimer: 0,
        facing: 1 // 1 = right, -1 = left
    };
}

// --- Update Entities ---
function updateEntities() {
    // Simple enemy movement (back and forth)
    gameState.enemies.forEach(enemy => {
        if (!enemy.active) return;

        // TODO: Add enemy AI
    });
}

function updateEntityAnimation(ent, dt) {
    const def = ent.def;
    const frameTime = 1 / def.animation.fps;

    ent.frameTimer += dt;

    if (ent.frameTimer >= frameTime) {
        ent.frameTimer = 0;
        ent.frame = (ent.frame + 1) % def.sprite.frames;
    }
}

function renderEntity(ent) {
    const def = ent.def;
    const img = imageCache[def.image];
    if (!img || !img.complete) return;

    const frameW = def.sprite.frameWidth;
    const frameH = def.sprite.frameHeight;
    const frames = def.sprite.frames;
    const row = def.sprite.row || 0;

    // current frame
    const frameX = (ent.frame % frames) * frameW;
    const frameY = row * frameH;

    const offsetY = ent.height - def.render.height
    const offsetX = ent.width - def.render.width;
    ctx.drawImage(
        img,
        frameX, frameY, frameW, frameH,       // source rectangle
        ent.x - gameState.cameraX,
        ent.y - gameState.cameraY - offsetY,
        ent.width,
        ent.height
    );

    // simple animation tick
    ent.frameTick = (ent.frameTick || 0) + 1;
    if (ent.frameTick >= 10) {
        ent.frameTick = 0;
        ent.frame = (ent.frame + 1) % frames;
    }
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
    // Enemies / NPCs
    gameState.enemies.forEach(ent => {
        if (!ent.active) return;
        renderEntity(ent);   // ← call our sprite renderer here
    });
}

