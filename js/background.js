// background.js : 전진하는 우주(파랄럭스 스타필드)
(function(){
  const { Core } = Game;
  const stars = [];
  const layers = [
    { count: 60, speed: 20, size: [0.5, 1.2], color: 'rgba(255,255,255,0.5)' },
    { count: 40, speed: 40, size: [0.8, 1.8], color: 'rgba(255,255,255,0.8)' },
    { count: 20, speed: 70, size: [1.0, 2.4], color: 'rgba(255,255,255,1.0)' }
  ];

  function init(){
    stars.length = 0;
    layers.forEach(layer => {
      for(let i=0;i<layer.count;i++){
        stars.push({
          x: Core.randRange(0, Core.canvas.width),
          y: Core.randRange(0, Core.canvas.height),
          r: Core.randRange(layer.size[0], layer.size[1]),
          speed: layer.speed,
          color: layer.color
        });
      }
    });
  }

  function update(){
    const dt = Core.deltaTime.value;
    for(const s of stars){
      s.y += s.speed * dt;
      if(s.y - s.r > Core.canvas.height){
        s.y = -s.r;
        s.x = Core.randRange(0, Core.canvas.width);
      }
    }
  }

  function draw(){
    const c = Core.ctx;
    // 배경 그라디언트 (깊이감)
    const g = c.createLinearGradient(0,0,0,Core.canvas.height);
    g.addColorStop(0, '#030712');
    g.addColorStop(1, '#0b1224');
    c.fillStyle = g;
    c.fillRect(0,0,Core.canvas.width, Core.canvas.height);

    for(const s of stars){
      c.fillStyle = s.color;
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI*2);
      c.fill();
    }
  }

  Game.Background = { init, update, draw };
})();