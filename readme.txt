Tetris clone made to get acquainted with various Phaser functionalities. Tetris' gameplay doesn't necessarily call for
using a full-fledged game engine, but I tried to cram in as many relevant functionalities as I could for practice,
and all that combined might make for an interesting example for other Phaser users. It includes:

        Changing the controls of the game
        Sound effects and music, which can be turned on/off using the relevant button, and are interrupted on the pause screen
        Tweens to animate the clearing and collapsing of lines
        A loop to manage the fall of the tetromino, which accelerates as you complete more lines
        A leaderboard served by a PHP back end to keep track of the scores of the players
        Text using bitmapfonts
        Plus the necessary basics such as imput management and rendering the sprites

Not much in terms of fancy sprites stuff and collisions unfortunately, because the game didn't really call for it.
I didn't try to polish the appearance, as it was before all an exercise in Phaser.

Most of my assets are stolen from the first results of some google searches ; if you see something that you created,
let me know and I can give you credit for it here.

=======
Credits:
=======

Start button sprite stolen from the Monster Wants Candy demo : https://github.com/EnclaveGames/Monster-Wants-Candy-demo/


=====
License:
=====

MIT License

Copyright (c) 2016 Jerome Renaux

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.