 const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const playBtn = document.getElementById('play-btn');
    const errorMessage = document.getElementById('error-message');
    const fileNameDisplay = document.getElementById('file-name');

    let selectedFile = null;

    // Click to open file browser
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
      handleFile(e.target.files[0]);
    });

    // Drag and drop support
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#ffd700';
    });

    uploadArea.addEventListener('dragleave', () => {
      if (!selectedFile) {
        uploadArea.style.borderColor = '#666';
      }
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
      if (!file) return;

      // Validate file type
      if (!file.name.endsWith('.json')) {
        showError('Please select a valid JSON file!');
        return;
      }

      selectedFile = file;
      fileNameDisplay.textContent = `✓ ${file.name}`;
      uploadArea.classList.add('has-file');
      playBtn.disabled = false;
      errorMessage.style.display = 'none';
    }

   const spriteIdInput = document.getElementById('sprite-id');

// Validate the SPRITE_ID
function getSpriteURL(spriteId) {
  if (!spriteId) return `https://files.meebits.app/sprites/17600.png`; // use default
  // basic validation: only allow alphanumeric and -/_ characters
  const validId = /^[a-zA-Z0-9_-]+$/.test(spriteId);
  if (!validId) return null;
  return `https://files.meebits.app/sprites/${spriteId}.png`;
}


    // Show error message
    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
    }

    const defaultBtn = document.getElementById('default-btn');
    const spriteInput = document.getElementById('sprite-id');



    function showError(msg) {
      const errorMessage = document.getElementById('error-message');
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    }

    // --- Play uploaded level ---
    playBtn.addEventListener('click', () => {
      if (!selectedFile) {
        showError('Please select a level file first!');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const levelData = JSON.parse(e.target.result);
          sessionStorage.setItem('currentLevel', JSON.stringify(levelData));
          sessionStorage.setItem('levelFileName', selectedFile.name);

          // Store sprite URL if provided
          const spriteID = spriteInput.value? spriteInput.value.trim() : "17600";
          console.log(spriteID);
          if (spriteID) sessionStorage.setItem('playerSprite', `https://files.meebits.app/sprites/${spriteID}.png`);

          window.location.href = 'play.html';
        } catch (err) {
          showError('Invalid JSON file! Please check the format.');
          console.error(err);
        }
      };
      reader.readAsText(selectedFile);
    });

    // --- Play default level ---
    defaultBtn.addEventListener('click', () => {
     fetch('levels/level10-3.json') // relative path to your default level
        .then(res => res.json())
        .then(levelData => {
          sessionStorage.setItem('currentLevel', JSON.stringify(levelData));
          sessionStorage.setItem('levelFileName', 'Default Level');

          // Store sprite URL if provided
         const spriteID = spriteInput.value? spriteInput.value.trim() : "17600";
         console.log(spriteID)
          if (spriteID) sessionStorage.setItem('playerSprite', `https://files.meebits.app/sprites/${spriteID}.png`);

          window.location.href = 'play.html';
        })
        .catch(err => {
          showError('Failed to load default level!');
          console.error(err);
        });
    });