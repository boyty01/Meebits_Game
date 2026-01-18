const collectibleSprite = new Image();
let collectibleReady = false;
collectibleSprite.src = 'entities/eth.png';// path to your image
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
     spawn: {
        image: ``,
         sprite: {
            frameWidth: 468,   
            frameHeight: 468,
            frames: 1,
            row: 0
        },
        render: {
            width: 64,
            height: 64,
            offsetY:40,
            offsetX:0,
            scale: 1
        },
        collision: {
            width: 16,
            height: 60,
            offsetX: 0,
            offsetY: -40
        }
    },
    goal: {
        image: `entities/ethflag.png`,
         sprite: {
            frameWidth: 468,   
            frameHeight: 468,
            frames: 1,
            row: 0
        },
        render: {
            width: 64,
            height: 64,
            offsetY:40,
            offsetX:0,
            scale: 1
        },
        collision: {
            width: 16,
            height: 60,
            offsetX: 0,
            offsetY: -40
        }
    },
    enemy1: {
        image: 'entities/goblin.png',
        sprite: {
            frameWidth: 64,   // actual pixels in the image
            frameHeight: 64,
            frames: 9,
            row: 1
        },
        render: {
            width: 40,
            height: 40,
            offsetY:38,
            offsetX:-20,
            scale: 1
        },
        collision: {
            width: 16,
            height: 20,
            offsetX: 8,
            offsetY: 4
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
    },

    breakable: {
        image: `entities/bitcoin_s.png`,
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
                width: ENTITY_DEFS[entity.type].render.width,
                height: ENTITY_DEFS[entity.type].render.height,
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
            } else if (entity.type === "goal") {
                gameState.goal = obj; // only one goal. editor should be updated to reflect this limitation.
            } else if (entity.type === "spawn") {
                gameState.playerSpawn = obj;
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

    const offsetY = def.render.offsetY
    const offsetX = def.render.offsetX;
    ctx.drawImage(
        img,
        frameX, frameY, frameW, frameH,       // source rectangle
        ent.x - gameState.cameraX - offsetX,
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

    renderEntity(gameState.goal);
}

