// TODO : comments, organize code

//noinspection JSCheckFunctionSignatures,JSCheckFunctionSignatures,JSCheckFunctionSignatures
var game = new Phaser.Game(gameWidth+menuWidth, numBlocksY*blockSize+blockSize, Phaser.AUTO, document.getElementById('game'));
game.state.add('Menu',Menu);
game.state.add('Game',Game);
game.state.add('Leaderboard',Leaderboard);

game.state.start('Menu');

//Place whine lines on the left and right sides of the game scene
function placeSeparators(){
    var leftSeparator = game.add.graphics(0, 0);
    leftSeparator.lineStyle(3, 0xffffff, 1);
    leftSeparator.lineTo(0,game.world.height);
    var rightSeparator = game.add.graphics(gameWidth+menuWidth-3, 0);
    rightSeparator.lineStyle(3, 0xffffff, 1);
    rightSeparator.lineTo(0,game.world.height);
}

//Place the start button that shows up on the menu screen and on the leaderboard
function startButton(pos){ // pos = 1 : display on menu sreen, pos = 2: display on leaderboard
    var y = (pos == 1 ? 400 : 550);
    var button = game.add.button(game.world.centerX, y, 'button', startGame, this, 2, 1, 0);
    button.anchor.setTo(0.5);
}

function startGame(){
    game.state.start('Game');
}

function loadLeaderboard(){
    game.state.start('Leaderboard');
}
