const BOARD_SIZE = 10;
const MINE_COUNT = 12;
const TIME_LIMIT = 180;

const boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset-btn');
const mineCountElement = document.getElementById('mine-count');
const timerElement = document.getElementById('timer');
const statusElement = document.getElementById('status');

let board = [];
let gameOver = false;
let firstMove = true;
let flaggedCount = 0;
let timeLeft = TIME_LIMIT;
let timerId = null;

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

function endGame(message) {
  gameOver = true;
  revealAllMines();
  stopTimer();
  setStatus(message);
  renderBoard();
}

function handleTimeout() {
  if (gameOver) return;

  endGame('Hết giờ! Đáp án đã lộ.');
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

  if (firstMove) {
    placeMines(row, col);
    firstMove = false;
    startTimer();
  }

  const selectedCell = board[row][col];
  if (selectedCell.flagged || selectedCell.revealed) return;

  if (selectedCell.mine) {
    selectedCell.revealed = true;
    endGame('Boom! Đáp án đã lộ.');
    return;
  }

  revealEmptyArea(row, col);

  if (checkWin()) {
    endGame('Bạn thắng! Đáp án đã lộ.');
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
