// --- Intro Sequence State ---
const introState = {
  active: true,
  phase: -1, // -1: press to start, 0: fade title, 1: scroll text, 2: final prompt
  timer: 0,
  scrollY: 0
};

const introFinished = false;

// --- Intro text content ---
const introText = [
  '',
  'Somewhere deep inside the blockchain,', 
  'trouble is brewing.',
  '',
  'The Meebits have a job to do.',
  '',
  'The Gas Goblins are running wild — ',
  'clogging blocks, stealing bandwidth,',
  'and sending Ethereum gas prices sky-high.',
  '',
  'Every goblin left standing',
  'means slower transactions,', 
  'higher fees, and pure on-chain chaos.',
  '',
  'Your mission is simple:',
  '',
  '  🟡 Collect tokens',
  '  👹 Dodge Gas Goblins',
  '  ⚡ Keep gas low',
  '',
  'Jump, run, fight, and clear the chain —',
  'one block at a time.',
  '',
  'No goblins. No congestion. Cheap gas.',
  '',
  ''
];

// --- Text wrapping helper ---
function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

// --- Process text with wrapping ---
let wrappedIntroText = [];

function prepareIntroText() {
  ctx.font = '6px "Press Start 2P", monospace';
  const maxWidth = canvas.width - 40;
  
  wrappedIntroText = [];
  introText.forEach(line => {
    if (line === '') {
      wrappedIntroText.push('');
    } else {
      const wrapped = wrapText(line, maxWidth);
      wrappedIntroText.push(...wrapped);
    }
  });
}

prepareIntroText();

// --- Intro Sequence ---
function renderIntro() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Phase -1: Initial "Press to Start"
  if (introState.phase === -1) {
    ctx.fillStyle = '#ffd700';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('MEEBITS', centerX, centerY - 30);
    
    const blinkAlpha = Math.abs(Math.sin(introState.timer * 0.05));
    ctx.fillStyle = `rgba(255, 255, 255, ${blinkAlpha})`;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('PRESS Jump TO START', centerX, centerY + 30);
  }
  
  // Phase 0: Fade in/out title "GAS WARS"
  else if (introState.phase === 0) {
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
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillText('⚔️ THE GAS WARS ⚔️', centerX, centerY);
  }
  
  // Phase 1: Scrolling text
  else if (introState.phase === 1) {
    ctx.font = '10px "Press Start 2P", monospace';
    
    const lineHeight = 12;
    const startY = introState.scrollY;
    
    // Draw each line of text
    wrappedIntroText.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      
      // Only draw if on screen
      if (y > -lineHeight && y < canvas.height + lineHeight) {
        ctx.fillStyle = '#fff';
        ctx.fillText(line, centerX, y);
      }
    });
    
    // Scroll up
    introState.scrollY -= 0.3;
    
    // When text has scrolled off screen, move to final phase
    const totalHeight = wrappedIntroText.length * lineHeight;
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
    if (introState.phase === -1) {
      // First press - start music and begin intro
      if (sounds.bgMusic) {
        sounds.bgMusic.play().catch(err => console.log('Audio play failed:', err));
      }
      introState.phase = 0;
      introState.timer = 0;
    } else if (introState.phase >= 1) {
      // Later presses - skip to game
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

function handleIntroConfirm() {
    if(introState.active == false) return;
  if (introState.phase === -1) {
    // First press: start intro
    if (sounds.bgMusic) {
      sounds.bgMusic.play().catch(err =>
        console.log('Audio play failed:', err)
      );
    }
    introState.phase = 0;
    introState.timer = 0;
  } else if (introState.phase >= 1) {
    // Skip to game
    
    introState.active = false;
    startGame();
  }
}

const jumpButton = document.getElementById('jump-btn');

if (jumpButton) {
  jumpButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // prevents double fire / scroll
    handleIntroConfirm();
  });

  // Optional: allow mouse click for desktop testing
  jumpButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleIntroConfirm();
  });
}