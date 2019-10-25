<?PHP
require('artnum/autoload.php');
require('../lib/url.php');

function thumbs ($file, $mtype) {
  switch ($mtype) {
    default: return;
    case 'application/pdf':
      exec(sprintf('convert %s[0] %s.png', escapeshellarg($file), escapeshellarg($file)));
      return;
  }
}

$ini_conf = parse_ini_file('../conf/location.ini', true);
if (!isset($ini_conf['pictures'])) {
  $ini_conf['pictures'];
}
if (!isset($ini_conf['pictures']['storage'])) {
  $ini_conf['pictures']['storage'] = '../private/pictures';
}
$uploadDir = $ini_conf['pictures']['storage'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  header('Content-Type: application/json');
  if (!isset($_FILES['upload']) || empty($_FILES['upload'])) {
    echo '{"sucess": false, "name": "", "size": 0, "type": ""}';
    exit(0);
  }
  $tmpName = null;

  $fp = fopen($_FILES['upload']['tmp_name'], 'r');
  $firstBytes = fread($fp, 6);
  if (substr($firstBytes, 0, 5) === 'http:' || $firstBytes === 'https:') {
    rewind($fp);
    $url = fgets($fp);
    error_log($url);
    fclose($fp);
    unlink($_FILES['upload']['tmp_name']);
    if ($url) {
      $tmpName = md5($url);
      $fp = fopen($uploadDir . '/' . $tmpName, 'w');
      if ($fp) {
        $ctx = curl_init(trim($url));
        curl_setopt($ctx, CURLOPT_HEADER, 0);
        curl_setopt($ctx, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ctx, CURLOPT_FILE, $fp);
        curl_setopt($ctx ,CURLOPT_FAILONERROR, true);
        curl_exec($ctx);
        curl_close($ctx);
        fclose($fp);
        $tmpFile = $uploadDir . '/' . $tmpName;
      }
    }
  } else {
    $tmpFile = $_FILES['upload']['tmp_name'];
    fclose($fp);
  }

  if ($tmpFile && filesize($tmpFile) > 0) {
    $filename = sha1_file($tmpFile);
    $dirname = $uploadDir . '/' . substr($filename, 0, 2);
    if (!is_dir($dirname)) {
      mkdir($dirname);
    }
    $dirname .= '/' . substr($filename, 2, 2);
    if (!is_dir($dirname)) {
      mkdir($dirname);
    }
    rename($tmpFile, $dirname . '/' . $filename);
    $type = mime_content_type($dirname . '/' . $filename);
    thumbs($dirname . '/' . $filename, $type);
    echo '{"success": true, "name": "' . $filename . '", "size": ' . filesize($dirname . '/' . $filename) . ', "mimetype": "' . $type . '"}';
  } else {
    unlink($tmpFile);
    echo '{"sucess": false, "name": "", "size": 0, "type": ""}';
  }
} else {
  if (isset($_SERVER['PATH_INFO'])) {
    $op = 'open';
    $id = substr($_SERVER['PATH_INFO'], 1);
    $parts = explode(',', $id);
    if (count($parts) === 2) {
      if (ctype_alnum($parts[0]) && ctype_alnum($parts[1])) {
        $id = $parts[0];
        $op = $parts[1];
      }
    }
    if (ctype_alnum($id)) {
      $dir = substr($id, 0, 2);
      if (is_dir($uploadDir . '/' . $dir)) {
        $dir .= '/' . substr($id, 2, 2);
        if (is_dir($uploadDir . '/'  . $dir)) {
          if (is_readable($uploadDir . '/'. $dir . '/' . $id)) {
            if ($op === 'open' && is_readable($uploadDir . '/' . $dir . '/' . $id . '.png')) {
              header('Content-Type: image/png');
              readfile($uploadDir . '/' . $dir . '/' . $id . '.png');
            } else {
              $type = mime_content_type($uploadDir . '/' . $dir . '/' . $id);
              header('Content-Type: ' . $type);
              readfile($uploadDir . '/' . $dir . '/' . $id);
            }
          }
        }
      }
    }
  }
}
?>
