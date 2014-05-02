<?php
// define variables and set to empty values
$userid = $password = "";

if ($_SERVER["REQUEST_METHOD"] == "POST")
{
  $name = test_input($_POST["userid"]);
  $password = test_input($_POST["password"]);
}

function test_input($data)
{
  $data = trim($data);
  $data = stripslashes($data);
  $data = htmlspecialchars($data);
  return $data;
}

header('Location: index.html?user_name='.$name);
  exit;
  
// if ($name == "jane"){
// 	header('Location: index.html');
// 	exit;
// }
// else{
// 	header('Location: login.html');
// 	exit;
// }
?>