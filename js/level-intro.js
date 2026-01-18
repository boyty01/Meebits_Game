// --- Intro Sequence State ---
const introState = {
  active: true,
  phase: 0, // 0: fade title, 1: scroll text, 2: final prompt
  timer: 0,
  scrollY: 0
};

// --- Intro text content ---
const introText = [
  '',
  'Somewhere deep inside', 
  'the blockchain,',
  'trouble is brewing.',
  '',
  'The Meebits have a job to do.',
  '',
  'The Gas Goblins are running wild —',
  'clogging blocks, stealing bandwidth,',
  'and sending Ethereum gas prices',
  'sky-high.',
  '',
  'Every goblin left standing means',
  'slower transactions, higher fees,',
  'and pure on-chain chaos.',
  '',
  'Your mission is simple:',
  '',
  '  🟡 Collect tokens',
  '  👹 Destroy Gas Goblins',
  '  ⚡ Keep gas low',
  '',
  'Jump, run, fight, and clear',
  'the chain — one block at a time.',
  '',
  'No goblins.',
  'No congestion.',
  'Cheap gas.',
  '',
  ''
];

// --- Intro Sequence ---
function renderIntro() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Phase 0: Fade in/out title "GAS WARS"
  if (introState.phase === 0) {
    let alpha = 0;
    
    // Fade in (0-60 frames)
    if (introState.timer < 60) {
      alpha = introState.timer / 60;
    }
    // Hold (60-180 frames)
    else if (introState.timer < 180) {
      alpha = 1;
    }
    // Fade out (180-240 frames)
    else if (introState.timer < 240) {
      alpha = 1 - (introState.timer - 180) / 60;
    }
    // Move to next phase
    else {
      introState.phase = 1;
      introState.timer = 0;
      introState.scrollY = canvas.height;
    }
    
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('⚔️ THE GAS WARS ⚔️', centerX, centerY);
  }
  
  // Phase 1: Scrolling text
  else if (introState.phase === 1) {
    ctx.font = '12px "Press Start 2P", monospace';
    
    const lineHeight = 12;
    const startY = introState.scrollY;
    
    // Draw each line of text
    introText.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      
      // Only draw if on screen
      if (y > -lineHeight && y < canvas.height + lineHeight) {
        ctx.fillStyle = '#fff';
        ctx.fillText(line, centerX, y);
      }
    });
    
    // Scroll up
    introState.scrollY -= 0.8;
    
    // When text has scrolled off screen, move to final phase
    const totalHeight = introText.length * lineHeight;
    if (introState.scrollY < -totalHeight - 50) {
      introState.phase = 2;
      introState.timer = 0;
    }
  }
  
  // Phase 2: Final prompt
  else if (introState.phase === 2) {
    const blinkAlpha = Math.abs(Math.sin(introState.timer * 0.05));
    ctx.fillStyle = `rgba(255, 215, 0, ${blinkAlpha})`;
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('Press SPACE to fix the chain', centerX, centerY);
  }
  
  introState.timer++;
}

// --- Intro Update Loop ---
function introLoop() {
  if (!introState.active) return;
  
  renderIntro();
  requestAnimationFrame(introLoop);
}

// --- Check for skip input ---
function checkIntroSkip(e) {
  if (e.key === ' ' || e.key === 'Space') {
    // Allow skip during scroll or final phase
    if (introState.phase >= 1) {
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

// Remove/comment out your existing calls:
// initializeLevel();
// gameLoop();