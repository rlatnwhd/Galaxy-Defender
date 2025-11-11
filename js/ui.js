// ui.js : 게임 상태 관리 (메인 메뉴 / 플레이 / 게임 오버)
(function(){
  const { Core } = Game;
  const { canvas, ctx } = Core;
  const state = { current: 'menu', explosion: null, fade: 0 };

  // 버튼 정의 간단히 (좌표는 비율 기반 계산)
  const buttons = {
    menu: [
      { key: 'start', label: '게임 시작', action: ()=> startGame() },
      { key: 'info', label: '게임 설명', action: ()=> showInfo() }
    ],
    gameover: [
      { key: 'retry', label: '다시하기', action: ()=> retryGame() },
      { key: 'menu', label: '메인으로', action: ()=> toMenu() }
    ]
  };

  let infoVisible = false;

  function startGame(){
    infoVisible = false;
    state.current = 'playing';
    Game.Player.reset();
    // 파워레벨을 1로 초기화한 뒤 시작
    Game.Items.reset && Game.Items.reset();
    // 상점/스탯도 기본값으로 초기화
    Game.Shop && Game.Shop.reset && Game.Shop.reset();
    Game.Enemies.reset();
    Game.Coins.reset();
    Game.Meteor && Game.Meteor.reset();
    state.fade = 0;
  }

  function retryGame(){
    startGame();
  }

  function toMenu(){
    state.current = 'menu';
    state.fade = 0;
    infoVisible = false;
  }

  function showInfo(){
    infoVisible = !infoVisible;
  }

  function triggerExplosion(px, py){
    state.explosion = { x: px, y: py, t: 0, dur: 0.6 };
  }

  function gameOver(){
    state.current = 'gameover';
    state.fade = 0; // 게임오버 패널 페이드 인
  }

  function update(){
    const dt = Core.deltaTime.value;
    if(state.explosion){
      state.explosion.t += dt;
      if(state.explosion.t >= state.explosion.dur){ state.explosion = null; }
    }
    if(state.current === 'gameover'){
      state.fade = Math.min(state.fade + dt * 1.5, 1); // 페이드 인
    }
  }

  function draw(){
    if(state.current === 'menu') drawMenu();
    if(state.current === 'gameover') drawGameOver();
    if(state.explosion) drawExplosion(state.explosion);
  }

  function drawMenu(){
    ctx.save();
    ctx.fillStyle = '#071b2e';
    ctx.globalAlpha = 0.92;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    // 중앙 정렬로 텍스트 배치
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px Arial';
    const title = 'GALAXY DEFENDER';
    ctx.fillText(title, canvas.width/2, 120);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#9fdfff';
    ctx.fillText('방향키/WASD 이동 | 스페이스 발사 | P 상점', canvas.width/2, 168);

    // 버튼 렌더
    const btnW = 300; const btnH = 60;
    buttons.menu.forEach((b,i)=>{
      const bx = canvas.width/2 - btnW/2;
      const by = 230 + i*(btnH+20);
      drawButton(bx, by, btnW, btnH, b.label, '#146', '#29a');
      b.bounds = { x: bx, y: by, w: btnW, h: btnH };
    });

    if(infoVisible){
      drawInfoPanel();
    } else {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#ccc';
      ctx.fillText('게임 설명 버튼을 눌러 상세 정보를 확인하세요.', canvas.width/2, 450);
    }
    ctx.restore();
  }

  function drawInfoPanel(){
    // 폭/좌표
    const pw = 440;
    const px = canvas.width/2 - pw/2;
    const py = 520;
    // 내용 준비
    const title = '게임 설명';
    const body = [
      '이동: 방향키/WASD | 공격: 스페이스 | 상점: P',
      '적 행(row)을 격파하고 아이템을 수집해 파워를 올리세요.',
      '상점(P)에서 공속/관통/추가 투사체/데미지 업그레이드.',
      '빨간 적은 코인과 아이템을 더 많이 드롭합니다.',
      '메테오 경고 후 낙하! 경로에 가까이 가지 마세요.'
    ];
    const contentX = px + 76; // 아이콘 영역 확보
    const contentW = pw - 76 - 24; // 오른쪽 여백 24
    const lineH = 22;

    // 래핑 및 높이 계산
    let wrapped = [];
    ctx.save();
    ctx.font = '16px Arial';
    let totalH = 40; // 타이틀 여백 포함 시작
    for(const text of body){
      const lines = wrapLines(text, contentW, '16px Arial');
      wrapped.push(lines);
      totalH += lines.length * lineH + 6; // 항목 간 약간의 여백
    }
    const ph = totalH + 32; // 하단 여백

    // 패널 배경
    ctx.fillStyle = 'rgba(20,40,70,0.85)';
    roundRect(px,py,pw,ph,24); ctx.fill();

    // 타이틀
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, px+24, py+36);

    // 본문 + 아이콘
    ctx.font = '16px Arial';
    let cy = py + 70;
    const imgs = Game.Assets && Game.Assets.images;
    // 본문 5줄에 맞춘 아이콘 매핑
    const icons = [
      imgs && imgs.flight,                // 조작 안내: 비행선 아이콘
      imgs && (imgs.ufoEnemy||imgs.ufo),  // 적 격파
      imgs && imgs.coin,                  // 상점/업그레이드(코인 상징)
      imgs && (imgs.ufoEnemy||imgs.ufo),  // 빨간 적 드롭
      imgs && imgs.meteor                 // 메테오 주의
    ];
    const iconSize = 28;
    for(let i=0;i<body.length;i++){
      const iconY = cy - 18;
      const ic = icons[i];
      if(ic && ic.complete){ ctx.drawImage(ic, px+24, iconY, iconSize, iconSize); }
      else { ctx.fillStyle = ['#6cf','#fa6','#aaa'][i] || '#888'; ctx.fillRect(px+24, iconY, iconSize, iconSize); }
      ctx.fillStyle = '#fff';
      for(const ln of wrapped[i]){ ctx.fillText(ln, contentX, cy); cy += lineH; }
      cy += 6;
    }
    ctx.restore();
  }

  function drawGameOver(){
    const alpha = state.fade;
    ctx.save();
    ctx.globalAlpha = 0.75 * alpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = alpha;
    const panelW = 360; const panelH = 300;
    const px = canvas.width/2 - panelW/2; const py = canvas.height/2 - panelH/2;
    ctx.fillStyle = '#14283a';
    roundRect(px,py,panelW,panelH,22); ctx.fill();
    ctx.strokeStyle = '#3fa9ff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    const msg = 'GAME OVER';
    const tw = ctx.measureText(msg).width;
    ctx.fillText(msg, canvas.width/2 - tw/2, py+90);

    // 버튼들
    const btnW = 240; const btnH = 56;
    buttons.gameover.forEach((b,i)=>{
      const bx = canvas.width/2 - btnW/2;
      const by = py + 130 + i*(btnH+24);
      drawButton(bx,by,btnW,btnH,b.label,'#163','#2aa');
      b.bounds = { x: bx, y: by, w: btnW, h: btnH };
    });
    ctx.restore();
  }

  function drawExplosion(ex){
    const p = ex.t / ex.dur; // 0..1
    const r = 40 + p*140;
    const a = 1 - p;
    ctx.save();
    ctx.globalAlpha = a;
    const grd = ctx.createRadialGradient(ex.x, ex.y, r*0.2, ex.x, ex.y, r);
    grd.addColorStop(0,'rgba(255,180,60,1)');
    grd.addColorStop(0.5,'rgba(255,60,30,0.6)');
    grd.addColorStop(1,'rgba(10,10,30,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawButton(x,y,w,h,label,baseColor,hoverColor){
    // 간단한 Hover 감지 (마우스 위치)
    const mx = lastMouse.x; const my = lastMouse.y;
    const hover = mx>=x && mx<=x+w && my>=y && my<=y+h;
    ctx.save();
    ctx.fillStyle = hover ? hoverColor : baseColor;
    roundRect(x,y,w,h,16); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w/2, y + h/2);
    ctx.restore();
  }

  // 주어진 폭에 맞춰 텍스트를 줄 단위로 나눔
  function wrapLines(text, maxW, font){
    const temp = Game.Core.ctx;
    temp.save();
    temp.font = font;
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for(const w of words){
      const test = line ? line + ' ' + w : w;
      if(temp.measureText(test).width > maxW){
        if(line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if(line) lines.push(line);
    temp.restore();
    return lines;
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  const lastMouse = { x: -999, y: -999 };
  window.addEventListener('mousemove',(e)=>{
    const rect = canvas.getBoundingClientRect();
    lastMouse.x = e.clientX - rect.left;
    lastMouse.y = e.clientY - rect.top;
  });
  window.addEventListener('click',(e)=>{
    const mx = lastMouse.x; const my = lastMouse.y;
    if(state.current === 'menu'){
      buttons.menu.forEach(b=>{
        const bd = b.bounds; if(bd && mx>=bd.x && mx<=bd.x+bd.w && my>=bd.y && my<=bd.y+bd.h){ b.action(); }
      });
    } else if(state.current === 'gameover'){
      buttons.gameover.forEach(b=>{
        const bd = b.bounds; if(bd && mx>=bd.x && mx<=bd.x+bd.w && my>=bd.y && my<=bd.y+bd.h){ b.action(); }
      });
    }
  });

  Game.UI = { state, startGame, gameOver, toMenu, triggerExplosion, update, draw };
})();