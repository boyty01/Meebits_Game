// --- Intro Sequence State ---
const introState = {
  active: true,
  phase: 0,
  timer: 0,
  skipPressed: false
};

// --- Intro Sequence ---
function renderIntro() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Phase 0: Fade in title
  if (introState.phase === 0) {
    const alpha = Math.min(introState.timer / 60, 1); // Fade in over 1 second
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText('MEEBITS', centerX, centerY - 40);
    
    if (introState.timer > 60) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min((introState.timer - 60) / 30, 1)})`;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('PRESENTS', centerX, centerY);
    }
    
    if (introState.timer > 150) {
      introState.phase = 1;
      introState.timer = 0;
    }
  }
  
  // Phase 1: Game title
  else if (introState.phase === 1) {
    const alpha = Math.min(introState.timer / 30, 1);
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('THE GAS WARS', centerX, centerY - 20);
  //  ctx.fillText('BEGINS', centerX, centerY + 10);
    
    if (introState.timer > 90) {
      ctx.fillStyle = `rgba(150, 150, 150, ${Math.sin(introState.timer * 0.1)})`;
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText('PRESS SPACE TO START', centerX, centerY + 60);
    }
  }
  
  introState.timer++;
}

// --- Intro Update Loop ---
function introLoop() {
  if (!introState.active) return;
  console.log("loops")
  renderIntro();
  requestAnimationFrame(introLoop);
}

// --- Check for skip input ---
function checkIntroSkip(e) {
  if (e.key === ' ' || e.key === 'Space') {
    if (introState.phase === 1 && introState.timer > 90) {
      introState.active = false;
      document.removeEventListener('keydown', checkIntroSkip);
      startGame();
    }
  }
}

// --- Start the actual game ---
function startGame() {
  loadLevel();
}

// --- Initialize intro instead of game ---
document.addEventListener('keydown', checkIntroSkip);
introLoop();
