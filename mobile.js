/*
* Author: Jerome Renaux
* E-mail: jerome.renaux@gmail.com
 */

var gWindowHeight = 640;
var gWindowWidth = 480
var game;
var blocksPerTetromino = 4;
var nbBlockTypes = 7; // 7 possible tetrominoes
var blockSize = 32; // px
var gScale = 1;
var gInGameOffsetX = 2.75;
var gInGameOffsetY = 3;
var numBlocksY = 19; // make the grid 19 blocks high
var numBlocksX = 10; // make the grid 10 blocks wide

var movementLag = 100; // Delay in ms below which two consecutive key presses are counted as the same one (to avoid super fast movement)

var scoreX = 0; // x position of the score text

var nbNext = 5; // number of next tetrominoes to display on the right
const EMPTY = 0;
const blockValue = 1; // value in the grid of a cell occupied by a block of a fallen tetromino
const occupiedValue = 2; // value in the grid of a cell occupied by a block of the currently falling tetromino

var score = [0, 0]; // score of the player
var scoreIncrement = 50; // by how much the score increases with each completed line
var completedLines = [0, 0];
var linesThreshold = 3; // number of lines to complete before the falling speed and points reward increase
var speedUp = 100; // by how much (in ms) does the falling speed increase every linesThreshold lines completed
var scorePlus = 25; // by how much does the points reward increase every linesThreshold lines completed
var timeOut = 1000; //SECOND; // Falling speed of the falling tetromino (one block per second initially)

var queue = []; // contains the list the nbNext next tetrominoes to display
var queue2 = []; // contains the list the nbNext next tetrominoes to display
var pauseState = false;
var gameOverState = false;


// the positions of each block of a tetromino with respect to its center (in cell coordinates)
var offsets = {
    0 : [[0,-1],[0,0],[0,1],[1,1]], // L
    1 : [[0,-1],[0,0],[0,1],[-1,1]], // J
    2 : [[-1,0],[0,0],[1,0],[2,0]], // I
    3 : [[-1,-1],[0,-1],[0,0],[-1,0]], // 0
    4 : [[-1,0],[0,0],[0,-1],[1,-1]],// S
    5 : [[-1,0],[0,0],[1,0],[0,1]], // T
    6 : [[-1,-1],[0,-1],[0,0],[1,0]] // Z
};

// the y position of each tetromino (in cell coordinates)
var y_start = {
    0 : 1,
    1 : 1,
    2 : 0,
    3 : 1,
    4 : 1,
    5 : 0,
    6 : 1
};
// The amount of cells ([x,y]) by which the tetrominoes move in each direction
var move_offsets = {
    "left" : [-1,0],
    "down" : [0,1],
    "right" : [1,0]
};

// Lots of global variables ; should encapsulate more in future work
var tetromino, pause, pauseText, scoreTitle, scoreText, scene, sceneSprites, timer, loop, shade;
var currentMovementTimer = 0; // counter to prevent excessive movements when key press or multiple key downs

// The Tetromino object used to represent the falling tetromino
class Tetromino {
    constructor(player, game) {
        this.game = game;
        this.id = player;
        this.shape = Math.floor(Math.random() * nbBlockTypes);
        this.color = this.shape
        this.sprites = []; // list of the sprites of each block
        this.shadowSprites = [];
        this.cells = []; // list of the cells occupied by the tetromino
        this.center = [0,0];    
    }

