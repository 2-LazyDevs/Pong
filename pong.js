const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

// Game constants
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 16;
const PADDLE_SPEED = 7;
const AI_SPEED = 4;

// Paddle objects
const leftPaddle = {
  x: 10,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  dy: 0
};

const rightPaddle = {
  x: canvas.width - 10 - PADDLE_WIDTH,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  dy: 0
};

// Ball object
const ball = {
  x: canvas.width / 2 - BALL_SIZE/2,
  y: canvas.height / 2 - BALL_SIZE/2,
  size: BALL_SIZE,
  speed: 6,
  dx: 6,
  dy: 4
};

// Draw functions
function drawRect(x, y, w, h, color='#fff') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color='#fff') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2, false);
  ctx.closePath();
  ctx.fill();
}

function drawNet() {
  for (let i = 0; i < canvas.height; i += 25) {
    drawRect(canvas.width/2 - 2, i, 4, 15, '#888');
  }
}

function draw() {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Net
  drawNet();

  // Paddles
  drawRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
  drawRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

  // Ball
  drawCircle(ball.x, ball.y, ball.size / 2);

  // Scores (optional, but let's not add scoring for simplicity)
}

// Update positions
function update() {
  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall collision (top/bottom)
  if (ball.y - ball.size / 2 < 0 || ball.y + ball.size / 2 > canvas.height) {
    ball.dy = -ball.dy;
  }

  // Paddle collision
  // Left paddle
  if (
    ball.x - ball.size / 2 < leftPaddle.x + leftPaddle.width &&
    ball.y + ball.size / 2 > leftPaddle.y &&
    ball.y - ball.size / 2 < leftPaddle.y + leftPaddle.height
  ) {
    ball.dx = Math.abs(ball.dx);
    // Add some variation based on hit position
    let collidePoint = ball.y - (leftPaddle.y + leftPaddle.height / 2);
    collidePoint = collidePoint / (leftPaddle.height / 2);
    ball.dy = collidePoint * ball.speed;
  }

  // Right paddle
  if (
    ball.x + ball.size / 2 > rightPaddle.x &&
    ball.y + ball.size / 2 > rightPaddle.y &&
    ball.y - ball.size / 2 < rightPaddle.y + rightPaddle.height
  ) {
    ball.dx = -Math.abs(ball.dx);
    let collidePoint = ball.y - (rightPaddle.y + rightPaddle.height / 2);
    collidePoint = collidePoint / (rightPaddle.height / 2);
    ball.dy = collidePoint * ball.speed;
  }

  // Left paddle movement (controlled by mouse, handled in mousemove event)

  // Right paddle AI
  if (ball.y < rightPaddle.y + rightPaddle.height / 2) {
    rightPaddle.y -= AI_SPEED;
  } else if (ball.y > rightPaddle.y + rightPaddle.height / 2) {
    rightPaddle.y += AI_SPEED;
  }
  // Clamp right paddle
  rightPaddle.y = Math.max(
    0,
    Math.min(canvas.height - rightPaddle.height, rightPaddle.y)
  );

  // Reset ball if out of bounds (simple reset to center)
  if (ball.x < 0 || ball.x > canvas.width) {
    ball.x = canvas.width / 2 - BALL_SIZE/2;
    ball.y = canvas.height / 2 - BALL_SIZE/2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.dy = (Math.random() - 0.5) * ball.speed;
  }
}

// Mouse control for left paddle
canvas.addEventListener('mousemove', function(evt) {
  const rect = canvas.getBoundingClientRect();
  const mouseY = evt.clientY - rect.top;
  leftPaddle.y = mouseY - leftPaddle.height / 2;
  // Clamp
  leftPaddle.y = Math.max(0, Math.min(canvas.height - leftPaddle.height, leftPaddle.y));
});

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();