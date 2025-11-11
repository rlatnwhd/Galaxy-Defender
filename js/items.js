// items.js : 아이템 드롭 및 파워업 단계 관리
(function(){
  const { Core } = Game;
  const { images } = Game.Assets;
  const { player } = Game.Player;

  // 파워업 단계: 1(기본) -> ... -> 6(최대)
  let powerLevel = 1;
  let fireDelayBase = 0.5;

  // 드롭된 아이템 리스트
  const drops = [];

  // 빨간 적(ufoEnemy) 처치 시 아이템 드롭 확률
  const dropChance = 0.35; // 35%

  // 빨간 적이 제거되었는지 추적 위해 enemies.js에서 hp<=0 제거 전 훅 필요 없고 여기서 후처리 가능 (game 루프 이후 tick에서 필터링 전 상태 사용 어려워 단순히 spawn 시 처리)
  // 구현 간소화를 위해 enemies.js 충돌 로직 변경 없이, update 후 이곳에서 사망한 적을 탐지하는 방식 사용.

  function update(){
    const dt = Core.deltaTime.value;

    // 아이템 낙하 및 튕김 애니메이션
    for(const d of drops){
      if(d.bounce){
        d.vy += 600 * dt; // 중력 적용
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rotation += dt * d.spin; // 튕기는 동안만 회전
        // 화면 경계 클램프 (가로 이탈 방지)
        if(d.x < 0) d.x = 0;
        if(d.x + d.size > Core.canvas.width) d.x = Core.canvas.width - d.size;
        if(d.vy > 0){
          // 내려가기 시작하면 회전 멈춤
          d.bounce = false; d.vx = 0; d.vy = d.fallSpeed;
        }
      } else {
        d.y += d.fallSpeed * dt;
        if(d.x < 0) d.x = 0;
        if(d.x + d.size > Core.canvas.width) d.x = Core.canvas.width - d.size;
      }
    }

    // 화면 밖 제거
    for(let i=drops.length-1;i>=0;i--){ if(drops[i].y > Core.canvas.height + 40) drops.splice(i,1); }

    // 플레이어와 충돌 -> 파워업 적용
    for(let i=drops.length-1;i>=0;i--){
      const d = drops[i];
      const hitArea = { x: d.x, y: d.y, width: d.size, height: d.size };
      if(Core.aabb(hitArea, player)){
        applyPowerUp();
        drops.splice(i,1);
      }
    }
  }

  function applyPowerUp(){
    if(powerLevel >= 6) return; // 최대 강화 시 무시 (6단계 확장)
    powerLevel++;
    Game.Player.setPowerLevel(powerLevel, fireDelayBase);
  }

  function onEnemyKilled(enemy){
    if(enemy.type === 'ufoEnemy' && powerLevel < 6){
      if(Math.random() < dropChance){
        spawnDrop(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
      }
    }
  }

  function init(){
    Game.Player.setPowerLevel(powerLevel, fireDelayBase);
  }

  // 재시작 시 파워레벨을 1로 초기화하고 드롭도 비웁니다.
  function reset(){
    powerLevel = 1;
    drops.length = 0;
    Game.Player.setPowerLevel(powerLevel, fireDelayBase);
  }

  function spawnDrop(cx, cy){
    const size = 40;
    // 초기 튕김 속도
    const d = {
      x: cx - size/2,
      y: cy - size/2,
      size,
      rotation: 0,
      bounce: true,
      vx: (Math.random()<0.5? -1:1) * 180,
      vy: -420,
      fallSpeed: 120,
      spin: (Math.random()<0.5? -1:1) * 10 // rad/s
    };
    drops.push(d);
  }

  function draw(){
    const c = Core.ctx;
    for(const d of drops){
      c.save();
      c.translate(d.x + d.size/2, d.y + d.size/2);
      c.rotate(d.rotation);
      if(images.item && images.item.complete){
        c.drawImage(images.item, -d.size/2, -d.size/2, d.size, d.size);
      } else {
        c.fillStyle = '#ffd54f';
        c.beginPath();
        c.arc(0,0,d.size/2,0,Math.PI*2);
        c.fill();
      }
      c.restore();
    }
  }

  function getPowerLevel(){ return powerLevel; }

  Game.Items = { update, draw, onEnemyKilled, getPowerLevel, init, reset };
})();