    // materialize makes the tetromino appear, either in the scene (inGame = true) or on the right (inGame = false) if it's the next tetromino
    materialize(c_x, c_y, inGame) {
        this.center = [c_x, c_y];
        this.cells = [];
        // clean previous sprites if any
        for(var j = 0; j < this.sprites.length; j++){
            this.sprites[j].destroy();
        }
        this.sprites = [];
        var conflict = false; // Are there occupied cells where the tetrominon will appear? If yes -> game over
        const spriteX = inGame ? gInGameOffsetX+0.5 : 0.5;
        const spriteY = inGame ? gInGameOffsetY+0.5 : (1.5);
        for(var i = 0; i < blocksPerTetromino; i++) {
            // Compute the coordinates of each block of the tetromino, using it's offset from the center
            var x = c_x + offsets[this.shape][i][0];
            var y = c_y + offsets[this.shape][i][1];
            var sprite = this.game.add.sprite((spriteX + x) * blockSize * gScale, 
              (spriteY + y) * blockSize * gScale, 'blocks', this.color)
              .setScale(gScale);
            this.sprites.push(sprite);
            var shade = this.game.add.graphics(0, 0);
            this.cells.push([x, y]);
            if (inGame) {
                if(!validateCoordinates(scene[this.id], x,y)) {
                    conflict = true;
                }
                scene[this.id][x][y] = blockValue;
                var shadow = shade.strokeRect(sprite.x-0.5*blockSize*gScale, sprite.y-0.5*blockSize*gScale,
                  sprite.width*gScale, sprite.height*gScale);
                this.shadowSprites.push(shadow);
            }
        }
        return conflict;
    }

    canMoveDown(cells) {
        for(var i = 0; i < cells.length; i++){
            var new_y = cells[i][1] + 1;
            if(!validateCoordinates(scene[this.id], cells[i][0], new_y)){
                return false;
            }        
        }
        return true;
    }

    moveDown(cells){
        for(var i = 0; i < cells.length; i++){
            var new_y = cells[i][1] + 1;
            cells[i][1] = new_y;
        }
    }

    updateTarget() {
        var shade = this.game.add.graphics(0, 0);
        var cells = [];
        this.cells.forEach(c => cells.push([c[0], c[1]]));
        while (this.canMoveDown(cells)) {
            this.moveDown(cells);
        }

        for (let i = 0; i < this.sprites.length; i++) {
            const delta = cells[i][1] - this.cells[i][1];
            const sprite = this.sprites[i];
            this.shadowSprites[i].destroy();
            this.shadowSprites[i] = shade.strokeRect(sprite.x-0.5*blockSize*gScale, sprite.y+(delta-0.5)*blockSize*gScale,
                sprite.width*gScale, sprite.height*gScale);
            }
    }
}

var Game = new Phaser.Scene("Game");
Game.preload = function () {
    this.load.spritesheet('blocks','assets/blocks.png', 
        {frameWidth: blockSize, frameHeight: blockSize/*,nbBlockTypes+1*/});
    // Icon to turn sound on/off
}

Game.create = function() {
    game = this;
    //this.scale.startFullscreen();
    // 2D array of numBlocksX*numBlocksY cells corresponding to the playable scene; will contains 0 for empty, 1 if there is already
    // a block from the current tetromino, and 2 if there is a block from a fallen tetromino
    scene = [[],[]];
    sceneSprites = [[],[]]; // same but stores sprites instead
    // Fills the two arrays with empty cells
    for (let player = 0; player < 2; player++) {
    for(var i = 0; i < numBlocksX; i++){
        var col = [];
        var spriteCol = [];
        for(var j = 0; j < numBlocksY; j++) {
            col.push(0);
            spriteCol.push(null);
        }
        scene[player].push(col);
        sceneSprites[player].push(spriteCol);
    }
    }
    pauseState = false;
    gameOverState = false;

    // Places separator around the scene
    const g = game.add.graphics();
    g.lineStyle(1, 0x00FF00, 1.0);
    const unit = blockSize*gScale;
    g.strokeRect(gInGameOffsetX*unit, gInGameOffsetY*unit, numBlocksX*unit, numBlocksY*unit);
    g.strokeRect(0, 0, gWindowWidth, gWindowHeight);

    const width = gWindowWidth;
    scoreText = [this.add.text(scoreX, 4*blockSize*gScale, '0',
      { fontFamily: 'Courier', fontSize: blockSize*gScale, fill: '#00ff00' }), null];

    // spawn a new tetromino and the scene and update the next one
    manageTetrominos(0, this);

    // Register the zone selected by the player on the menu screen. It might not be the best practice to feed in the raw values
    const b2 = 2*blockSize*gScale;
    const b4 = 4*blockSize*gScale;
    const bottom = (3+numBlocksY)*blockSize*gScale;
    const h = bottom * 7/8;
    // key press area, left turn, right turn, left, right, down
    [this.add.zone(0, h-b4, b2, b4).setOrigin(0).setName('clockwise').setInteractive(),
      this.add.zone(width-b2, h-b4, b2, b4).setOrigin(0).setName('cc').setInteractive(),
      this.add.zone(0, h, b2, b4).setOrigin(0).setName('left').setInteractive(),
      this.add.zone(width-b2, h, b2, b4).setOrigin(0).setName('right').setInteractive(),
      this.add.zone(b2, bottom, width-b4, gWindowHeight-bottom).setOrigin(0).setName('down').setInteractive()]
    .forEach(z => g.strokeRect(z.x, z.y, z.width, z.height));

    this.input.on('gameobjectdown', function (pointer, gameObject) {
        const key = gameObject.name;
        if (['clockwise', 'cc'].includes(key)) {
            if(canMove(0, rotate, key)){
                move(0, rotate, null, key);
            }
        } else {
            if(canMove(0, slide, key)){
                move(0, slide, slideCenter, key);
            }
        }
    });

    // Timer to make the the falling tetromino fall
    var timer = this.time.addEvent({
        delay: timeOut,                // ms
        callback: fallLoop,
        args: [this],
        loop: true
    });

}

