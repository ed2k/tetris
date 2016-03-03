var Game = {};

var blocksPerTetromino = 4;
var nbBlockTypes = 7; // 7 possible tetrominoes
var blockSize = 32; // px
var numBlocksY = 19; // make the grid 19 blocks high
var numBlocksX = 19; // make the grid 19 blocks wide

var gameWidth = numBlocksX*blockSize; // width of the grid in pixels
var menuWidth = 300;

var movementLag = 100; // Delay in ms below which two consecutive key presses are counted as the same one (to avoid super fast movement)

var scoreX = gameWidth+90; // x position of the score text

var nbNext = 1; // number of next tetrominoes to display on the right
var blockValue = 1; // value in the grid of a cell occupied by a block of a fallen tetromino
var occupiedValue = 2; // value in the grid of a cell occupied by a block of the currently fallking tetromino

var score = 0; // score of the player
var scoreIncrement = 50; // by how much the score increases with each completed line
var completedLines = 0;
var linesThreshold = 3; // number of lines to complete before the falling speed and points reward increase
var speedUp = 100; // by how much (in ms) does the falling speed increase every linesThreshold lines completed
var scorePlus = 25; // by how much does the points reward increase every linesThreshold lines completed
var timeOut = Phaser.Timer.SECOND; // Falling speed of the falling tetromino (one block per second initially)

var queue = []; // contains the list the nbNext next tetrominoes to display
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
var tetromino, cursors, rotates, pause, pauseText, scoreTitle, scoreText, linesText, scene, sceneSprites, timer, loop,  shade;
var currentMovementTimer = 0; // counter to prevent excessive movements when key press or multiple key downs

// The Tetromino object used to represent the falling tetromino
function Tetromino(){
    this.shape = Math.floor(Math.random() * nbBlockTypes);
    this.color = Math.floor(Math.random() * nbBlockTypes);
    this.sprites = []; // list of the sprites of each block
    this.cells = []; // list of the cells occupied by the tetromino
    this.center = [0,0];
    // materialize makes the tetromino appear, either in the scene (inGame = true) or on the right (inGame = false) if it's the next tetromino
    this.materialize = function(c_x,c_y,inGame) {
        this.center = [c_x,c_y];
        this.cells = [];
        // clean previous sprites if any
        for(var j = 0; j < this.sprites.length; j++){
            this.sprites[j].destroy();
        }
        this.sprites = [];
        var conflict = false; // Are there occupied cells where the tetrominon will appear? If yes -> game over
        for(var i = 0; i < blocksPerTetromino; i++) {
            // Compute the coordinates of each block of the tetromino, using it's offset from the center
            var x = c_x + offsets[this.shape][i][0];
            var y = c_y + offsets[this.shape][i][1];
            var sprite = game.add.sprite(x * blockSize, y * blockSize, 'blocks', this.color);
            this.sprites.push(sprite);
            this.cells.push([x, y]);
            if (inGame) {
                if(!validateCoordinates(x,y)){
                    conflict = true;
                }
                scene[x][y] = blockValue; // 1 for blocks of current tetromino, 2 for fallen blocks
            }
        }
        return conflict;
    };
}

Game.radio = { // object that stores sound-related information
    soundOn : true,
    moveSound : null,
    gameOverSound : null,
    winSound : null,
    music : null,
    // Play music if all conditions are met
    playMusic : function(){
        if(Game.radio.soundOn && !pauseState){
            Game.radio.music.resume();
        }
    },
    // Toggle sound on/off
    manageSound : function(sprite){
        sprite.frame = 1- sprite.frame;
        Game.radio.soundOn = !Game.radio.soundOn;
        if(Game.radio.soundOn){
            Game.radio.playMusic();
        }else{
            Game.radio.music.pause();
        }
    },
    // Play sound if all conditions are met
    playSound : function(sound) {
        if (Game.radio.soundOn && !pauseState) {
            sound.play();
        }
    }
};

Game.preload = function() {
    game.load.spritesheet('blocks','assets/blocks.png',blockSize,blockSize,nbBlockTypes+1);
    game.load.spritesheet('sound','assets/sound.png',32,32); // Icon to turn sound on/off
    game.load.audio('move','assets/sound/move.mp3','assets/sound/move.ogg');
    game.load.audio('win','assets/sound/win.mp3','assets/sound/win.ogg');
    game.load.audio('gameover','assets/sound/gameover.mp3','assets/sound/gameover.ogg');
};

