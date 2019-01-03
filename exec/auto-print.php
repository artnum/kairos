<?PHP
require_once('../lib/url.php');

if (is_file('../conf/location.ini') && is_readable('../conf/location.ini')) {
   $ini_conf = parse_ini_file('../conf/location.ini', true);
   if (!isset($ini_conf['printing']['print-command'])) {
      exit(0);
   }

   $cmd = $ini_conf['printing']['print-command'];
   if (isset($_GET['type']) && is_string($_GET['type'])) {
      if (isset($ini_conf['printing']['print-command-' + $_GET['type']])) {
         $cmd = $ini_conf['printing']['print-command-' + $_GET['type']];
      }
   }

   if (!isset($_GET['file'])) {
      exit(0);
   }
   
   $tmp = tempnam(sys_get_temp_dir(), 'auto-print-file');
   $ctx = curl_init(base_url($_GET['file']));
   if ($ctx) {
      curl_setopt($ctx, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($ctx, CURLOPT_BINARYTRANSFER, true);
      $content = curl_exec($ctx);
      curl_close($ctx);
      if ($content !== FALSE) {
         $o = file_put_contents($tmp, $content);
         if ($o !== FALSE && $o > 0) {
            $cmd = str_replace('__FILE__', escapeshellarg($tmp), $cmd);
            exec($cmd, $retstr, $retval);
            print_r($retstr);
            print_r($retval);
         }
      }
   }
}
?>
