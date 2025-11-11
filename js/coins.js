// coins.js : 코인 시스템 (드롭, 호밍, 카운트)
(function(){
  const { Core } = Game;
  const { images } = Game.Assets;

  const coins = [];
  // 초기 코인
  let coinCount = 0;

  // 인디케이터(좌상단) 위치
  const indicator = { x: 12, y: 14, size: 22 };

  function spawnCoinsAt(cx, cy, fixedCount){
    const n = (typeof fixedCount === 'number' && fixedCount > 0) ? fixedCount : (Math.floor(Math.random()*3) + 1); // 고정 개수 또는 1~3개
    for(let i=0;i<n;i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random()*120; // 튕김 초기 속도
      coins.push({
        x: cx, y: cy,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        state: 'bounce', // 'bounce' -> 'home'
        rotation: 0, spin: (Math.random()<0.5?-1:1)*8,
        size: 24,
        _restTime: 0
      });
    }
  }

  function update(){
    const dt = Core.deltaTime.value;
    const target = { x: indicator.x + indicator.size/2, y: indicator.y + indicator.size/2, r: indicator.size/2 };

    for(const c of coins){
      if(c.state === 'bounce'){
        // 중력 없이 마찰로 서서히 정지
        c.x += c.vx*dt; c.y += c.vy*dt;
        c.rotation += c.spin*dt;

        // 벽 경계(화면 밖 방지)
        if(c.x < 0){ c.x = 0; c.vx = 0; }
        if(c.x + c.size > Core.canvas.width){ c.x = Core.canvas.width - c.size; c.vx = 0; }
        if(c.y < 0){ c.y = 0; c.vy = 0; }
        if(c.y + c.size > Core.canvas.height){ c.y = Core.canvas.height - c.size; c.vy = 0; }

        // 선형 감속
        const speed = Math.hypot(c.vx, c.vy);
        if(speed > 0){
          const decel = 500 * dt; // 감속 가속도(px/s^2)
          if(decel >= speed){ c.vx = 0; c.vy = 0; c._restTime += dt; }
          else {
            const s = (speed - decel) / speed;
            c.vx *= s; c.vy *= s; c._restTime = 0;
          }
        } else {
          c._restTime += dt;
        }

        // 잠깐 완전히 멈춘 뒤 홈으로 이동 시작
        if(c._restTime > 0.2){ c.state = 'home'; c.rotation = 0; }
      } else if(c.state === 'home'){
        // 좌상단 인디케이터로 호밍
        const tx = target.x - (c.x + c.size/2);
        const ty = target.y - (c.y + c.size/2);
        const len = Math.hypot(tx, ty) || 1;
        const spd = 380; // 호밍 속도
        c.x += (tx/len) * spd * dt;
        c.y += (ty/len) * spd * dt;
        // 수집 판정(인디케이터 영역과 겹침)
        const area = { x: indicator.x, y: indicator.y, width: indicator.size, height: indicator.size };
        const self = { x: c.x, y: c.y, width: c.size, height: c.size };
        if(Core.aabb(area, self)){
          coinCount++;
          c.collected = true;
        }
      }
    }

    // 제거
    for(let i=coins.length-1;i>=0;i--){
      const c = coins[i];
      if(c.collected){ coins.splice(i,1); }
    }
  }

  function draw(){
    const ctx = Core.ctx;

    // 코인 자체
    for(const c of coins){
      ctx.save();
      ctx.translate(c.x + c.size/2, c.y + c.size/2);
      ctx.rotate(c.rotation);
      if(images.coin && images.coin.complete){
        ctx.drawImage(images.coin, -c.size/2, -c.size/2, c.size, c.size);
      } else {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0,0,c.size/2,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // 좌상단 인디케이터
    ctx.save();
    if(images.coin && images.coin.complete){
      ctx.drawImage(images.coin, indicator.x, indicator.y, indicator.size, indicator.size);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(indicator.x+indicator.size/2, indicator.y+indicator.size/2, indicator.size/2, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText(' ' + coinCount, indicator.x + indicator.size + 6, indicator.y-2);
    ctx.restore();
  }

  function reset(){ coins.length = 0; coinCount = 0; }

  function getCount(){ return coinCount; }
  function spend(amount){ if(coinCount >= amount){ coinCount -= amount; return true;} return false; }

  Game.Coins = { spawnCoinsAt, update, draw, reset, getCount, spend };
})();