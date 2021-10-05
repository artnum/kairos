<?PHP
require_once('../lib/url.php');

if (is_file('../conf/location.ini') && is_readable('../conf/location.ini')) {
   $ini_conf = parse_ini_file('../conf/location.ini', true);
   if (!isset($ini_conf['printing']['print-command'])) {
      $result = array('success' => false, 'message' => 'Pas d\'impression disponible', 'type' => 'results', 'data' => NULL, 'length' => 0);
      echo json_encode($result);
      exit(0);
   }

   if (!isset($_GET['file'])) {
      $result = array('success' => false, 'message' => 'Pas de document spécifié', 'type' => 'results', 'data' => NULL, 'length' => 0);
      echo json_encode($result);
      exit(0);
   }

   $cmd = $ini_conf['printing']['print-command'];
   if (isset($_GET['type']) && is_string($_GET['type'])) {
      if (isset($ini_conf['printing']['print-command-' . $_GET['type']])) {
         $cmd = $ini_conf['printing']['print-command-' . $_GET['type']];
      }
   }

   $result = array('success' => true, 'message' => '', 'type' => 'results');
   $tmp = tempnam(sys_get_temp_dir(), 'auto-print-file');
   if ($_GET['file'] !== $_GET['type']) {
      $ctx = curl_init(base_url($_GET['file']) . '?forceType=' . $_GET['type']);
   } else {
      $ctx = curl_init(base_url($_GET['file']));
   }
   if ($ctx) {
      curl_setopt($ctx, CURLOPT_RETURNTRANSFER, true);
      $content = curl_exec($ctx);
      curl_close($ctx);
      if ($content !== FALSE) {
         $o = file_put_contents($tmp, $content);
         if ($o !== FALSE && $o > 0) {
            $cmd = str_replace('__FILE__', escapeshellarg($tmp), $cmd);
            exec($cmd, $retstr, $retval);
            if ($retval != 0) {
               $result['success'] = false;
               $result['data'] = NULL;
               $result['length'] = 0;
               $result['message'] = 'Impression échouée';
            } else {
               $result['data'] = $retstr;
               $result['length'] = count($retstr);
            }
         } else {
            $result = array('success' => false, 'message' => '', 'type' => 'results', 'data' => NULL, 'length' => 0);
         }
      } else {
         $result = array('success' => false, 'message' => '', 'type' => 'results', 'data' => NULL, 'length' => 0);
      }
   } else {
      $result = array('success' => false, 'message' => '', 'type' => 'results', 'data' => NULL, 'length' => 0);
   }
   unlink($tmp);
   echo json_encode($result);
}
?>
