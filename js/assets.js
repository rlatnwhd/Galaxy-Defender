// assets.js : 이미지 로딩
(function(){
  const { Core } = Game;
  const images = {};
  const manifest = {
    flight: 'images/flight.png',
    fire: 'images/fireball_1.png',
    fireSmall: 'images/fireball_2.png',
    fire3: 'images/fireball_3.png',
    fire4: 'images/fireball_4.png',
    meteor: 'images/meteor.png',
    item: 'images/item.png',
    coin: 'images/coin.png',
    ufo: 'images/ufo.png',
    ufoEnemy: 'images/ufo_enemy.png'
  };

  let loaded = 0;
  const total = Object.keys(manifest).length;
  let ready = false;
  const listeners = [];

  function load(){
    Object.entries(manifest).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loaded++; if(loaded === total){ ready = true; listeners.forEach(fn=>fn()); }
      };
      img.onerror = () => { console.warn('이미지 로드 실패:', src); loaded++; if(loaded === total){ ready = true; listeners.forEach(fn=>fn()); }};
      images[key] = img;
    });
  }

  function onReady(cb){ if(ready) cb(); else listeners.push(cb); }

  load();

  Game.Assets = { images, onReady };
})();