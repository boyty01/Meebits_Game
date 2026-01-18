// --- Sounds ---
const sounds = {
    jump: new Audio('sound/jump.wav'),
    collectCoin: new Audio('sound/coincollect.wav'),
    music: new Audio("sound/8bitmusic.wav"),
    gameover: new Audio("sound/gameover.wav"),
    success: new Audio("sound/success.wav")
};

//  preload sound
for (const key in sounds) {
    sounds[key].volume = 0.5; // default volume
    sounds[key].load();
}