// global scoreIncrement, completedLines, scoreText
function updateScore(player) {
    score[player] += scoreIncrement;
    completedLines[player]++;
    scoreText[player].setText(score[player]);
    //alignText();
    updateTimer();
}

function updateTimer() {
    if(completedLines[0]%linesThreshold == 0 || completedLines[1] % linesThreshold == 0){
        //loop.delay -= speedUp; // Accelerates the fall speed
        scoreIncrement += scorePlus; // Make lines more rewarding
    }
}

// global scoreText, scoreTitle
function alignText(){
    var center = scoreTitle.x + scoreTitle.textWidth/2;
    scoreText[0].x = center - (scoreText[0].textWidth * 0.5);
}

// global queue
function manageTetrominos(player, game){
    let que = queue2;
    if (player == 0) {
        que = queue;
    }
    // Keep the queue filled with as many tetrominos as needed
    while(que.length < nbNext+1) {
        que.unshift(new Tetromino(player, game)); // adds at beginning of array
    }
    let tetro = tetromino;
    if (player == 0) {
        tetromino = que.pop(); // the last one will be put on the stage
        tetro = tetromino;
    } else {
        gTetromino2 = que.pop(); // the last one will be put on the stage
        tetro = gTetromino2;
    }
    var start_x = Math.floor(numBlocksX/2);
    var start_y = y_start[tetro.shape];
    var conflict = tetro.materialize(start_x,start_y,true);
    if(conflict){
        gameOver();
    }else{
        const s_y = 0;
        // display the next tetromino
        for (var i = 0; i < que.length; i++) {
            const s_x = 1+i*3;
            que[i].materialize(s_x, s_y, false);
        }
    }
}

// Send the score to the database
function sendScore(){
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "server.php", true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function(){};
    // Not much is done to prevent players to tamper with the score because it would have been overkill for such a toy project
    var data = "add=1&name="+document.getElementById('playername').value+"&score="+score;
    xhr.send(data);
}

// Move a block of the falling tetromino left, right or down
function slide(tetro, block, dir){
    var new_x = tetro.cells[block][0] + move_offsets[dir][0];
    var new_y = tetro.cells[block][1] + move_offsets[dir][1];
    return [new_x,new_y];
}

// Move the center of the falling tetromino left, right or down
function slideCenter(center, dir){
    var new_center_x = center[0] + move_offsets[dir][0];
    var new_center_y = center[1] + move_offsets[dir][1];
    return [new_center_x,new_center_y];
}

// Rotate a block of the falling tetromino (counter)clockwise
function rotate(tetro, block,dir){
    var c_x = tetro.center[0];
    var c_y = tetro.center[1];
    var offset_x = tetro.cells[block][0] - c_x;
    var offset_y = tetro.cells[block][1] - c_y;
    offset_y = -offset_y; // Adjust for the JS coordinates system instead of Cartesian
    var new_offset_x = ((dir == "clockwise")) ? offset_y : -offset_y;
    var new_offset_y = ((dir == "clockwise")) ? -offset_x : offset_x;
    new_offset_y = -new_offset_y;
    var new_x = c_x + new_offset_x;
    var new_y = c_y + new_offset_y;
    return [new_x,new_y];
}