Game.create = function(){
    // 2D array of numBlocksX*numBlocksY cells corresponding to the playable scene; will contains 0 for empty, 1 if there is already
    // a block from the current tetromino, and 2 if there is a block from a fallen tetromino
    scene = [];
    sceneSprites = []; // same but stores sprites instead
    // Fills the two arrays with empty cells
    for(var i = 0; i < numBlocksX; i++){
        var col = [];
        var spriteCol = [];
        for(var j = 0; j < numBlocksY; j++) {
            col.push(0);
            spriteCol.push(null);
        }
        scene.push(col);
        sceneSprites.push(spriteCol);
    }

    pauseState = false;
    gameOverState = false;

    // Places separator between the scene and the right pannel
    var middleSeparator = game.add.graphics(gameWidth, 0);
    middleSeparator.lineStyle(3, 0xffffff, 1);
    middleSeparator.lineTo(0,game.world.height);
    placeSeparators();

    game.add.tileSprite(0,game.world.height-blockSize,gameWidth,blockSize,'blocks',0); // ground
    // Sound on/off icon
    var sound = game.add.sprite(game.world.width-38, 0, 'sound', 0);
    sound.inputEnabled = true;
    sound.events.onInputDown.add(Game.radio.manageSound, this);

    // Text for the score, number of lines, next tetromino
    scoreTitle = game.add.bitmapText(gameWidth+50, 0, 'desyrel', 'Score',64);
    scoreText = game.add.bitmapText(scoreX, 60, 'desyrel', '0', 64);
    var linesTitle = game.add.bitmapText(gameWidth+50, 140, 'desyrel', 'Lines',64);
    linesText = game.add.bitmapText(scoreX, 200, 'desyrel', '0', 64);
    var nextTitle = game.add.bitmapText(gameWidth+75, 300, 'desyrel', 'Next',64);
    alignText();
    nextTitle.x = scoreTitle.x + scoreTitle.textWidth/2 - (nextTitle.textWidth * 0.5);
    linesTitle.x = scoreTitle.x + scoreTitle.textWidth/2 - (linesTitle.textWidth * 0.5);

    // spawn a new tetromino and the scene and update the next one
    manageTetrominos();

    // Register the keys selected by the player on the menu screen. It might not be the best practice to feed in the raw values
    // from the form, but I didn't want to focus too much on this functionality.
    game.input.keyboard.enabled = true;
    // Movement keys
    cursors = {
        right : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("moveright").value]),
        left : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("moveleft").value]),
        down : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("movedown").value])
    };
    // Rotation keys
    rotates = {
        counterClockwise : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("rotateright").value]),
        clockwise: game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("rotateleft").value])
    };
    pause = game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("pause").value]);

    // Timer to make the the falling tetromino fall
    timer = game.time.events;
    loop = timer.loop(timeOut, fall, this);
    timer.start();

    // Sound effets and Game.radio.music
    Game.radio.moveSound = game.add.audio('move');
    Game.radio.winSound = game.add.audio('win');
    Game.radio.gameOverSound = game.add.audio('gameover');
    Game.radio.music = game.add.audio('music');
    Game.radio.music.volume = 0.2;
    Game.radio.music.loopFull();
};


function updateScore(){
    score += scoreIncrement;
    completedLines++;
    scoreText.text = score;
    linesText.text = completedLines;
    alignText();
    updateTimer();
}

function updateTimer(){
    if(completedLines%linesThreshold == 0){
        loop.delay -= speedUp; // Accelerates the fall speed
        scoreIncrement += scorePlus; // Make lines more rewarding
    }
}

function alignText(){
    var center = scoreTitle.x + scoreTitle.textWidth/2;
    scoreText.x = center - (scoreText.textWidth * 0.5);
    linesText.x = center - (linesText.textWidth * 0.5);
}

