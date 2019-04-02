<?PHP
include ('class.uuid.php/class.uuid.php');
echo '{"uuid": "' . UUID::generate(UUID::UUID_RANDOM, UUID::FMT_STRING) . '"}'
?>