// Uses the passed callback to check if the desired move (slide or rotate) doesn't conflict with something
// tetromino
function canMove(player, coordinatesCallback, dir) {
    if(pauseState){
        return false;
    }
    const tetro = selectTetromino(player);
    for(var i = 0; i < tetro.cells.length; i++){
        var new_coord = coordinatesCallback(tetro, i, dir); // return coords in terms of cells, not pixels
        var new_x = new_coord[0];
        var new_y = new_coord[1];
        if(!validateCoordinates(scene[player], new_x, new_y)){
            return false;
        }        
    }
    return true;
}

// global scene, occupiedValue
function validateCoordinates(logicalMap, new_x,new_y){
    if(new_x < 0 || new_x > numBlocksX-1){
        //console.log('Out of X bounds');
        return false;
    }
    if(new_y < 0 || new_y > numBlocksY-1){
        //console.log('Out of Y bounds');
        return false;
    }
    if(logicalMap[new_x][new_y] == occupiedValue){
        //console.log('Cell is occupied');
        return false;
    }
    return true;
}

function selectTetromino(player) {
    if (player == 1) {
        return gTetromino2;
    }
    return tetromino;
}

// Move (slide or rotate) a tetromino according to the provided callback
function move(player, coordinatesCallback, centerCallback, dir){
    const tetro = selectTetromino(player);
    for(var i = 0; i < tetro.cells.length; i++){
        var old_x = tetro.cells[i][0];
        var old_y = tetro.cells[i][1];
        var new_coord = coordinatesCallback(tetro, i,dir);
        var new_x = new_coord[0];
        var new_y = new_coord[1];
        tetro.cells[i][0] = new_x;
        tetro.cells[i][1] = new_y;
        tetro.sprites[i].x = tetro.id*(1)+(gInGameOffsetX+0.5+new_x)*blockSize*gScale;
        tetro.sprites[i].y = (gInGameOffsetY+0.5+new_y)*blockSize*gScale;
        scene[player][old_x][old_y] = 0;
        scene[player][new_x][new_y] = blockValue;
    }
    if(centerCallback) {
        var center_coord = centerCallback(tetro.center, dir);
        tetro.center = [center_coord[0],center_coord[1]];
    }
    tetro.updateTarget();
}

function lineSum(player, l){
    var sum = 0;
    for(var k = 0; k < numBlocksX; k++){
        sum += scene[player][k][l];
    }
    return sum
}

// check if the lines corresponding to the y coordinates in lines are full.
// if yes, clear them and collapse the lines above
function checkLines(player, lines) {
    var collapsedLines = [];
    for(var j = 0; j < lines.length; j++){
        var sum = lineSum(player, lines[j]);
        // A line is completed if all the cells of that line are marked as occupied
        if(sum == (numBlocksX*occupiedValue)) { // the line is full
            updateScore(player);
            collapsedLines.push(lines[j]);
            cleanLine(player, lines[j]);
        }
    }
    if(collapsedLines.length){
        collapse(player, collapsedLines);
    }
}

// Remove all blocks from a filled line
function cleanLine(player, line){
    var delay = 0;
    for (var k = 0; k < numBlocksX; k++) {
        // Make a small animation to send the removed blocks flying to the top
        game.add.tween( {
            targets: sceneSprites[player][k][line],
            delay: delay,
            y: 0,
            duration: 500,
            ease: "Linear",
            callbackScope: this,
            onCompleteParams: [sceneSprites[player][k][line]],
            onComplete: function(twn, tgt, s) {
                s.destroy();
            }
        });
        sceneSprites[player][k][line] = null;
        scene[player][k][line] = EMPTY;
        delay += 50; // For each block, start the tween 50ms later so they move wave-like       
    }
}


