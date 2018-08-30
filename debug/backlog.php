<?PHP
$body = file_get_contents('php://input');
if ($body) {
   file_put_contents('data/debug.log', $body . "\n", FILE_APPEND);
}
?>
