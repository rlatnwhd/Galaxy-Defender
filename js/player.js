// player.js : 플레이어 및 투사체(발사 딜레이 포함)
(function(){
  const { Core } = Game;
  const { images } = Game.Assets;

  const bullets = [];
  let fireDelay = 0.5; // seconds (기본)
  let powerLevel = 1; // 1~6 (최대 단계 확장)
  let lastFire = 0;
  // 전역 탄환 스케일 (배치는 유지하고 크기만 확대)
  const BULLET_SCALE = 1.4; // 필요시 1.2~1.6 사이로 조절 가능
  // 상점 업그레이드 영향치 (flat 데미지 추가)
  const upgrades = { fireDelay: 0.5, moveSpeed: 280, damageMult: 1, damageFlat: 0, pierce: 0, projMult: 1 };

  const player = {
    width: 56,
    height: 56,
    x: Core.canvas.width/2 - 28,
    y: Core.canvas.height - 120,
    speed: 280,
  };

  function reset(){
    bullets.length = 0;
    lastFire = 0;
    player.x = Core.canvas.width/2 - player.width/2;
    player.y = Core.canvas.height - 120;
  }

  function update(){
    const dt = Core.deltaTime.value;
    // 이동
  // 좌우 이동
  if((Core.keys['ArrowLeft'] || Core.keys['KeyA'])) player.x -= player.speed * dt;
  if((Core.keys['ArrowRight'] || Core.keys['KeyD'])) player.x += player.speed * dt;
  // 상하 이동
  if((Core.keys['ArrowUp'] || Core.keys['KeyW'])) player.y -= player.speed * dt;
  if((Core.keys['ArrowDown'] || Core.keys['KeyS'])) player.y += player.speed * dt;
  player.y = Core.clamp(player.y, 40, Core.canvas.height - 100);
    player.x = Core.clamp(player.x, 0, Core.canvas.width - player.width);

    // 발사(스페이스바)
    if(Core.keys['Space']){
      if(lastFire <= 0){
        shootPattern();
        lastFire = upgrades.fireDelay;
      }
    }
    if(lastFire > 0) lastFire -= dt;

    // 탄환 이동 + life 증가(트레일 알파 계산용)
    for(const b of bullets){
      b.y -= b.speed * dt;
      b.life += dt;
    }
    // 화면 밖 제거
    for(let i=bullets.length-1;i>=0;i--){ if(bullets[i].y + bullets[i].height < 0) bullets.splice(i,1); }
  }

  function pushBullet(x, y, w=12, h=28, speed=520, damage=1, imgKey='fire', trail=false){
    // 중심(anchor)을 유지한 채로 스케일 적용
    const cx = x + w/2;
    const cy = y + h/2;
    const sw = Math.round(w * BULLET_SCALE);
    const sh = Math.round(h * BULLET_SCALE);
    const nx = cx - sw/2;
    const ny = cy - sh/2;
    bullets.push({ x: nx, y: ny, width: sw, height: sh, speed, damage, imgKey, trail, life: 0, hitSet: new Set() });
  }

  function shootPattern(){
    const baseX = player.x + player.width/2 - 6;
    const baseY = player.y - 24;
    const spawned = [];
    if(powerLevel === 1){
      // 단일 기본 탄: fireball_1 1개
      spawned.push({x: baseX, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
    } else if(powerLevel === 2){
      // 이전 1단계: fireball_1 두 개
      spawned.push({x: baseX - 10, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
      spawned.push({x: baseX + 10, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
    } else if(powerLevel === 3){
      // 이전 2단계: fireball_1 세 개
      spawned.push({x: baseX - 16, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
      spawned.push({x: baseX, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
      spawned.push({x: baseX + 16, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
    } else if(powerLevel === 4){
      // 이전 3단계: fireball_1 세 개 + 양쪽 fireball_2
      spawned.push({x: baseX - 16, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
      spawned.push({x: baseX, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
      spawned.push({x: baseX + 16, y: baseY, w:12, h:28, sp:520, dmg:1, key:'fire', trail:true});
      spawned.push({x: baseX - 34, y: baseY + 4, w:10, h:20, sp:510, dmg:0.5, key:'fireSmall', trail:false});
      spawned.push({x: baseX + 34, y: baseY + 4, w:10, h:20, sp:510, dmg:0.5, key:'fireSmall', trail:false});
    } else if(powerLevel === 5){
      // 이전 4단계: 큰 fireball_3 1개 (단계 재정렬 후 이제 5단계)
      spawned.push({x: baseX - 32, y: baseY - 10, w:64, h:48, sp:520, dmg:5, key:'fire3', trail:true});
    } else if(powerLevel === 6){
      // 신규 6단계: fireball_4 (더 강한 최종탄, 데미지 8)
      spawned.push({x: baseX - 36, y: baseY - 12, w:72, h:54, sp:520, dmg:8, key:'fire4', trail:true});
    }

    // 업그레이드 적용(데미지 배수/관통/배수 발사)
    const mult = Math.max(1, upgrades.projMult);
    for(const s of spawned){
      for(let k=0;k<mult;k++){
        const offsetX = k===0 ? 0 : (k%2===0 ? 6 : -6); // 복제 시 좌우 살짝 오프셋
        const finalDamage = s.dmg * upgrades.damageMult + (upgrades.damageFlat || 0);
        pushBullet(s.x + offsetX, s.y, s.w, s.h, s.sp, finalDamage, s.key, s.trail);
        // 마지막으로 추가된 탄에 관통 수치 부여
        bullets[bullets.length-1].pierce = upgrades.pierce || 0;
      }
    }
  }

  function draw(){
    const c = Core.ctx;
    // 플레이어
    if(images.flight && images.flight.complete){
      c.drawImage(images.flight, player.x, player.y, player.width, player.height);
    } else {
      c.fillStyle = '#4ee';
      c.fillRect(player.x, player.y, player.width, player.height);
    }

    // 탄환
    // 잔상(트레일) 그리기: 트레일 있는 탄은 life 기반 투명도 꼬리
    for(const b of bullets){
      if(b.trail){
        const trailLen = 6; // 샘플 개수
        for(let i=1;i<=trailLen;i++){
          const tAlpha = 1 - i/trailLen;
          const ty = b.y + i*14; // 뒤쪽으로 조금씩
          c.globalAlpha = tAlpha * 0.3;
          drawBulletImage(b, b.x, ty, b.width, b.height, true);
        }
        c.globalAlpha = 1;
      }
      drawBulletImage(b, b.x, b.y, b.width, b.height);
    }


  function drawBulletImage(b, x, y, w, h, isTrail){
    const imgKey = b.imgKey;
    let img = images[imgKey];
    if(img && img.complete){
      Core.ctx.drawImage(img, x, y, w, h);
    } else {
      Core.ctx.fillStyle = imgKey === 'fireSmall' ? '#ffa640' : imgKey === 'fire3' ? '#ff6ad6' : imgKey === 'fire4' ? '#ff2e2e' : '#ffdc60';
      Core.ctx.fillRect(x, y, w, h);
    }
  }
  // 파워 텍스트 UI 제거 (코인 인디케이터 사용)
  }

  function setPowerLevel(lvl, newFireDelay){
    powerLevel = lvl; // 1~5
    // 공속은 현재 동일 유지 (fireDelay 고정) 필요 시 단계별 조정 가능
    if(newFireDelay) fireDelay = newFireDelay; else fireDelay = 0.5;
  }

  // 상점용 setter들
  function setFireDelay(fd){ upgrades.fireDelay = fd; }
  function setMoveSpeed(ms){ player.speed = ms; upgrades.moveSpeed = ms; }
  function setDamageMult(m){ upgrades.damageMult = m; }
  function setDamageFlat(df){ upgrades.damageFlat = df; }
  function setPierce(p){ upgrades.pierce = p; }
  function setProjMult(pm){ upgrades.projMult = pm; }

  Game.Player = { player, bullets, update, draw, reset, setPowerLevel, setFireDelay, setMoveSpeed, setDamageMult, setDamageFlat, setPierce, setProjMult };
})();