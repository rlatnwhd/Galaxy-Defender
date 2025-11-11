// game.js : 초기화 및 메인 루프
(function(){
  const { Core } = Game;

  function update(time){
    Core.updateDelta(time);

    Game.Background.update();
    Game.UI.update();
    // 플레이 상태에서만 게임 시스템 업데이트
    if(Game.UI.state.current === 'playing'){
      // 상점 열려 있으면 게임 로직 일시정지(배경만 동작)
      Game.Shop.update();
      if(!Game.Shop.isOpen()){
        Game.Player.update();
        Game.Items.update();
        Game.Coins.update();
        Game.Meteor && Game.Meteor.update();
        Game.Enemies.update();
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  function draw(){
    Game.Background.draw();
    if(Game.UI.state.current === 'playing'){
      Game.Enemies.draw();
      Game.Meteor && Game.Meteor.draw();
      Game.Items.draw();
      Game.Coins.draw();
      Game.Player.draw();
      Game.Shop.draw();
    }
    // UI는 항상 마지막에 오버레이
    Game.UI.draw();
  }

  function init(){
    Game.Background.init();
    // 시작은 메인 메뉴 상태
    Game.UI.state.current = 'menu';
  }

  // 에셋 준비 후 시작
  Game.Assets.onReady(()=>{
    init();
    requestAnimationFrame(update);
  });
})();