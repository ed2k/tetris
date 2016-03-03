/*
 * Author: Jerome Renaux
 * E-mail: jerome.renaux@gmail.com
 */


var Leaderboard = {};

Leaderboard.preload = function(){};

Leaderboard.create = function(){
    var ldb = game.add.bitmapText(game.world.centerX, 80, 'videogame', 'LEADERBOARD',64);
    ldb.anchor.setTo(0.5);
    placeSeparators();
    // Get the data from the server
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "server.php", true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function(){
        //console.log('Response : '+xhr.responseText);
        var response = JSON.parse(xhr.responseText);
        var y_increment = 60;
        for(i in response){
            game.add.bitmapText(50, 150 + (y_increment * i), 'desyrel', response[i].name, 32);
            var scoretxt = game.add.bitmapText(0, 150 + (y_increment * i), 'desyrel', response[i].score.toString(), 32);
            scoretxt.x = game.world.width - scoretxt.textWidth - 15;
        }
        startButton(2);
    };
    var data = "get=1";
    xhr.send(data);
};