// enemies.js : 적 행(Row) 스폰, 체력, 피격 흔들림
(function(){
  const { Core } = Game;
  const { images } = Game.Assets;
  const { bullets } = Game.Player;

  const enemies = [];
  let spawnTimer = 0;
  // 스폰 주기: 시간이 지날수록 짧아짐
  const BASE_SPAWN_INTERVAL = 8.0; // 시작 주기(초)
  const MIN_SPAWN_INTERVAL = 2.5;  // 하한(초)
  const SPAWN_ACCEL_PER_MIN = 0.6; // 분당 줄어드는 초(선형)

  // 한 행에 배치할 컬럼 수 (화면 크기에 따라 5 또는 6)
  const columns = Core.canvas.width <= 500 ? 5 : 6;
  const margin = 0; // 가로폭을 딱 채우기 위해 0
  const enemyWidth = (Core.canvas.width - margin * (columns + 1)) / columns;
  const enemyHeight = enemyWidth * 0.65; // 비율 조절

  let elapsed = 0; // 전체 경과 시간 (난이도 스케일용)
  const HP_GROWTH_PER_MIN = 4; // 분당 추가 HP (완만하지만 무한 증가)
  const SPEED_GROWTH_PER_MIN = 18; // 분당 속도 증가량
  const MAX_ENEMY_SPEED = 180; // 속도 상한 (초반 60 -> 최대 180)

  function makeEnemy(x,y,type){
    // type: 'ufo' or 'ufoEnemy'
    const baseHp = type === 'ufo' ? 5 : 10;
    const difficultyFactor = (elapsed / 60); // 경과 분
    const extraHp = Math.floor(difficultyFactor * HP_GROWTH_PER_MIN);
    const hp = baseHp + extraHp;
  const baseSpeed = 60;
  const extraSpeed = Math.min(difficultyFactor * SPEED_GROWTH_PER_MIN, MAX_ENEMY_SPEED - baseSpeed);
    return {
      x, y, width: enemyWidth, height: enemyHeight,
      type, maxHp: hp, hp,
  speed: baseSpeed + extraSpeed, // 내려오는 속도(px/sec) 시간에 따라 증가 (상한 적용)
      shake: 0,
    };
  }

  function spawnRow(){
    for(let i=0;i<columns;i++){
      const x = margin + i*(enemyWidth + margin);
      const y = -enemyHeight - 20; // 화면 위에서 시작
      // 출현 확률 상향: 60% ufo, 40% ufoEnemy
      const type = Math.random() < 0.6 ? 'ufo' : 'ufoEnemy';
      enemies.push(makeEnemy(x,y,type));
    }
  }

  function getSpawnInterval(){
    const minutes = elapsed / 60;
    const decreased = BASE_SPAWN_INTERVAL - SPAWN_ACCEL_PER_MIN * minutes;
    return Math.max(MIN_SPAWN_INTERVAL, decreased);
  }

  function update(){
    const dt = Core.deltaTime.value;
  elapsed += dt;
  spawnTimer -= dt;
    if(spawnTimer <= 0){ spawnRow(); spawnTimer = getSpawnInterval(); }

    for(const e of enemies){
      e.y += e.speed * dt;
      if(e.shake > 0) e.shake -= dt;
    }

    // 충돌(총알 vs 적)
    for(const e of enemies){
      for(let i=bullets.length-1;i>=0;i--){
        const b = bullets[i];
        if(Core.aabb(e,b)){
          // 이미 이 탄이 이 적을 친 적 있으면 무시
          if(b.hitSet && b.hitSet.has(e)) continue;
          // 타격 처리
          e.hp -= (b.damage || 1);
          e.shake = 0.2; // 흔들림 시간
          if(b.hitSet) b.hitSet.add(e);
          if(b.pierce && b.pierce > 0){
            b.pierce -= 1; // 관통 소모 후 탄 유지
          } else {
            bullets.splice(i,1); // 관통 없으면 제거
          }
          // 다음 적 검사 (이 적에는 추가 타격 안 함)
        }
      }
    }

    // HP 0 이하 제거 & 화면 밖 제거 (사망 시 아이템/코인 처리)
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      if(e.hp <= 0){
        if(e.type === 'ufoEnemy'){
          // 빨간 적: 아이템 처리 + 코인 3개 보너스
          if(Game.Items && Game.Items.onEnemyKilled){ Game.Items.onEnemyKilled(e); }
          if(Game.Coins && Game.Coins.spawnCoinsAt){ Game.Coins.spawnCoinsAt(e.x + e.width/2, e.y + e.height/2, 3); }
        } else if(e.type === 'ufo'){
          // 일반 적: 1~3 랜덤 코인
          if(Game.Coins && Game.Coins.spawnCoinsAt){ Game.Coins.spawnCoinsAt(e.x + e.width/2, e.y + e.height/2); }
        }
        enemies.splice(i,1);
      } else if(e.y > Core.canvas.height + 50){
        enemies.splice(i,1);
      }
    }

    // 플레이어와 충돌 -> 폭발 & 게임오버 (playing 상태일 때만)
    if(Game.UI && Game.UI.state.current === 'playing'){
      const player = Game.Player.player;
      for(const e of enemies){
        if(Core.aabb(player, e)){
          Game.UI.triggerExplosion(player.x + player.width/2, player.y + player.height/2);
          Game.UI.gameOver();
          break;
        }
      }
    }
  }

  function draw(){
    const c = Core.ctx;
    for(const e of enemies){
      const shakeOffsetX = e.shake > 0 ? Math.sin(Date.now()/50) * 4 : 0;
      const drawX = e.x + shakeOffsetX;
      const drawY = e.y;
      const img = e.type === 'ufo' ? images.ufo : images.ufoEnemy;
      if(img && img.complete){
        c.drawImage(img, drawX, drawY, e.width, e.height);
      } else {
        c.fillStyle = e.type === 'ufo' ? '#6af' : '#fa6';
        c.fillRect(drawX, drawY, e.width, e.height);
      }
      // 체력바 (맞았을 때만 표시)
      if(e.hp < e.maxHp){
        const barY = drawY + e.height + 4;
        const bw = e.width;
        const bh = 6;
        c.fillStyle = '#222';
        c.fillRect(drawX, barY, bw, bh);
        const ratio = e.hp / e.maxHp;
        c.fillStyle = e.type === 'ufo' ? '#3cf' : '#ff7b3c';
        c.fillRect(drawX+1, barY+1, (bw-2)*ratio, bh-2);
      }
    }
  }

  function reset(){ enemies.length = 0; spawnTimer = 3.0; elapsed = 0; }

  Game.Enemies = { enemies, update, draw, reset };
})();