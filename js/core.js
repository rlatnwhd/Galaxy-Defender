// core.js : 전역 상태 및 유틸 (전역 Game 네임스페이스)
(function(){
  window.Game = window.Game || {};
  const GameNS = window.Game;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const keys = {};
  function handleKey(e, isDown){
    const code = e.code || e.key; // code 우선
    // 페이지 기본 스크롤 방지: Space/Arrow
    if(code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight'){
      e.preventDefault();
    }
    // 표준화된 코드만 기록
    if(code){ keys[code] = isDown; }
  }
  window.addEventListener('keydown', (e)=> handleKey(e, true));
  window.addEventListener('keyup', (e)=> handleKey(e, false));

  // 캔버스 기본 크기(너비는 너무 늘리지 않기)
  function setBaseSize(){
    canvas.width = 480;
    canvas.height = 800;
  }
  setBaseSize();

  // FPS 제어용
  let lastTime = 0;
  const deltaTime = { value: 0 };
  function updateDelta(time){
    deltaTime.value = (time - lastTime) / 1000; // seconds
    lastTime = time;
  }

  // 유틸 함수
  function randRange(min,max){ return Math.random() * (max-min) + min; }
  function aabb(a,b){
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }
  function isOutTop(obj){ return obj.y + obj.height < 0; }
  function isOutBottom(obj){ return obj.y > canvas.height; }
  function clamp(v,min,max){ return v < min ? min : v > max ? max : v; }

  GameNS.Core = {
    canvas, ctx, keys,
    deltaTime, updateDelta,
    randRange, aabb, isOutTop, isOutBottom, clamp
  };
})();