// Once a line has been cleared, make the lines above it fall down; the argument lines is a list of the y coordinates of the
// global lines that have been cleared
// creat new lines on the other player
// TODO handle nonconsecutive collabse case
function collapse(player, lines){
    // Find the min y value of the cleared lines, i.e. the highermost cleared line ; only lines above that one have to collapse
    lines.sort();
    const lscene = scene[player];
    const lsSprites = sceneSprites[player];
    // From the highermost cleared line - 1 to the top, collapse the lines
    for (let hightIndex = 0; hightIndex < lines.length; hightIndex++) {
        const min = lines[hightIndex];
        for(var i = min-1; i >= 0; i--){
            for(var j = 0; j < numBlocksX; j++){
                if(lsSprites[j][i]) {
                    // lines.length the number of lines that have been cleared simultaneously
                    lsSprites[j][i + 1] = lsSprites[j][i];
                    lsSprites[j][i] = null;
                    lscene[j][i + 1] = occupiedValue;
                    lscene[j][i] = 0;
                    // Make some animation to collapse the lines
                    var new_y = lsSprites[j][i + 1].y + (blockSize*gScale);
                    lsSprites[j][i + 1].y = new_y;
                    game.add.tween( {
                        targets: lsSprites[j][i + 1],
                        duration: 500,
                        ease: "Linear",
                        y: new_y
                    });
                }
            }
        }
    }
}

function spawnTetromino(player, game) {
    const tetro = selectTetromino(player);
    // and to spawn a new falling tetromino
    var lines = [];
    for(var i = 0; i < tetro.cells.length; i++){
        // Make a set of the y coordinates of the falling tetromino ; the lines corresponding to those y coordinates will be
        // checked to see if they are full
        if(lines.indexOf(tetro.cells[i][1]) == -1) { // if the value is not yet in the list ...
            lines.push(tetro.cells[i][1]);
        }
        var x = tetro.cells[i][0];
        var y = tetro.cells[i][1];
        scene[player][x][y] = occupiedValue;
        sceneSprites[player][tetro.cells[i][0]][tetro.cells[i][1]] = tetro.sprites[i];
        tetro.shadowSprites[i].destroy();
    }
    tetro.shadowSprites = [];
    checkLines(player, lines); // check if lines are center completed
    manageTetrominos(player, game); // spawn a new tetromino and update the next one    
}

// Makes the falling tetromino fall
function fallLoop(game){
    if(pauseState || gameOverState){return;}
    if (!tetromino) {
        manageTetrominos(0, game);
    }

    if(canMove(0, slide, "down")){
        move(0, slide, slideCenter, "down");
    } else {        
        spawnTetromino(0, game); // spawn a new tetromino and update the next one
    }
}

// Puts a shade on the stage for the game over and pause screens
function makeShade(){
    shade = game.add.graphics(0, 0);
    shade.fillStyle(0x000000,0.6);
    shade.fillRect(0, 0, gWindowWidth, gWindowHeight);
}

function managePauseScreen(){
    pauseState = !pauseState;
    if(pauseState){
        makeShade();
        pauseText = game.add.text(gWindowWidth/2, gWindowHeight/2, 'PAUSE');
    }else{
        timer.resume();
        shade.clear();
        pauseText.destroy();
    }
}

function gameOver(){
    gameOverState = true;
    game.input.keyboard.enabled = false;
    makeShade();
    var gameover = game.add.text(gWindowWidth/2, gWindowHeight/2, 'GAME OVER');
    // Display the form to input your name for the leaderboard
    //document.getElementById("name").style.display =  "block";
}

var App = function() {};
App.prototype.start = function() {
    var e = [Game];
    let config = {
        type: Phaser.AUTO,
        width: gWindowWidth,
        height: gWindowHeight,
        parent: document.getElementById('gameLayout'),
        scene: e,
        title: "tetris for mobile"
    };    
	var game = new Phaser.Game(config);
    game._CONFIG = config;
    game._CONFIG.centerX = Math.round(.5 * config.width);
    game._CONFIG.centerY = Math.round(.5 * config.height);
};

window.onload = function()
{
	var app = new App();
	app.start();
}
