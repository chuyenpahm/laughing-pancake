const BOARD_SIZE = 10;
const MINE_COUNT = 12;
const TIME_LIMIT = 180;

const boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset-btn');
const mineCountElement = document.getElementById('mine-count');
const timerElement = document.getElementById('timer');
const statusElement = document.getElementById('status');
const fireworksCanvas = document.getElementById('fireworks');
const gameFeedbackElement = document.getElementById('game-feedback');
const fireworksContext = fireworksCanvas.getContext('2d');

let board = [];
let gameOver = false;
let firstMove = true;
let flaggedCount = 0;
let timeLeft = TIME_LIMIT;
let timerId = null;
let audioContext = null;
let fireworksFrameId = null;
let feedbackTimeoutId = null;

function unlockAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Trình duyệt không hỗ trợ âm thanh trò chơi.');
      return;
    }
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch((error) => {
      console.warn('Không thể bật âm thanh trò chơi:', error);
    });
  }
}

function playApplause() {
  if (!audioContext) return;

  const sampleCount = Math.floor(audioContext.sampleRate * 0.12);
  const noiseBuffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    noise[i] = Math.random() * 2 - 1;
  }

  const now = audioContext.currentTime;
  for (let i = 0; i < 28; i += 1) {
    const startTime = now + Math.random() * 1.8;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    source.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start(startTime);
    source.stop(startTime + 0.12);
  }
}

function playBoo() {
  if (!audioContext) return;

  const now = audioContext.currentTime;
  const duration = 1.5;
  const oscillator = audioContext.createOscillator();
  const undertone = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  const wobble = audioContext.createOscillator();
  const wobbleDepth = audioContext.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(145, now);
  oscillator.frequency.linearRampToValueAtTime(118, now + duration);
  undertone.type = 'triangle';
  undertone.frequency.setValueAtTime(138, now);
  undertone.frequency.linearRampToValueAtTime(112, now + duration);
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
  gain.gain.setValueAtTime(0.12, now + 1.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  wobble.type = 'sine';
  wobble.frequency.value = 4;
  wobbleDepth.gain.value = 5;
  wobble.connect(wobbleDepth);
  wobbleDepth.connect(oscillator.frequency);

  oscillator.connect(filter);
  undertone.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  undertone.start(now);
  wobble.start(now);
  oscillator.stop(now + duration);
  undertone.stop(now + duration);
  wobble.stop(now + duration);
}

function showFireworks() {
  const context = fireworksContext;
  if (!context) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  fireworksCanvas.width = Math.floor(width * pixelRatio);
  fireworksCanvas.height = Math.floor(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const particles = [];
  const startTime = performance.now();
  let lastBurstTime = startTime - 400;

  function burst() {
    const x = width * (0.12 + Math.random() * 0.76);
    const y = height * (0.12 + Math.random() * 0.48);
    const hue = Math.floor(Math.random() * 360);

    for (let i = 0; i < 42; i += 1) {
      const angle = (Math.PI * 2 * i) / 42;
      const speed = 1.2 + Math.random() * 3.2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue,
        age: 0,
        lifetime: 55 + Math.random() * 35,
      });
    }
  }

  function animate(now) {
    const elapsed = now - startTime;
    if (elapsed < 2300 && now - lastBurstTime >= 380) {
      burst();
      lastBurstTime = now;
    }

    context.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.025;
      particle.age += 1;

      if (particle.age >= particle.lifetime) {
        particles.splice(i, 1);
        continue;
      }

      context.globalAlpha = 1 - particle.age / particle.lifetime;
      context.fillStyle = `hsl(${particle.hue}, 100%, 65%)`;
      context.beginPath();
      context.arc(particle.x, particle.y, 2.5, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    if (elapsed < 3300) {
      fireworksFrameId = requestAnimationFrame(animate);
    } else {
      context.clearRect(0, 0, width, height);
      fireworksFrameId = null;
    }
  }

  fireworksFrameId = requestAnimationFrame(animate);
}

function celebrateWin() {
  gameFeedbackElement.textContent = 'Chúc mừng! Bạn đã chiến thắng! 🎉';
  gameFeedbackElement.hidden = false;
  showFireworks();
  playApplause();
  feedbackTimeoutId = window.setTimeout(() => {
    gameFeedbackElement.hidden = true;
  }, 3300);
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getNeighbors(row, col) {
  const neighbors = [];

  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      if (r === row && c === col) continue;
      if (inBounds(r, c)) {
        neighbors.push({ row: r, col: c });
      }
    }
  }

  return neighbors;
}

function placeMines(excludeRow, excludeCol) {
  const positions = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (row === excludeRow && col === excludeCol) continue;
      positions.push({ row, col });
    }
  }

  for (let i = positions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (let i = 0; i < MINE_COUNT; i += 1) {
    const { row, col } = positions[i];
    board[row][col].mine = true;
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col].mine) continue;
      board[row][col].adjacent = getNeighbors(row, col).filter(
        ({ row: r, col: c }) => board[r][c].mine
      ).length;
    }
  }
}

