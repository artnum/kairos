<?PHP
/* File Input/Output
   -----------------
   Generic file uploader / downloader
 */

require('artnum/autoload.php');
require('../lib/url.php');
require('../lib/dbs.php');
require('../lib/ini.php');

$ini_conf = load_ini_configuration();
$pdo = init_pdo($ini_conf);

function getFilePath ($dir, $filename) {
  for ($i = 0; $i <= 2; $i+=2) {
    $dir = $dir . '/' . substr($filename, $i, 2);
  }
  return $dir . '/' . $filename;  
}

switch ($_SERVER['REQUEST_METHOD']) {
  case 'POST':
    header('Content-Type: application/json');
    if (!isset($_FILES['upload']) || empty($_FILES['upload'])) {
      echo '{"sucess": false, "name": "", "size": 0, "type": "", "message": "No file"}';
      exit(0);
    }
    $tmpFile = $_FILES['upload']['tmp_name'];
    if (!is_writable($tmpFile) || !is_file($tmpFile)) {
      echo '{"sucess": false, "name": "", "size": 0, "type": "", "message": "Not file"}';
      unlink($tmpFile);
      exit(0);  
    }

    /* fix to lower case. use base36 to support filesystem that don't differentiate lower/upper case */
    $filename = strtolower(base_convert(hash_file('sha256', $tmpFile), 16, 36));
    $dirname = $ini_conf['files']['storage'];
    for ($i = 0; $i <= 2; $i+=2) {
      $dirname = $dirname . '/' . substr($filename, $i, 2);
      if (!is_dir($dirname)) { mkdir($dirname); }
    }
    $pathname = $dirname . '/' . $filename;
    if (file_exists($pathname)) {
      if (!hash_file('sha512', $tmpFile, true) != hash_file('sha512', $tmpFile, true)) {
        /* file already uploaded */
        /* TODO return data already in db */
        $st = $pdo->prepare('SELECT * FROM "fichier" WHERE "fichier_hash" = :hash');
        if ($st) {
          $st->bindParam(':hash', $filename, PDO::PARAM_STR);
          if ($st->execute()) {
            $results = $st->fetchAll();

            if (count($results) === 1) {
              $file = $results[0];
              echo json_encode(array('id' => intval($file['fichier_id']),
                                     'name' => $file['fichier_name'],
                                     'hash' => $file['fichier_hash'],
                                     'size' => intval($file['fichier_size']),
                                     'mime' => $file['fichier_mime']));
              exit(0);
            }
          }
        }
      }
      echo '{"sucess": false, "name": "", "size": 0, "type": "", "message": "Collision"}';
      unlink($tmpFile);
      exit(0);
    }

    if (!move_uploaded_file($tmpFile, $pathname)) {
      echo '{"sucess": false, "name": "", "size": 0, "type": "", "message": "Unmovable"}';
      unlink($tmpFile);
      exit(0);
    }

    $size = filesize($pathname);
    $type = mime_content_type($pathname);
    if ($type === FALSE) { $type = 'application/octet-stream'; }
    $original_name = $_FILES['upload']['name'];
    if (strlen($original_name) > 64) {
      $original_name = substr($original_name, 0, 64);
    }

    $req = 'INSERT INTO "fichier" ("fichier_name", "fichier_hash", "fichier_size", "fichier_mime")
          VALUES (:name, :hash, :size, :mime)';
    
    $st = $pdo->prepare($req);
    if ($st) {
      $pdo->beginTransaction();
      $st->bindParam(':name', $original_name, PDO::PARAM_STR);
      $st->bindParam(':hash', $filename, PDO::PARAM_STR);
      $st->bindParam(':size', $size, PDO::PARAM_INT);
      $st->bindParam(':mime', $type, PDO::PARAM_STR);
      if (!$st->execute()) {
        $pdo->rollback();
        echo '{"sucess": false, "name": "", "size": 0, "type": ""}';
        exit (0);
      }
      $lastid = $pdo->lastInsertId('fichier_id');
      $pdo->commit();
      
      echo json_encode(array('success' => true,
                             'id' => $lastid,
                             'name' => $original_name,
                             'hash' => $filename,
                             'size' => $size,
                             'mime' => $mime));
    } else {
      echo '{"sucess": false, "name": "", "size": 0, "type": "", "message": "Cannot store"}';
    }
    exit(0);
  case 'HEAD':
  case 'GET':
    if (isset($_SERVER['PATH_INFO'])) {
      $query = explode('/', $_SERVER['PATH_INFO']);
      while (empty($query[0])) { array_shift($query); }
      while (empty($query[count($query) - 1])) { array_pop($query); }
      if (count($query) === 1) {
        $query[] = 'open';
      }
      if (count($query) === 2) {
        $st = false;
        if (ctype_digit($query[0])) {
          $st = $pdo->prepare('SELECT * FROM "fichier" WHERE "fichier_id" = :id');
          if ($st) {
            $st->bindParam(':id', $query[0], PDO::PARAM_INT);
          }
        } else {
          $st = $pdo->prepare('SELECT * FROM "fichier" WHERE "fichier_hash" = :hash');
          if ($st) {
            $st->bindParam(':hash', $query[0], PDO::PARAM_STR);
          }
        }
        if ($st && $st->execute()) {
          $results = $st->fetchAll();
          if (count($results) === 1) {
            $file = $results[0];
            $filepath = getFilePath($ini_conf['files']['storage'], $file['fichier_hash']);
            if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
              header('Content-Type: ' . $file['fichier_mime']);
              header('Content-Disposition: inline; filename="' . $file['fichier_name'] . '"');
              header('Content-Length: ' . $file['fichier_size']);
            } else {
              switch ($query[1]) {
                case 'open':
                  header('Content-Length: ' . $file['fichier_size']);
                  header('Content-Type: ' . $file['fichier_mime']);
                  header('Content-Disposition: inline; filename="' . $file['fichier_name'] . '"');
                  readfile($filepath);
                  break;
                case 'download':
                  header('Content-Length: ' . $file['fichier_size']);
                  header('Content-Type: ' . $file['fichier_mime']);
                  header('Content-Disposition: attachement; filename="' . $file['fichier_name'] . '"');
                  readfile($filepath);
                  break;
                case 'metadata':
                  header('Content-Type: application/json');
                  echo json_encode(array('id' => intval($file['fichier_id']),
                                         'name' => $file['fichier_name'],
                                         'hash' => $file['fichier_hash'],
                                         'size' => intval($file['fichier_size']),
                                         'mime' => $file['fichier_mime']));
                  break;
              }
            }
            exit(0);
          }
        }
      }
    }
    http_response_code(404);
    exit(0);
  default:
    http_response_code(405);
    header('Allow: POST, HEAD, GET');
    exit(0);
}
?>
