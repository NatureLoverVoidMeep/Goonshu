const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const levelCountEl = document.getElementById('levelCount');
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

const SHOOT_COOLDOWN = 1.2;

let keys = new Set();
let hits = 0;
let playing = true;
let survivedSeconds = 0;
let lastTick = performance.now();
let level = 1;
let walls = [];
let enemyDashTimer = 0;
let shoeTimer = 0;
let shoes = [];

const enemySprite = new Image();
enemySprite.src = 'assets/goonshu.svg';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMaze() {
  walls = [];
  const segments = 8 + level * 4;

  for (let i = 0; i < segments; i += 1) {
    const vertical = Math.random() > 0.5;
    const width = vertical ? randomInt(20, 28) : randomInt(120, 220);
    const height = vertical ? randomInt(120, 230) : randomInt(20, 28);

    let x = randomInt(80, world.width - width - 140);
    let y = randomInt(40, world.height - height - 40);

    const nearSpawn = x < 170 && y > world.height / 2 - 110 && y < world.height / 2 + 110;
    const nearEscape = x + width > escapeZone.x - 40 && y + height > escapeZone.y - 35 && y < escapeZone.y + escapeZone.height + 35;

    if (nearSpawn || nearEscape) continue;

    walls.push({ x, y, width, height });
  }
}

function resetPositions() {
  player.x = 80;
  player.y = world.height / 2;
  enemy.x = world.width - 120;
  enemy.y = world.height / 2;
  shoes = [];
  enemyDashTimer = 0;
  shoeTimer = 0;
}

function restartRun() {
  hits = 0;
  survivedSeconds = 0;
  enemy.speed = 165 + (level - 1) * 14;
  playing = true;
  overlay.innerHTML = '';
  overlay.classList.add('hidden');
  hitCountEl.textContent = '0';
  timeAliveEl.textContent = '0.0';
  levelCountEl.textContent = String(level);
  generateMaze();
  resetPositions();
  statusText.textContent = `Level ${level}: Run!`;
}

function fullRestart() {
  level = 1;
  restartRun();
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
    if (!overlay.children.length) overlay.classList.add('hidden');
    if (!overlay.children.length) {
      overlay.classList.add('hidden');
    }
  }, 1400);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function collidesWithWall(x, y, radius) {
  return walls.some((wall) => (
    x + radius > wall.x &&
    x - radius < wall.x + wall.width &&
    y + radius > wall.y &&
    y - radius < wall.y + wall.height
  ));
}

function moveEntity(entity, moveX, moveY) {
  const nextX = clamp(entity.x + moveX, entity.size / 2, world.width - entity.size / 2);
  if (!collidesWithWall(nextX, entity.y, entity.size / 2 - 2)) entity.x = nextX;

  const nextY = clamp(entity.y + moveY, entity.size / 2, world.height - entity.size / 2);
  if (!collidesWithWall(entity.x, nextY, entity.size / 2 - 2)) entity.y = nextY;
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
    statusText.textContent = `You were caught 3 times on level ${level}. You lose.`;
    statusText.textContent = 'You were caught 3 times. You lose.';
    return;
  }

  statusText.textContent = `Caught! ${3 - hits} chance${3 - hits === 1 ? '' : 's'} left.`;
  enemy.speed += enemy.accel;
  resetPositions();
}

function handleEscape() {
  level += 1;
  statusText.textContent = `Escaped! Starting level ${level}...`;
  restartRun();
}

function updateEnemyPhase(dt) {
  // Phase 2+: periodic dash boost
  if (level >= 2) {
    enemyDashTimer += dt;
    if (enemyDashTimer > 2.2) {
      enemyDashTimer = 0;
      enemy.speed += 40;
      setTimeout(() => {
        enemy.speed -= 40;
      }, 450);
    }
  }

  // Phase 3+: shoot shoes projectiles
  if (level >= 3) {
    shoeTimer += dt;
    if (shoeTimer >= SHOOT_COOLDOWN) {
      shoeTimer = 0;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      shoes.push({
        x: enemy.x,
        y: enemy.y,
        size: 16,
        vx: (dx / len) * (180 + level * 18),
        vy: (dy / len) * (180 + level * 18),
      });
    }
  }

  shoes = shoes.filter((shoe) => {
    shoe.x += shoe.vx * dt;
    shoe.y += shoe.vy * dt;

    if (shoe.x < -20 || shoe.y < -20 || shoe.x > world.width + 20 || shoe.y > world.height + 20) {
      return false;
    }

    if (collidesWithWall(shoe.x, shoe.y, shoe.size / 2)) return false;

    if (Math.hypot(shoe.x - player.x, shoe.y - player.y) < (shoe.size + player.size) * 0.45) {
      handleCatch();
      return false;
    }

    return true;
  });
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

  moveEntity(player, dx * player.speed * dt, dy * player.speed * dt);
  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;
  player.x = clamp(player.x, player.size / 2, world.width - player.size / 2);
  player.y = clamp(player.y, player.size / 2, world.height - player.size / 2);

  const chaseX = player.x - enemy.x;
  const chaseY = player.y - enemy.y;
  const chaseLen = Math.hypot(chaseX, chaseY) || 1;
  moveEntity(enemy, (chaseX / chaseLen) * enemy.speed * dt, (chaseY / chaseLen) * enemy.speed * dt);

  updateEnemyPhase(dt);

  if (isColliding(player, enemy)) {
    handleCatch();
    return;
  enemy.x += (chaseX / chaseLen) * enemy.speed * dt;
  enemy.y += (chaseY / chaseLen) * enemy.speed * dt;

  if (isColliding(player, enemy)) {
    handleCatch();
  }

  const escaped =
    player.x + player.size / 2 > escapeZone.x &&
    player.y > escapeZone.y &&
    player.y < escapeZone.y + escapeZone.height;

  if (escaped) handleEscape();
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

  walls.forEach((wall) => {
    ctx.fillStyle = '#374151';
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.strokeStyle = '#6b7280';
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
  });

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
  } else {
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(enemy.x - half, enemy.y - half, enemy.size, enemy.size);
  }

  shoes.forEach((shoe) => {
    ctx.fillStyle = '#f59e0b';
    ctx.save();
    ctx.translate(shoe.x, shoe.y);
    ctx.rotate(Math.atan2(shoe.vy, shoe.vx));
    ctx.fillRect(-shoe.size / 2, -shoe.size / 3, shoe.size, shoe.size / 1.6);
    ctx.restore();
  });

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

const movementKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'r']);

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (movementKeys.has(key)) event.preventDefault();

  if (key === 'r') {
    fullRestart();
    return;
  }

  keys.add(key);
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (movementKeys.has(key)) event.preventDefault();
  keys.delete(key);
});

restartBtn.addEventListener('click', fullRestart);

fullRestart();
window.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

restartBtn.addEventListener('click', restartGame);

restartGame();
requestAnimationFrame(gameLoop);
