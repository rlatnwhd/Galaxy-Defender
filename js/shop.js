// shop.js : P 키로 여는 좌우 스크롤 업그레이드 상점
(function(){
  const { Core } = Game;
  const { images } = Game.Assets;
  // 코인 카운트 접근을 위해 Coins 모듈 필요

  let open = false;
  // 단일 카드 인덱스 기반 탐색
  let currentIndex = 0;
  let wheelLock = false; // 급격한 연속 스크롤 방지
  // 전환 애니메이션 상태
  let animRunning = false;
  let animFrom = 0;
  let animTo = 0;
  let animDir = 0; // -1: 왼쪽, 1: 오른쪽
  let animStart = 0;
  let animDur = 320; // ms (표시용)
  let animT = 0;     // 0..1 진행률
  let animDurSec = 0.32; // deltaTime 기반 초 단위

  // 플레이어 스탯(기본값)
  const stats = {
    fireRate: 0.5, // 발사 딜레이(낮을수록 빠름)
    moveSpeed: 280,
    damageMultiplier: 1,
    damageFlat: 0,
    pierce: 0, // 관통 가능 횟수 (0: 없음)
    projectileMultiplier: 1 // 추가 배수 (2배면 패턴 복제)
  };

  // 플레이어에 현재 stats를 반영하는 헬퍼
  function syncPlayer(){
    if(Game.Player){
      Game.Player.setFireDelay && Game.Player.setFireDelay(stats.fireRate);
      Game.Player.setMoveSpeed && Game.Player.setMoveSpeed(stats.moveSpeed);
      Game.Player.setDamageMult && Game.Player.setDamageMult(stats.damageMultiplier);
      Game.Player.setDamageFlat && Game.Player.setDamageFlat(stats.damageFlat || 0);
      Game.Player.setPierce && Game.Player.setPierce(stats.pierce);
      Game.Player.setProjMult && Game.Player.setProjMult(stats.projectileMultiplier);
    }
  }

  // 업그레이드 정의(후반 강화 중심, 사기성 높음)
  // price는 코인 비용, scaleFactor 등은 적용 변화
  const upgrades = [
    {
      key: 'fireRate1', name: '공속 +', desc: '발사 딜레이 0.5s -> 0.4s', price: 25, basePrice: 25,
      apply(){ stats.fireRate = Math.max(0.4, stats.fireRate - 0.1); syncPlayer(); }
    },
    {
      key: 'fireRate2', name: '공속 ++', desc: '발사 딜레이 0.4s -> 0.28s', price: 80, basePrice: 80,
      require(){ return purchased.has('fireRate1'); },
      apply(){ stats.fireRate = Math.max(0.28, stats.fireRate - 0.12); syncPlayer(); }
    },
    {
      key: 'move1', name: '이속 +', desc: '이동속도 +60', price: 30, basePrice: 30,
      apply(){ stats.moveSpeed += 60; syncPlayer(); }
    },
    {
      key: 'move2', name: '이속 ++', desc: '이동속도 +120', price: 90, basePrice: 90,
      require(){ return purchased.has('move1'); },
      apply(){ stats.moveSpeed += 120; syncPlayer(); }
    },
    {
      key: 'pierce1', name: '관통 I', desc: '투사체가 적 1회 추가 관통', price: 70, basePrice: 70,
      apply(){ stats.pierce = Math.min(stats.pierce + 1, 3); syncPlayer(); }
    },
    {
      key: 'pierce2', name: '관통 II', desc: '투사체가 적 2회 추가 관통', price: 140, basePrice: 140,
      require(){ return purchased.has('pierce1'); },
      apply(){ stats.pierce = Math.min(stats.pierce + 2, 5); syncPlayer(); }
    },
    {
      key: 'proj2x', name: '투사체 2배', desc: '현재 패턴을 한 번 더 복제', price: 120, basePrice: 120,
      apply(){ stats.projectileMultiplier = Math.min(stats.projectileMultiplier + 1, 3); syncPlayer(); }
    },
    // 무한 구매 업그레이드: 데미지 +2 (가격 완화)
    {
      key: 'dmg_plus', name: '데미지 +2 (무한)', desc: '구매할 때마다 모든 탄환 데미지 +2 (가격 소폭 상승)', price: 60, basePrice: 60,
      repeatable: true,
      times: 0,
      apply(){
        stats.damageMultiplier = Math.max(1, stats.damageMultiplier);
        stats.damageFlat = (stats.damageFlat || 0) + 2;
        this.times += 1;
        // 가격 상승 규칙 완화: 1.18배로 조정
        this.price = Math.round(this.price * 1.18);
        // 최소 5 코인씩만이라도 오르도록 보정 (계단 효과 방지)
        if(this.price % 5 !== 0) this.price += (5 - (this.price % 5));
        syncPlayer();
      }
    }
  ];

  const purchased = new Set();

  // 입력
  window.addEventListener('keydown', (e)=>{
    if(e.code === 'KeyP'){
      // 플레이 중일 때만 상점 토글
      if(Game.UI && Game.UI.state.current === 'playing'){
        open = !open;
      }
      e.preventDefault();
    }
    if(!open) return;
    // ← → 이동으로 인덱스 변경
    if(e.code === 'ArrowRight'){
      e.preventDefault();
      startTransition(1);
    } else if(e.code === 'ArrowLeft'){
      e.preventDefault();
      startTransition(-1);
    }
  });

  // 휠 스크롤 제거: 등록 안 함

  function startTransition(dir){
    const nextIndex = Math.min(Math.max(currentIndex + dir, 0), upgrades.length - 1);
    if(nextIndex === currentIndex) return;
    // 애니메이션 없이 즉시 이동
    currentIndex = nextIndex;
    animRunning = false;
    animT = 0;
  }

  function update(){ /* 애니메이션 제거: 따로 업데이트 없음 */ }

  // 모든 상점 상태 초기화(게임 재시작용)
  function reset(){
    open = false;
    currentIndex = 0;
    purchased.clear();
    // 기본 스탯 복구
    stats.fireRate = 0.5;
    stats.moveSpeed = 280;
    stats.damageMultiplier = 1;
    stats.damageFlat = 0;
    stats.pierce = 0;
    stats.projectileMultiplier = 1;
    // 업그레이드 가격/횟수 복구
    for(const u of upgrades){
      if(typeof u.basePrice === 'number') u.price = u.basePrice;
      if(u.repeatable) u.times = 0;
    }
    syncPlayer();
  }

  function draw(){
    if(!open) return;
    const c = Core.ctx;
    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = '#061423';
    const panelW = 360;
    const panelH = 440;
    const panelX = (Core.canvas.width - panelW)/2;
    const panelY = (Core.canvas.height - panelH)/2;
    roundRect(c, panelX, panelY, panelW, panelH, 20);
    c.fill();
    c.globalAlpha = 1;

    // 캐러셀 기본 파라미터
    const cardW = 300;
    const cardH = 300;
    const centerY = panelY + 70 + cardH / 2;
    const centerX = Core.canvas.width / 2;
    const spacing = cardW + 60;

    // 진행률(eased)과 scrollPos(실수 인덱스)
  const scrollPos = currentIndex;

    // 표시할 인덱스 범위(중앙 기준 좌우 한 칸씩)
    const startIdx = Math.max(Math.floor(scrollPos) - 1, 0);
    const endIdx = Math.min(Math.floor(scrollPos) + 1, upgrades.length - 1);

    for(let i = startIdx; i <= endIdx; i++){
      const offset = (i - scrollPos) * spacing;
      const dist = Math.abs(i - scrollPos);
      const scale = 1 - 0.08 * dist; // 중앙 1, 옆 약간 축소
      const alpha = 1 - 0.5 * dist;  // 중앙 1, 옆 투명도 감소
      const pulseCenter = (i === currentIndex);
      renderCard(c, upgrades[i], centerX + offset, centerY, cardW, cardH, scale, alpha, false, pulseCenter);
    }

  // 구매 버튼 및 가격/누적 정보
  const cardX = (Core.canvas.width - cardW) / 2;
  const cardY = panelY + 70;
  const btnY = cardY + cardH - 70;
  const uCenter = upgrades[currentIndex];
  const canBuyCenter = canPurchase(uCenter);
  const owned = (!uCenter.repeatable && purchased.has(uCenter.key));
  const repeated = uCenter.repeatable ? ` x${uCenter.times||0}` : '';
  const labelBtn = owned ? '구매완료' : (canBuyCenter ? '구매' : '불가');
  c.save();
  c.fillStyle = canBuyCenter ? '#2ecc71' : '#555';
  roundRect(c, cardX + 24, btnY, cardW - 48, 44, 16);
  c.fill();
  c.fillStyle = '#fff';
  c.font = 'bold 22px Arial';
  const tw = c.measureText(labelBtn).width;
  c.fillText(labelBtn, cardX + 24 + (cardW - 48) / 2 - tw / 2, btnY + 30);
  // 가격/누적
  c.font = '14px Arial';
  c.fillStyle = '#ffd700';
  const priceText = `가격: ${uCenter.price}${repeated}`;
  c.fillText(priceText, cardX + 24, btnY - 10);
  c.restore();
  // 안내 텍스트
  c.fillStyle = '#fff';
    c.font = '14px Arial';
    c.fillText('← / → 로 업그레이드 넘기기', panelX + 24, panelY + 26);
    c.fillText('P: 닫기 | 클릭: 구매', panelX + 24, panelY + 46);
    c.font = '16px Arial';
    c.fillText((currentIndex + 1) + ' / ' + upgrades.length, panelX + panelW - 90, panelY + panelH - 30);
    c.restore();
  }

  function canPurchase(u){
    if(!u.repeatable && purchased.has(u.key)) return false;
    if(u.require && !u.require()) return false;
    const coins = Game.Coins && Game.Coins.getCount ? Game.Coins.getCount() : 0;
    return coins >= u.price;
  }

  // 클릭 처리 (중앙 카드 버튼)
  window.addEventListener('click', (e)=>{
    if(!open || animRunning) return;
    const rect = Core.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const panelW = 360; const panelH = 440;
    const panelY = (Core.canvas.height - panelH)/2;
    const cardW = 300; const cardH = 300;
    const cardX = (Core.canvas.width - cardW)/2;
    const cardY = panelY + 70;
    const btnY = cardY + cardH - 70;
    if(mx>=cardX+24 && mx<=cardX+cardW-24 && my>=btnY && my<=btnY+44){
      const u = upgrades[currentIndex];
      if(canPurchase(u)){
        Game.Coins && Game.Coins.spend && Game.Coins.spend(u.price);
        if(!u.repeatable) purchased.add(u.key);
        u.apply();
      }
    }
  });

  // 렌더 유틸: 카드 한 장 그리기
  function renderCard(c, upgrade, centerX, centerY, cardW, cardH, scale=1, alpha=1, blurred=false, pulseOnCenter=false){
    const pulse = pulseOnCenter ? 0.05 * Math.sin(Date.now()/350) : 0;
    c.save();
    c.translate(centerX, centerY);
    c.scale(scale + pulse, scale + pulse);
    c.translate(-cardW/2, -cardH/2);
    c.globalAlpha = alpha;
    if(blurred){ c.filter = 'blur(2px)'; }
    c.fillStyle = purchased.has(upgrade.key) ? '#1e3b4d' : '#165a88';
    c.strokeStyle = purchased.has(upgrade.key) ? '#4fa3d1' : '#72c5ff';
    c.lineWidth = 5;
    roundRect(c, 0,0, cardW, cardH, 24);
    c.fill(); c.stroke();
    c.filter = 'none'; // 텍스트는 선명하게
    c.fillStyle = '#fff';
    c.font = 'bold 28px Arial';
    c.fillText(upgrade.name, 24, 46);
    c.font = '16px Arial';
    wrapText(c, upgrade.desc, 24, 100, cardW-48, 22);
    c.font = '20px Arial';
    c.fillStyle = '#ffd700';
    c.fillText('가격: ' + upgrade.price, 24, cardH - 110);
    c.restore();
  }

  // 유틸: 둥근 사각형
  function roundRect(c,x,y,w,h,r){
    c.beginPath();
    c.moveTo(x+r,y);
    c.lineTo(x+w-r,y);
    c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r);
    c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r);
    c.quadraticCurveTo(x,y,x+r,y);
    c.closePath();
  }

  // 유틸: 텍스트 줄바꿈
  function wrapText(c, text, x, y, maxW, lineH){
    const words = text.split(/\s+/);
    let line = '';
    for(const w of words){
      const test = line + w + ' ';
      if(c.measureText(test).width > maxW){
        c.fillText(line, x, y); y += lineH; line = w + ' ';
      } else line = test;
    }
    if(line) c.fillText(line, x, y);
  }

  // 유틸: 이징 함수
  function easeInOutCubic(t){
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 1, 3) / 2;
  }

  // 외부에서 참조할 수 있도록 인터페이스 제공
  Game.Shop = { update, draw, isOpen: ()=>open, stats, reset };

  // 초기 동기화: 현재 stats를 플레이어에 반영
  syncPlayer();

  // Player에 반영하기 위한 헬퍼(있으면 덮어씀)
  if(!Game.Player.setFireDelay){
    Game.Player.setFireDelay = function(fd){ fireDelay = fd; };
  }
  if(!Game.Player.setMoveSpeed){
    Game.Player.setMoveSpeed = function(ms){ Game.Player.player.speed = ms; };
  }
})();