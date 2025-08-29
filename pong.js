// pong.js - Part of 2LD's Pong recreation but better - Licensed under The 2LD OSL

// ---- CANVAS & RESPONSIVENESS ----
const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
let width = 800, height = 500;
function resizeCanvas() {
  const ratio = 16 / 10;
  let w = window.innerWidth * 0.98,
    h = window.innerHeight * 0.75;
  if (w / h > ratio) w = h * ratio;
  else h = w / ratio;
  canvas.width = width = Math.max(340, w | 0);
  canvas.height = height = Math.max(215, h | 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---- GAME OBJECTS ----
const PADDLE_WIDTH = 0.018 * width,
  PADDLE_HEIGHT = 0.18 * height,
  BALL_SIZE = 0.036 * width;
let theme = {
  bg: '#111',
  net: '#888',
  left: '#32e6e6',
  right: '#ff5555',
  ball: '#ffffff',
  score: '#fff'
};

// Game state
let state = {
  mode: '1p', // '1p' or '2p'
  paused: false,
  menu: true,
  round: 1,
  roundsToWin: 3,
  left: { score: 0, rounds: 0 },
  right: { score: 0, rounds: 0 },
  achievement: [],
  stats: { hits: 0, games: 0, wins: 0, streak: 0, maxStreak: 0 }
};

// Paddles
let leftPaddle = {
  x: 10,
  y: height / 2 - PADDLE_HEIGHT / 2,
  w: PADDLE_WIDTH,
  h: PADDLE_HEIGHT,
  color: theme.left
};
let rightPaddle = {
  x: width - 10 - PADDLE_WIDTH,
  y: height / 2 - PADDLE_HEIGHT / 2,
  w: PADDLE_WIDTH,
  h: PADDLE_HEIGHT,
  color: theme.right
};

// Ball(s)
function newBall() {
  return {
    x: width / 2,
    y: height / 2,
    size: BALL_SIZE,
    speed: 6,
    dx: (Math.random() < 0.5 ? -1 : 1) * 6,
    dy: (Math.random() - 0.5) * 6,
    color: theme.ball
  };
}
let balls = [newBall()];

// Power-ups
let powerups = [];
const POWERUP_TYPES = ['paddle+', 'paddle-', 'multi', 'speed+', 'speed-'];
function spawnPowerup() {
  let type = POWERUP_TYPES[(Math.random() * POWERUP_TYPES.length) | 0];
  let rx = Math.random() * (width - 80) + 40,
    ry = Math.random() * (height - 80) + 40;
  powerups.push({ x: rx, y: ry, type, active: true, size: 32, t: 0 });
}
let powerupTimer = 0;

// ---- AI ----
const AIDifficulties = {
  easy:   { prediction: 0.15, speed: 3, reaction: 0.5, error: 0.60, missChance: 0.10 },
  medium: { prediction: 0.4, speed: 4, reaction: 0.7, error: 0.27, missChance: 0.06 },
  hard:   { prediction: 0.8, speed: 6, reaction: 0.92, error: 0.1, missChance: 0.03 }
};
let aiLevel = 'medium';
function setAIDifficulty(level) {
  aiLevel = level;
  document.getElementById('aiSelect').value = level;
}
function predictBallY(ball, paddle) {
  let bx = ball.x,
    by = ball.y,
    dx = ball.dx,
    dy = ball.dy,
    steps = 0;
  while ((dx > 0 && bx < paddle.x) || (dx < 0 && bx > paddle.x)) {
    bx += dx;
    by += dy;
    if (by - ball.size / 2 < 0 || by + ball.size / 2 > height) dy = -dy;
    if (++steps > 2000) break;
  }
  return by;
}
function aiMove(ball, pad, diff) {
  let d = AIDifficulties[diff] || AIDifficulties.medium;
  if (Math.random() < (d.missChance || 0)) return;
  let isBallComing =
    (ball.dx > 0 && pad.x > ball.x) || (ball.dx < 0 && pad.x < ball.x);
  if (Math.random() > d.reaction || !isBallComing) return;
  let targetY =
    Math.random() < d.prediction
      ? predictBallY(ball, pad)
      : ball.y + (Math.random() - 0.5) * d.error * height;
  let center = pad.y + pad.h / 2;
  if (center < targetY - 10) pad.y += d.speed;
  else if (center > targetY + 10) pad.y -= d.speed;
  pad.y = Math.max(0, Math.min(height - pad.h, pad.y));
}

// ---- SOUND ----
const SFX = {
  bounce: new Audio('sounds/bounce.mp3'),
  score: new Audio('sounds/score.mp3'),
  power: new Audio('sounds/powerup.mp3'),
  click: new Audio('sounds/click.mp3'),
  music: new Audio('music/bg.mp3')
};
SFX.music.loop = true;
let soundOn = true,
  musicOn = true;
function playSFX(name) {
  if (soundOn && SFX[name]) SFX[name].currentTime = 0, SFX[name].play();
}
function playMusic() {
  if (musicOn) SFX.music.play();
  else SFX.music.pause();
}

// ---- SCORE, LEADERBOARD, STATS ----
let leaderboard = [];
function updateScore(winner) {
  state[winner].score++;
  playSFX('score');
  updateScoreboard();
  if (state[winner].score >= 5) {
    state[winner].rounds++;
    state.left.score = 0;
    state.right.score = 0;
    state.round++;
    updateScoreboard();
    if (state[winner].rounds >= state.roundsToWin) {
      // Game over
      state.stats.games++;
      if (winner === 'left') {
        state.stats.wins++;
        state.stats.streak++;
        state.stats.maxStreak = Math.max(state.stats.streak, state.stats.maxStreak);
      }
      else state.stats.streak = 0;
      updateLeaderboard(state[winner].rounds, winner);
      showMenu('win', winner);
    }
    else showMenu('round', winner);
  }
}
function updateScoreboard() {
  document.getElementById('leftScore').textContent = state.left.score;
  document.getElementById('leftRounds').textContent = state.left.rounds;
  document.getElementById('rightScore').textContent = state.right.score;
  document.getElementById('rightRounds').textContent = state.right.rounds;
  document.getElementById('roundInfo').textContent = `Round ${state.round} / ${state.roundsToWin}`;
}
function drawScoreboard() {
  // All HTML-driven.
}

// Leaderboard
function loadLeaderboard() {
  leaderboard = JSON.parse(localStorage.getItem('pongLeaderboard') || '[]');
}
function updateLeaderboard(score, winner) {
  leaderboard.push({ name: winner === 'left' ? 'Player' : 'CPU', score, date: Date.now() });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 5);
  localStorage.setItem('pongLeaderboard', JSON.stringify(leaderboard));
}
function resetLeaderboard() {
  leaderboard = [];
  localStorage.removeItem('pongLeaderboard');
  renderLeaderboard();
}
function renderLeaderboard() {
  let list = document.getElementById('leaderboardList');
  list.innerHTML = '';
  leaderboard.forEach((item, i) => {
    let li = document.createElement('li');
    li.textContent = `${item.name} — ${item.score} rounds (${new Date(item.date).toLocaleDateString()})`;
    list.appendChild(li);
  });
}

// ---- POWER-UPS ----
function applyPowerup(pad, type) {
  playSFX('power');
  showAchievementToast(type.toUpperCase() + " Power-Up!");
  switch (type) {
    case 'paddle+':
      pad.h *= 1.3;
      setTimeout(() => pad.h /= 1.3, 7000);
      break;
    case 'paddle-':
      pad.h *= 0.7;
      setTimeout(() => pad.h /= 0.7, 7000);
      break;
    case 'multi':
     if (balls.length < 3) { // max 3 balls
      balls.push(newBall());
      setTimeout(() => {
       if (balls.length > 1) balls.pop();
      }, 6000);
    }
    break;
    case 'speed+':
      balls.forEach(b => b.speed *= 1.3);
      balls.forEach(b => { b.dx = Math.sign(b.dx) * b.speed; b.dy = Math.sign(b.dy) * b.speed; });
      setTimeout(() => balls.forEach(b => b.speed /= 1.3), 7000);
      break;
    case 'speed-':
      balls.forEach(b => b.speed *= 0.7);
      balls.forEach(b => { b.dx = Math.sign(b.dx) * b.speed; b.dy = Math.sign(b.dy) * b.speed; });
      setTimeout(() => balls.forEach(b => b.speed /= 0.7), 7000);
      break;
  }
}

// ---- 2P MODE ----
let keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });
function handle2PInput() {
  if (!state.paused && state.mode === '2p') {
    if (keys['w']) leftPaddle.y -= 7;
    if (keys['s']) leftPaddle.y += 7;
    if (keys['ArrowUp']) rightPaddle.y -= 7;
    if (keys['ArrowDown']) rightPaddle.y += 7;
    leftPaddle.y = Math.max(0, Math.min(height - leftPaddle.h, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(height - rightPaddle.h, rightPaddle.y));
  }
}

// ---- PAUSE/MENU ----
function showMenu(type, winner) {
  state.paused = true;
  state.menu = true;
  if (type === 'win') {
    showAchievementToast(`${winner === 'left' ? 'You' : 'CPU'} win the match!`);
    setTimeout(() => { state.paused = false; state.menu = false; resetGame(); }, 2200);
  } else if (type === 'round') {
    showAchievementToast(`${winner === 'left' ? 'You' : 'CPU'} win the round!`);
    setTimeout(() => { state.paused = false; state.menu = false; balls = [newBall()]; powerups = []; }, 1200);
  }
}
function resetGame() {
  state.left.score = state.right.score = 0;
  state.left.rounds = state.right.rounds = 0;
  state.round = 1;
  leftPaddle.y = rightPaddle.y = height / 2 - PADDLE_HEIGHT / 2;
  balls = [newBall()];
  powerups = [];
  updateScoreboard();
}

// ---- CUSTOMIZATION ----
function setTheme(t) {
  theme = { ...theme, ...t };
  leftPaddle.color = theme.left;
  rightPaddle.color = theme.right;
  balls.forEach(b => b.color = theme.ball);
  canvas.style.background = theme.bg;
}
function toggleSound() { soundOn = !soundOn; }
function toggleMusic() { musicOn = !musicOn; playMusic(); }
function setBG(bg) { theme.bg = bg; canvas.style.background = bg; }

// ---- FULLSCREEN ----
function toggleFullscreen() {
  if (!document.fullscreenElement) canvas.requestFullscreen();
  else document.exitFullscreen();
}

// ---- ANIMATED BACKGROUND ----
function drawBackground() {
  let t = performance.now() / 8000;
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = `rgba(${180 + i * 3},${60 + i * 8},${150 + i * 5},.07)`;
    ctx.beginPath();
    ctx.arc(width / 2 + Math.sin(t + i) * width / 2.1, height / 2 + Math.cos(t - i) * height / 2.7, 80 + 40 * Math.sin(t + i * 1.3), 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = theme.bg;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

// ---- TUTORIAL/HELP ----
function showHelpOverlay() { document.getElementById('helpOverlay').classList.remove('hidden'); }
function hideHelpOverlay() { document.getElementById('helpOverlay').classList.add('hidden'); }

// ---- ACHIEVEMENTS & STATS ----
function checkAchievements() {
  if (state.stats.wins === 1 && !state.achievement.includes("First Win")) { state.achievement.push("First Win"); showAchievementToast("Achievement: First Win!"); }
  if (state.stats.maxStreak >= 3 && !state.achievement.includes("3 Win Streak")) { state.achievement.push("3 Win Streak"); showAchievementToast("Achievement: 3 Win Streak!"); }
  if (state.stats.hits >= 100 && !state.achievement.includes("100 Hits")) { state.achievement.push("100 Hits"); showAchievementToast("Achievement: 100 Hits!"); }
}
function showAchievementToast(msg) {
  let toast = document.getElementById('achievementToast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 1800);
}

// ---- MOUSE CONTROL ----
canvas.addEventListener('mousemove', function (evt) {
  if (state.mode === '1p' && !state.paused) {
    let rect = canvas.getBoundingClientRect();
    let mouseY = evt.clientY - rect.top;
    leftPaddle.y = mouseY - leftPaddle.h / 2;
    leftPaddle.y = Math.max(0, Math.min(height - leftPaddle.h, leftPaddle.y));
  }
});
canvas.addEventListener('click', function () {
  if (!state.menu && !state.paused) {
    if (state.left.score === 0 && state.right.score === 0) resetGame();
  }
});

// ---- GAME LOOP ----
function update() {
  if (state.paused || state.menu) return;
  handle2PInput();

  // Powerup spawn
  if (++powerupTimer > 240 && Math.random() < 0.01) { spawnPowerup(); powerupTimer = 0; }
  if (balls.length === 0) balls = [newBall()];
  // Move balls
  for (let b of balls) {
    b.x += b.dx;
    b.y += b.dy;
    // Wall bounce
    if (b.y - b.size / 2 < 0 || b.y + b.size / 2 > height) { b.dy = -b.dy; playSFX('bounce'); }
    // Paddle bounce
    let collide = false;
    // Left
    if (b.x - b.size / 2 < leftPaddle.x + leftPaddle.w && b.y + b.size / 2 > leftPaddle.y && b.y - b.size / 2 < leftPaddle.y + leftPaddle.h) {
      b.dx = Math.abs(b.speed); collide = true; state.stats.hits++;
      let cp = b.y - (leftPaddle.y + leftPaddle.h / 2); b.dy = cp / (leftPaddle.h / 2) * b.speed;
    }
    // Right
    if (b.x + b.size / 2 > rightPaddle.x && b.y + b.size / 2 > rightPaddle.y && b.y - b.size / 2 < rightPaddle.y + rightPaddle.h) {
      b.dx = -Math.abs(b.speed); collide = true; state.stats.hits++;
      let cp = b.y - (rightPaddle.y + rightPaddle.h / 2); b.dy = cp / (rightPaddle.h / 2) * b.speed;
    }
    if (collide) playSFX('bounce');
    // Score (fixed: reset dx and dy, remove extra balls/powerups)
    if (b.x < 0) {
     updateScore('right');
     let resetBall = newBall();
     resetBall.dx = Math.abs(resetBall.speed); // To the right
     balls = [resetBall];
     powerups = [];
    }
    if (b.x > width) {
     updateScore('left');
     let resetBall = newBall();
     resetBall.dx = -Math.abs(resetBall.speed); // To the left
     balls = [resetBall];
     powerups = [];
    }
    // Powerup collision
    for (let p of powerups) if (p.active && Math.abs(b.x - p.x) < 30 && Math.abs(b.y - p.y) < 30) {
      p.active = false; applyPowerup(leftPaddle, p.type);
    }
  }
  // Remove inactive powerups
  powerups = powerups.filter(p => p.active);
  // AI
  if (state.mode === '1p') aiMove(balls[0], rightPaddle, aiLevel);
}
function draw() {
  resizeCanvas();
  drawBackground();
  // Paddles
  ctx.fillStyle = leftPaddle.color; ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h);
  ctx.fillStyle = rightPaddle.color; ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);
  // Balls
  for (let b of balls) { ctx.beginPath(); ctx.arc(b.x, b.y, b.size / 2, 0, 7); ctx.fillStyle = b.color; ctx.fill(); }
  // Powerups
  for (let p of powerups) {
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = p.type.includes("paddle") ? "#8ff" : p.type.includes("speed") ? "#f88" : "#ff0";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, 7); ctx.fill();
    ctx.font = `bold ${width / 40 | 0}px Arial`;
    ctx.textAlign = "center"; ctx.fillStyle = "#222";
    ctx.fillText(p.type.replace('+', '↑').replace('-', '↓').replace('multi', 'M'), p.x, p.y + 6);
    ctx.restore();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ---- UI WIRING ----
function hideAllOverlays() {
  document.getElementById('pauseOverlay').classList.add('hidden');
  document.getElementById('settingsOverlay').classList.add('hidden');
  document.getElementById('leaderboardOverlay').classList.add('hidden');
  document.getElementById('helpOverlay').classList.add('hidden');
}
function startGame() {
  hideAllOverlays();
  document.getElementById('menu').style.display = 'none';
  state.paused = false;
  state.menu = false;
  state.mode = '1p';
  resetGame();
  playMusic(); // Only after a user click
}
function start2PGame() {
  hideAllOverlays();
  document.getElementById('menu').style.display = 'none';
  state.paused = false;
  state.menu = false;
  state.mode = '2p';
  resetGame();
  playMusic(); // Only after a user click
}
function pauseGame() {
  state.paused = true;
  document.getElementById('pauseOverlay').classList.remove('hidden');
}
function resumeGame() {
  state.paused = false;
  document.getElementById('pauseOverlay').classList.add('hidden');
}
function showSettings() {
  document.getElementById('settingsOverlay').classList.remove('hidden');
}
function closeSettings() {
  document.getElementById('settingsOverlay').classList.add('hidden');
}
function showLeaderboard() {
  renderLeaderboard();
  document.getElementById('leaderboardOverlay').classList.remove('hidden');
}
function closeLeaderboard() {
  document.getElementById('leaderboardOverlay').classList.add('hidden');
}
function resetBoard() {
  resetLeaderboard();
  renderLeaderboard();
}
function openHelp() {
  document.getElementById('helpOverlay').classList.remove('hidden');
}
function closeHelp() {
  document.getElementById('helpOverlay').classList.add('hidden');
}
document.getElementById('btnStart').onclick = startGame;
document.getElementById('btn2P').onclick = start2PGame;
document.getElementById('btnSettings').onclick = showSettings;
document.getElementById('btnLeaderboard').onclick = showLeaderboard;
document.getElementById('btnHelp').onclick = openHelp;
document.getElementById('btnResume').onclick = resumeGame;
document.getElementById('btnRestart').onclick = resetGame;
document.getElementById('btnQuit').onclick = () => { state.paused = false; state.menu = true; document.getElementById('menu').style.display = 'flex'; hideAllOverlays(); };
document.getElementById('btnCloseSettings').onclick = closeSettings;
document.getElementById('btnCloseBoard').onclick = closeLeaderboard;
document.getElementById('btnResetBoard').onclick = resetBoard;
document.getElementById('btnCloseHelp').onclick = closeHelp;
document.getElementById('paddleColor').oninput = e => setTheme({ left: e.target.value });
document.getElementById('cpuColor').oninput = e => setTheme({ right: e.target.value });
document.getElementById('ballColor').oninput = e => setTheme({ ball: e.target.value });
document.getElementById('bgSelect').oninput = e => setBG(e.target.value);
document.getElementById('soundToggle').oninput = e => { soundOn = e.target.checked; };
document.getElementById('musicToggle').oninput = e => { musicOn = e.target.checked; playMusic(); };
document.getElementById('aiSelect').oninput = e => setAIDifficulty(e.target.value);

// Keyboard controls
window.addEventListener('keydown', function (e) {
  if (e.key === "Escape") pauseGame();
  if (e.key === "F" || e.key === "f") toggleFullscreen();
  if (e.key === "1") setAIDifficulty('easy');
  if (e.key === "2") setAIDifficulty('medium');
  if (e.key === "3") setAIDifficulty('hard');
  if (e.key === "H" || e.key === "h") openHelp();
  if (e.key === "M" || e.key === "m") { musicOn = !musicOn; playMusic(); }
  if (e.key === "S" || e.key === "s") soundOn = !soundOn;
  if (e.key === "R" || e.key === "r") resetGame();
});

loadLeaderboard();
updateScoreboard();
gameLoop();