function manageTetrominos(){
    // Keep the queue filled with as many tetrominos as needed
    while(queue.length < nbNext+1) {
        queue.unshift(new Tetromino()); // adds at beginning of array
    }
    tetromino = queue.pop(); // the last one will be put on the stage
    var start_x = Math.floor(numBlocksX/2);
    var start_y = y_start[tetromino.shape];
    var conflict = tetromino.materialize(start_x,start_y,true);
    if(conflict){
        gameOver();
    }else{
        // display the next tetromino(s)
        for (var i = 0; i < queue.length; i++) {
            var s_x = Math.floor((scoreTitle.x + scoreTitle.textWidth / 2) / 32);
            var s_y = 14;
            queue[i].materialize(s_x, s_y, false);
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
function slide(block,dir){
    var new_x = tetromino.cells[block][0] + move_offsets[dir][0];
    var new_y = tetromino.cells[block][1] + move_offsets[dir][1];
    return [new_x,new_y];
}

// Move the center of the falling tetromino left, right or down
function slideCenter(dir){
    var new_center_x = tetromino.center[0] + move_offsets[dir][0];
    var new_center_y = tetromino.center[1] + move_offsets[dir][1];
    return [new_center_x,new_center_y];
}

// Rotate a block of the falling tetromino (counter)clockwise
function rotate(block,dir){
    var c_x = tetromino.center[0];
    var c_y = tetromino.center[1];
    var offset_x = tetromino.cells[block][0] - c_x;
    var offset_y = tetromino.cells[block][1] - c_y;
    offset_y = -offset_y; // Adjust for the JS coordinates system instead of Cartesian
    var new_offset_x = ((dir == "clockwise")) ? offset_y : -offset_y;
    var new_offset_y = ((dir == "clockwise")) ? -offset_x : offset_x;
    new_offset_y = -new_offset_y;
    var new_x = c_x + new_offset_x;
    var new_y = c_y + new_offset_y;
    return [new_x,new_y];
}

// Uses the passed callback to check if the desired move (slide or rotate) doesn't conflict with something
function canMove(coordinatesCallback,dir){
    if(pauseState){
        return false;
    }
    for(var i = 0; i < tetromino.cells.length; i++){
        var new_coord = coordinatesCallback(i,dir); // return coords in terms of cells, not pixels
        var new_x = new_coord[0];
        var new_y = new_coord[1];
        if(!validateCoordinates(new_x,new_y)){
            return false;
        }
    }
    return true;
}

function validateCoordinates(new_x,new_y){
    if(new_x < 0 || new_x > numBlocksX-1){
        //console.log('Out of X bounds');
        return false;
    }
    if(new_y < 0 || new_y > numBlocksY-1){
        //console.log('Out of Y bounds');
        return false;
    }
    if(scene[new_x][new_y] == occupiedValue){
        //console.log('Cell is occupied');
        return false;
    }
    return true;
}

// Move (slide or rotate) a tetromino according to the provided callback
function move(coordinatesCallback,centerCallback,dir,soundOnMove){
    for(var i = 0; i < tetromino.cells.length; i++){
        var old_x = tetromino.cells[i][0];
        var old_y = tetromino.cells[i][1];
        var new_coord = coordinatesCallback(i,dir);
        var new_x = new_coord[0];
        var new_y = new_coord[1];
        tetromino.cells[i][0] = new_x;
        tetromino.cells[i][1] = new_y;
        tetromino.sprites[i].x = new_x*blockSize;
        tetromino.sprites[i].y = new_y*blockSize;
        scene[old_x][old_y] = 0;
        scene[new_x][new_y] = blockValue;
    }
    if(centerCallback) {
        var center_coord = centerCallback(dir);
        tetromino.center = [center_coord[0],center_coord[1]];
    }
    if(soundOnMove) {
        Game.radio.playSound(Game.radio.moveSound);
    }
}

function lineSum(l){
    var sum = 0;
    for(var k = 0; k < numBlocksX; k++){
        sum += scene[k][l];
    }
    return sum
}

// check if the lines corresponding to the y coordinates in lines are full ; if yes, clear them and collapse the lines above
function checkLines(lines) {
    var collapsedLines = [];
    for(var j = 0; j < lines.length; j++){
        var sum = lineSum(lines[j]);
        // A line is completed if all the cells of that line are marked as occupied
        if(sum == (numBlocksX*occupiedValue)) { // the line is full
            updateScore();
            collapsedLines.push(lines[j]);
            Game.radio.playSound(Game.radio.winSound);
            cleanLine(lines[j]);
        }
    }
    if(collapsedLines.length){
        collapse(collapsedLines);
    }
}

// Remove all blocks from a filled line
function cleanLine(line){
    var delay = 0;
    for (var k = 0; k < numBlocksX; k++) {
        // Make a small animation to send the removed blocks flying to the top
        var tween = game.add.tween(sceneSprites[k][line]);
        tween.to({ y: 0}, 500,null,false,delay);
        tween.onComplete.add(destroy, this);
        tween.start();
        sceneSprites[k][line] = null;
        scene[k][line] = 0;
        delay += 50; // For each block, start the tween 50ms later so they move wave-like
    }
}

function destroy(sprite){
    sprite.destroy();
}

// Once a lone has been cleared, make the lines above it fall down ; the argument lines is a list of the y coordinates of the
// lines that have been cleared
function collapse(lines){
    // Find the min y value of the cleared lines, i.e. the highermost cleared line ; only lines above that one have to collapse
    var min = 999;
    for(var k = 0; k < lines.length; k++){
        if(lines[k] < min){
            min = lines[k];
        }
    }
    // From the highermost cleared line - 1 to the top, collapse the lines
    for(var i = min-1; i >= 0; i--){
        for(var j = 0; j < numBlocksX; j++){
            if(sceneSprites[j][i]) {
                // lines.length = the number of lines that have been cleared simultaneously
                sceneSprites[j][i+ lines.length] = sceneSprites[j][i];
                sceneSprites[j][i] = null;
                scene[j][i + lines.length] = occupiedValue;
                scene[j][i] = 0;
                // Make some animation to collapse the lines
                var tween = game.add.tween(sceneSprites[j][i+ lines.length]);
                var new_y = sceneSprites[j][i+ lines.length].y + (lines.length * blockSize);
                tween.to({ y: new_y}, 500,null,false);
                tween.start();
            }
        }
    }
}

/*function displayScene(){
    console.log('Scene length'+scene.length);
    for(var i = 0; i < scene.length; i++){
        for(var j = 0; j < scene[i].length; j++) {
            console.log(scene[i][j]);
        }
    }
}*/
// Makes the falling tetromino fall
function fall(){
    if(pauseState || gameOverState){return;}
    if(canMove(slide,"down")){
        move(slide,slideCenter,"down",0);
    }else{ // If it cannot move down, it means it is touching fallen blocks ; it's time to see if a line has been completed
        // and to spawn a new falling tetromino
        var lines = [];
        for(var i = 0; i < tetromino.cells.length; i++){
            // Make a set of the y coordinates of the falling tetromino ; the lines corresponding to those y coordinates will be
            // checked to see if they are full
            if(lines.indexOf(tetromino.cells[i][1]) == -1) { // if the value is not yet in the list ...
                lines.push(tetromino.cells[i][1]);
            }
            var x = tetromino.cells[i][0];
            var y = tetromino.cells[i][1];
            scene[x][y] = occupiedValue;
            sceneSprites[tetromino.cells[i][0]][tetromino.cells[i][1]] = tetromino.sprites[i];
        }
        checkLines(lines); // check if lines are completed
        manageTetrominos(); // spawn a new tetromino and update the next one
    }
}

// Puts a shade on the stage for the game over and pause screens
function makeShade(){
    shade = game.add.graphics(0, 0);
    shade.beginFill(0x000000,0.6);
    shade.drawRect(0,0,game.world.width,game.world.height);
    shade.endFill();
}

function managePauseScreen(){
    pauseState = !pauseState;
    if(pauseState){
        Game.radio.music.pause();
        makeShade();
        pauseText = game.add.bitmapText(game.world.centerX, game.world.centerY, 'videogame', 'PAUSE',64);
        pauseText.anchor.setTo(0.5);

    }else{
        timer.resume();
        Game.radio.playMusic();
        shade.clear();
        pauseText.destroy();
    }
}

function gameOver(){
    gameOverState = true;
    game.input.keyboard.enabled = false;
    Game.radio.music.pause();
    Game.radio.playSound(Game.radio.gameOverSound);
    makeShade();
    var gameover = game.add.bitmapText(game.world.centerX, game.world.centerY, 'gameover', 'GAME OVER',64);
    gameover.anchor.setTo(0.5);
    // Display the form to input your name for the leaderboard
    document.getElementById("name").style.display =  "block";
}

Game.update = function(){
    currentMovementTimer += this.time.elapsed;
    if (currentMovementTimer > movementLag) { // Prevent too rapid firing
        if(pause.isDown){
            managePauseScreen();
        }
        if (cursors.left.isDown)
        {
            if(canMove(slide,"left")){
                move(slide,slideCenter,"left",1);
            }
        }
        else if (cursors.right.isDown)
        {
            if(canMove(slide,"right")){
                move(slide,slideCenter,"right",1);
            }
        }
        else if (cursors.down.isDown)
        {
            if(canMove(slide,"down")){
                move(slide,slideCenter,"down",1);
            }
        }
        else if (rotates.clockwise.isDown)
        {
            if(canMove(rotate,"clockwise")){
                move(rotate,null,"clockwise",1);
            }else{
                //console.log('Cannot rotate');
            }
        }
        else if (rotates.counterClockwise.isDown)
        {
            if(canMove(rotate,"counterclockwise")){
                move(rotate,null,"counterclockwise",1);
            }else{
                //console.log('Cannot rotate');
            }
        }
        currentMovementTimer = 0;
    }
};

Game.shutdown = function(){
    document.getElementById('name').style.display = "none";
};