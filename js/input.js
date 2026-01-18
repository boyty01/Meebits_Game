// -- has the user interacted with the page yet?
let firstInteract = false;
let usingTouch = false;

// --- Input State ---
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
    Shift:false
};


// input handlers
document.addEventListener('keydown', (e) => {
    if(!firstInteract){
        sounds.intromusic.loop = true;
        sounds.intromusic.play();
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


// Reference buttons
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const jumpBtn = document.getElementById('jump-btn');

function bindTouchButton(btn, keyName) {
  // When finger touches down, set key to true
  btn.addEventListener('touchstart', e => {
    handleFirstInteract();
    usingTouch = true;
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

function handleFirstInteract() {
    if(!firstInteract) {
        sounds.music.loop = true;
        sounds.music.play();
        firstInteract = true;
    }
}

// Bind the buttons
bindTouchButton(leftBtn, 'ArrowLeft');
bindTouchButton(rightBtn, 'ArrowRight');
bindTouchButton(jumpBtn, 'Space');

