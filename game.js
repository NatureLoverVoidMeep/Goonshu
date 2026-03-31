const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const hitCountEl = document.getElementById('hitCount');
const timeAliveEl = document.getElementById('timeAlive');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartBtn');

const world = {
  width: canvas.width,
  height: canvas.height,
};

const player = {
  x: 80,
  y: world.height / 2,
  size: 22,
  speed: 260,
  color: '#60a5fa',
};

const enemy = {
  x: world.width - 120,
  y: world.height / 2,
  size: 70,
  speed: 165,
  accel: 10,
};

const escapeZone = {
  x: world.width - 95,
  y: world.height / 2 - 80,
  width: 70,
  height: 160,
};

let keys = new Set();
let hits = 0;
let playing = true;
let survivedSeconds = 0;
let lastTick = performance.now();

const enemySprite = new Image();
enemySprite.src = 'assets/goonshu.svg';

function resetPositions() {
  player.x = 80;
  player.y = world.height / 2;
  enemy.x = world.width - 120;
  enemy.y = world.height / 2;
}

function restartGame() {
  hits = 0;
  survivedSeconds = 0;
  enemy.speed = 165;
  playing = true;
  overlay.innerHTML = '';
  overlay.classList.add('hidden');
  statusText.textContent = 'Run!';
  hitCountEl.textContent = '0';
  timeAliveEl.textContent = '0.0';
  resetPositions();
}

function spawnWhiteSplash() {
  overlay.classList.remove('hidden');
  const blobCount = 12;

  for (let i = 0; i < blobCount; i += 1) {
    const splash = document.createElement('div');
    splash.className = 'splash';
    const size = 40 + Math.random() * 170;
    splash.style.width = `${size}px`;
    splash.style.height = `${size * (0.85 + Math.random() * 0.4)}px`;
    splash.style.left = `${Math.random() * 92}%`;
    splash.style.top = `${Math.random() * 90}%`;
    overlay.appendChild(splash);
    setTimeout(() => splash.remove(), 1250);
  }

  setTimeout(() => {
    if (!overlay.children.length) {
      overlay.classList.add('hidden');
    }
  }, 1400);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isColliding(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < (a.size + b.size) * 0.38;
}

function handleCatch() {
  hits += 1;
  hitCountEl.textContent = String(hits);
  spawnWhiteSplash();

  if (hits >= 3) {
    playing = false;
    statusText.textContent = 'You were caught 3 times. You lose.';
    return;
  }

  statusText.textContent = `Caught! ${3 - hits} chance${3 - hits === 1 ? '' : 's'} left.`;
  enemy.speed += enemy.accel;
  resetPositions();
}

function handleEscape() {
  playing = false;
  statusText.textContent = `Escaped in ${survivedSeconds.toFixed(1)}s. You win!`;
}

function update(dt) {
  if (!playing) return;

  survivedSeconds += dt;
  timeAliveEl.textContent = survivedSeconds.toFixed(1);

  let dx = 0;
  let dy = 0;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;
  player.x = clamp(player.x, player.size / 2, world.width - player.size / 2);
  player.y = clamp(player.y, player.size / 2, world.height - player.size / 2);

  const chaseX = player.x - enemy.x;
  const chaseY = player.y - enemy.y;
  const chaseLen = Math.hypot(chaseX, chaseY) || 1;
  enemy.x += (chaseX / chaseLen) * enemy.speed * dt;
  enemy.y += (chaseY / chaseLen) * enemy.speed * dt;

  if (isColliding(player, enemy)) {
    handleCatch();
  }

  const escaped =
    player.x + player.size / 2 > escapeZone.x &&
    player.y > escapeZone.y &&
    player.y < escapeZone.y + escapeZone.height;

  if (escaped) {
    handleEscape();
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, world.height);
  grad.addColorStop(0, '#111827');
  grad.addColorStop(1, '#030712');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
  ctx.fillRect(escapeZone.x, escapeZone.y, escapeZone.width, escapeZone.height);
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(escapeZone.x, escapeZone.y, escapeZone.width, escapeZone.height);

  ctx.fillStyle = 'rgba(74, 222, 128, 0.95)';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.fillText('ESCAPE', escapeZone.x - 4, escapeZone.y - 12);
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#bfdbfe';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy() {
  const half = enemy.size / 2;

  if (enemySprite.complete) {
    ctx.drawImage(enemySprite, enemy.x - half, enemy.y - half, enemy.size, enemy.size);
    return;
  }

  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(enemy.x - half, enemy.y - half, enemy.size, enemy.size);
}

function draw() {
  drawBackground();
  drawPlayer();
  drawEnemy();
}

function gameLoop(ts) {
  const dt = Math.min((ts - lastTick) / 1000, 0.033);
  lastTick = ts;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

restartBtn.addEventListener('click', restartGame);

restartGame();
requestAnimationFrame(gameLoop);