function revealAllMines() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = board[row][col];
      if (cell.flagged && !cell.mine) {
        cell.flagged = false;
      }

      if (cell.mine) {
        cell.flagged = false;
        cell.revealed = true;
      }
    }
  }
}

function revealEmptyArea(row, col) {
  const queue = [{ row, col }];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.row}-${current.col}`;

    if (visited.has(key)) continue;
    visited.add(key);

    const cell = board[current.row][current.col];
    if (cell.flagged || cell.revealed) continue;

    cell.revealed = true;

    if (cell.adjacent === 0) {
      for (const neighbor of getNeighbors(current.row, current.col)) {
        const neighborCell = board[neighbor.row][neighbor.col];
        if (!neighborCell.revealed && !neighborCell.mine && !neighborCell.flagged) {
          queue.push(neighbor);
        }
      }
    }
  }
}

function checkWin() {
  let revealedSafeCells = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = board[row][col];
      if (!cell.mine && cell.revealed) {
        revealedSafeCells += 1;
      }
    }
  }

  return revealedSafeCells === BOARD_SIZE * BOARD_SIZE - MINE_COUNT;
}

function setStatus(text) {
  statusElement.textContent = text;
}

function updateTimerDisplay() {
  timerElement.textContent = String(timeLeft);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function endGame(message, outcome) {
  gameOver = true;
  revealAllMines();
  stopTimer();
  setStatus(message);
  renderBoard();

  if (outcome === 'win') {
    celebrateWin();
  } else {
    playBoo();
  }
}

function handleTimeout() {
  if (gameOver) return;

  endGame('Hết giờ! Đáp án đã lộ.', 'loss');
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    if (gameOver) {
      stopTimer();
      return;
    }

    timeLeft -= 1;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      handleTimeout();
    }
  }, 1000);
}

function revealAt(row, col) {
  if (gameOver) return;

  unlockAudio();

  if (firstMove) {
    placeMines(row, col);
    firstMove = false;
    startTimer();
  }

  const selectedCell = board[row][col];
  if (selectedCell.flagged || selectedCell.revealed) return;

  if (selectedCell.mine) {
    selectedCell.revealed = true;
    endGame('Boom! Đáp án đã lộ.', 'loss');
    return;
  }

  revealEmptyArea(row, col);

  if (checkWin()) {
    endGame('Bạn thắng! Đáp án đã lộ.', 'win');
  } else {
    setStatus('Đang chơi');
  }

  renderBoard();
}

function toggleFlagAt(row, col) {
  if (gameOver) return;

  const selectedCell = board[row][col];
  if (selectedCell.revealed) return;

  selectedCell.flagged = !selectedCell.flagged;
  flaggedCount += selectedCell.flagged ? 1 : -1;
  mineCountElement.textContent = String(MINE_COUNT - flaggedCount);

  if (selectedCell.flagged) {
    setStatus('Đã đặt cờ');
  } else {
    setStatus('Đã bỏ cờ');
  }

  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = '';

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = board[row][col];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.dataset.row = String(row);
      button.dataset.col = String(col);

      if (cell.revealed) {
        button.classList.add('revealed');
      }

      if (cell.flagged) {
        button.classList.add('flagged');
        button.textContent = '🚩';
      } else if (cell.revealed && cell.mine) {
        button.classList.add('mine');
        button.textContent = '💣';
      } else if (cell.revealed && cell.adjacent > 0) {
        button.textContent = cell.adjacent;
        button.dataset.value = String(cell.adjacent);
      } else if (cell.revealed) {
        button.textContent = '';
      }

      if (cell.revealed && cell.mine) {
        button.classList.add('mine');
      }

      button.addEventListener('click', () => {
        revealAt(row, col);
      });

      button.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        toggleFlagAt(row, col);
      });

      boardElement.appendChild(button);
    }
  }
}

function resetGame() {
  if (fireworksFrameId !== null) {
    cancelAnimationFrame(fireworksFrameId);
    fireworksFrameId = null;
  }
  if (feedbackTimeoutId !== null) {
    clearTimeout(feedbackTimeoutId);
    feedbackTimeoutId = null;
  }
  if (fireworksContext) {
    fireworksContext.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  }
  gameFeedbackElement.hidden = true;
  board = createEmptyBoard();
  gameOver = false;
  firstMove = true;
  flaggedCount = 0;
  timeLeft = TIME_LIMIT;
  mineCountElement.textContent = String(MINE_COUNT);
  updateTimerDisplay();
  setStatus('Sẵn sàng');
  stopTimer();
  renderBoard();
}

function handleKeyboardShortcuts(event) {
  if (event.key === 'r' || event.key === 'R') {
    event.preventDefault();
    resetGame();
  }
}

resetButton.addEventListener('click', resetGame);
document.addEventListener('keydown', handleKeyboardShortcuts);
resetGame();
