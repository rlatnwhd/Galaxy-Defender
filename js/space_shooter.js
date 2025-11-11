// 🎮 우주 슈팅 게임 
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ▶ 전투기 이미지 로드
const playerImage = new Image();
playerImage.src = "images/fighter.png"; // 플레이어 전투기 이미지

// ▶ 외계인 적 이미지 로드  
const alienImage = new Image();
alienImage.src = "images/ufo.png"; // 외계인 적 이미지 경로 

// ▶ 플레이어 설정 
const player = {
  x: 180,
  y: 550,
  width: 40,
  height: 40,
  speed: 5,
};

// ▶ 상태 변수
let bullets = [];
let enemies = [];
let enemyBullets = [];  // 1️⃣ 적 총알
let items = [];    // 3️⃣ 아이템
let effects = [];  // 2️⃣ 폭발 이펙트
let score = 0;
let gameOver = false;
let keys = {};

// ▶ 별 배경 (움직이는 우주 느낌)
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 1 + 0.5
}));

// ▶ 키 입력 처리
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ▶ 플레이어 총알 발사
function shoot() {
  bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10,
    speed: 7
  });
}

// ▶ 적 생성
function spawnEnemy() {
  const x = Math.random() * (canvas.width - 40); // 너비 고려
  enemies.push({ x: x, y: 0, width: 40, height: 40, speed: 2 });
}


// ▶ 적 총알 발사
function enemyShoot() {
  if (enemies.length === 0) return;
  const shooter = enemies[Math.floor(Math.random() * enemies.length)];
  enemyBullets.push({
    x: shooter.x + shooter.width / 2 - 2,
    y: shooter.y + shooter.height,
    width: 4,
    height: 10,
    speed: 4
  });
}


// ▶ 충돌 판정
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}


// ▶ 폭발 이펙트 생성
function spawnEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    effects.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      life: 30,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`
    });
  }
}



// ▶ 아이템 생성
function spawnItem(x, y) {
  items.push({
    x,
    y,
    width: 12,
    height: 12,
    speed: 2
  });
}


// ▶ 별 배경 업데이트
function updateStars() {
  for (let s of stars) {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}


// ▶ 이펙트 업데이트
function updateEffects() {
  effects.forEach(e => {
    e.x += e.dx;
    e.y += e.dy;
    e.life--;
  });
  effects = effects.filter(e => e.life > 0);
}



// ▶ 아이템 업데이트
function updateItems() {
  items.forEach(item => {
    item.y += item.speed;
    if (isColliding(item, player)) {
      score += 10;
      item.collected = true;
    }
  });
  items = items.filter(i => i.y < canvas.height && !i.collected);
}


// ▶ 배경 별 그리기
function drawStars() {
  ctx.fillStyle = "#6f879eff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  for (let s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}


// ▶ 이펙트 그리기
function drawEffects() {
  for (let e of effects) {
    const alpha = e.life / 30;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}



// ⭐ 별 모양 아이템 그리기 함수
function drawStarShape(x, y, radius, points, inset) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x, y);
  ctx.moveTo(0, 0 - radius);
  for (let i = 0; i < points; i++) {
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - (radius * inset));
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - radius);
  }
  ctx.closePath();
  ctx.restore();
}

// ⭐ 아이템 그리기
function drawItems() {
  ctx.fillStyle = "orange";
  for (let item of items) {
    ctx.beginPath();
    drawStarShape(item.x + item.width / 2, item.y + item.height / 2, 6, 5, 0.5);
    ctx.fill();
  }
}


// ▶ 메인 게임 루프
function update() {
  if (gameOver) return;

  updateStars();
  updateEffects();
  updateItems();    // 3️⃣ 아이템

  // 플레이어 이동
  if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed;
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) player.x += player.speed;
  if (keys[" "]) shoot();

  // 총알 이동
  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > 0);

  // 적 이동 및 충돌 처리
  enemies.forEach(e => {
    e.y += e.speed;
    if (isColliding(e, player)) {
      gameOver = true;
      alert("Game Over! (적과 충돌)\nScore: " + score);
    }
  });

  enemies = enemies.filter(e => {
    for (let b of bullets) {
      if (isColliding(e, b)) {
        score++;
        bullets = bullets.filter(bullet => bullet !== b);
        spawnEffect(e.x + e.width / 2, e.y + e.height / 2);

        if (Math.random() < 0.3) {  // 3️⃣ 아이템
          spawnItem(e.x + e.width / 2 - 6, e.y);
        }

        return false;
      }
    }
    return e.y < canvas.height;
  });


  // 적 총알 이동 및 충돌
  enemyBullets.forEach(b => {
    b.y += b.speed;
    if (isColliding(b, player)) {
      gameOver = true;
      alert("Game Over! (적 총알 맞음)\nScore: " + score);
    }
  });
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height);


  // ▶ 그리기
  drawStars();       // 배경
  drawEffects();     // 2️⃣ 이펙트 폭발 효과
  drawItems();       // 3️⃣ 아이템

  // ▶ 적  
  enemies.forEach(e => {
    ctx.drawImage(alienImage, e.x, e.y, e.width, e.height);
  });

  // ▶ 플레이어 총알
  bullets.forEach(b => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });


  // ▶ 적 총알
  enemyBullets.forEach(b => {
    ctx.fillStyle = "black";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });


  // ▶ 플레이어
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

  // ▶ 점수 표시
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + score, 10, 20);

  requestAnimationFrame(update);
}

// ▶ 적 생성 및 총알 발사 주기 설정
setInterval(spawnEnemy, 1000);
setInterval(enemyShoot, 1500); 

// ▶ 게임 시작
update();