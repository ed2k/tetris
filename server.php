<?php
// Step 1: Establish a connection
$db = new PDO("mysql:host=localhost;dbname=tetris", "root", "");

function handleError($error,$id){
    if (!is_null($error[2])) {
        echo 'Query ',$id,' failed! ',$error[2];
    }
}
if(isset($_POST['add']) && $_POST['add'] == 1)
{
    $ok = true;
    $name = addslashes($_POST['name']);
    $score = filter_input(INPUT_POST, 'score', FILTER_VALIDATE_INT);
    $stamp = time();
    if($score === false){
        $ok = false;
    }
    if($ok){
        if($score > 9000){$score = 9000;}
        $add_query = 'INSERT INTO `leaderboard` (`name`,`score`,`stamp`)values (:name,:score,:stamp)';
        $statement = $db->prepare($add_query);
        $statement->bindParam(':name',$name);
        $statement->bindParam(':score',$score);
        $statement->bindParam(':stamp',$stamp);
        $statement->execute();
        handleError($db->errorInfo(),'1');
    }
}
if(isset($_POST['get']) && $_POST['get'] == 1) {
    // Step 2: Construct a query
    $query = 'SELECT * FROM `leaderboard` ORDER BY `score` DESC LIMIT 0, 5;';
    // Step 3: Send the query
    $result = $db->query($query);
    $error = $db->errorInfo();
    handleError($db->errorInfo(), '2');
    // Step 4: Iterate over the results
    $json_rows = [];
    while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
        $json_rows[] = '{"name" : "' . stripslashes($row['name']) . '","score" : ' . $row['score'] . '}';
    }
    echo '[', implode(',', $json_rows), ']';
    // Step 5: Free used resources
    $result->closeCursor();
}
$db = null;

