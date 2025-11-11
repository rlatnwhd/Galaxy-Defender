// meteor.js : 5초마다 경고 후 운석(메테오) 낙하 시스템
(function(){
  const { Core } = Game;
  const { ctx, canvas } = Core;
  const { images } = Game.Assets;
  const meteors = []; // 실제 떨어지는 운석
  const warnings = []; // 경고 표시(미리 경로 보여줌)

  // 설정 값
  const SPAWN_INTERVAL = 5.0; // 매 5초 시도
  let spawnTimer = 0;
  const WARNING_DELAY_MIN = 0.5; // 경고 후 실제 낙하까지 최소 지연
  const WARNING_DELAY_MAX = 1.0; // 최대 지연
  const METEOR_SPEED_MIN = 620; // 낙하 속도 범위
  const METEOR_SPEED_MAX = 760;
  const METEOR_ROT_SPEED = 2.6; // rad/s 회전 속도
  const METEOR_SIZE = 72; // 기본 큰 사이즈
  const TRAIL_SAMPLES = 6; // 잔상 샘플 수

  function reset(){
    meteors.length = 0;
    warnings.length = 0;
    spawnTimer = 2.5; // 첫 경고는 약간 지연 시작
  }

  function spawnWarning(){
    // 떨어질 X 위치 랜덤, 아래 도착 예상 지점 표시(바닥 근처)
    const x = Math.random() * (canvas.width - METEOR_SIZE) + METEOR_SIZE/2;
    const delay = Core.randRange(WARNING_DELAY_MIN, WARNING_DELAY_MAX);
    warnings.push({ x, delay, time: 0, active: true });
  }

  function spawnMeteor(x){
    const speed = Core.randRange(METEOR_SPEED_MIN, METEOR_SPEED_MAX);
    meteors.push({
      x: x - METEOR_SIZE/2,
      y: -METEOR_SIZE - 20,
      width: METEOR_SIZE,
      height: METEOR_SIZE,
      speed,
      rot: 0,
      rotSpeed: METEOR_ROT_SPEED * (Math.random()<0.5? -1:1),
      life: 0
    });
  }

  function update(){
    const dt = Core.deltaTime.value;
    spawnTimer -= dt;
    if(spawnTimer <= 0){
      spawnWarning();
      spawnTimer = SPAWN_INTERVAL;
    }

    // 경고 업데이트 -> 딜레이 지나면 운석 생성
    for(let i=warnings.length-1;i>=0;i--){
      const w = warnings[i];
      w.time += dt;
      if(w.time >= w.delay){
        spawnMeteor(w.x);
        warnings.splice(i,1);
      }
    }

    // 운석 이동/회전
    for(let i=meteors.length-1;i>=0;i--){
      const m = meteors[i];
      m.y += m.speed * dt;
      m.rot += m.rotSpeed * dt;
      m.life += dt;
      if(m.y > canvas.height + 120){
        meteors.splice(i,1);
      }
    }

    // 플레이어 충돌 -> 폭발 & 게임오버
    if(Game.UI && Game.UI.state.current === 'playing'){
      const player = Game.Player.player;
      for(const m of meteors){
        if(Core.aabb(player, m)){
          Game.UI.triggerExplosion(player.x + player.width/2, player.y + player.height/2);
          Game.UI.gameOver();
          break;
        }
      }
    }
  }

  function draw(){
    // 경고: 미려한 경로 연출(그라데이션 빔 + 리플 링 + 크로스헤어 + 유령 운석)
    for(const w of warnings){
      const pulse = Math.sin(Date.now()/150) * 0.5 + 0.5; // 0~1
      const t = Core.clamp(w.time / Math.max(0.001, w.delay), 0, 1);
      const gx = w.x;
      const groundY = canvas.height - 90; // 착지 표시 높이

      // 1) 경고 빔(그라데이션 기둥)
      ctx.save();
      const beamW = 14 + 8*pulse;
      const beamX = gx - beamW/2;
      const grad = ctx.createLinearGradient(0, 0, 0, groundY);
      grad.addColorStop(0.0, `rgba(255,140,140,0.00)`);
      grad.addColorStop(0.6, `rgba(255,120,120,${0.18 + 0.12*pulse})`);
      grad.addColorStop(1.0, `rgba(255,70,70,${0.35 + 0.25*pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(beamX, 0, beamW, groundY);
      // 내부 스캐닝 라인(점선 애니메이션)
      ctx.strokeStyle = `rgba(255,180,180,${0.30 + 0.25*pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -Date.now()/40;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, groundY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2) 착지 리플 링 3중 원 + 크로스헤어
      ctx.save();
      for(let i=0;i<3;i++){
        const phase = (t + i*0.25) % 1;
        const r = 18 + phase * 44;
        const a = (1 - phase) * (0.6 + 0.3*pulse);
        ctx.strokeStyle = `rgba(255,60,60,${a})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(gx, groundY, r, 0, Math.PI*2);
        ctx.stroke();
      }
      // 크로스헤어 틱
      ctx.strokeStyle = `rgba(255,120,120,${0.7})`;
      ctx.lineWidth = 3;
      const tick = 14;
      ctx.beginPath();
      ctx.moveTo(gx - tick, groundY); ctx.lineTo(gx - tick/2, groundY);
      ctx.moveTo(gx + tick/2, groundY); ctx.lineTo(gx + tick, groundY);
      ctx.moveTo(gx, groundY - tick); ctx.lineTo(gx, groundY - tick/2);
      ctx.moveTo(gx, groundY + tick/2); ctx.lineTo(gx, groundY + tick);
      ctx.stroke();
      ctx.restore();

  // 유저 요청: 경고 단계에서는 유령 운석 미표시 (집중 방해 방지)
    }

    // 운석 및 잔상(이미지 사용)
    for(const m of meteors){
      // 잔상: life 기반 뒤쪽 표본
      for(let i=1;i<=TRAIL_SAMPLES;i++){
        const ta = 1 - i/TRAIL_SAMPLES;
        const ty = m.y - i*20; // 위쪽 과거 위치
        ctx.save();
        ctx.translate(m.x + m.width/2, ty + m.height/2);
        ctx.rotate(m.rot);
        ctx.globalAlpha = ta * 0.25;
        drawMeteorSprite(-m.width/2, -m.height/2, m.width, m.height, true);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(m.x + m.width/2, m.y + m.height/2);
      ctx.rotate(m.rot);
      drawMeteorSprite(-m.width/2, -m.height/2, m.width, m.height, false);
      ctx.restore();
    }
  }

  function drawMeteorSprite(x,y,w,h,isTrail){
    const img = images && images.meteor;
    if(img && img.complete){
      ctx.drawImage(img, x, y, w, h);
    } else {
      // 폴백: 기본 다각형 바위 렌더
      const grd = ctx.createLinearGradient(x, y, x+w, y+h);
      grd.addColorStop(0, isTrail? '#442' : '#5e3b26');
      grd.addColorStop(1, isTrail? '#221' : '#3a1f10');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(x + w*0.5, y);
      ctx.lineTo(x + w, y + h*0.3);
      ctx.lineTo(x + w*0.8, y + h);
      ctx.lineTo(x + w*0.2, y + h);
      ctx.lineTo(x, y + h*0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  Game.Meteor = { update, draw, reset };
})();
