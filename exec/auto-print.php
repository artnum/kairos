<?PHP
require_once('../lib/url.php');

if (is_file('../conf/print.ini') && is_readable('../conf/print.ini')) {
   $ini_conf = parse_ini_file('../conf/print.ini', true);
   if (!isset($ini_conf['print-command'])) {
      exit(0);
   }

   $cmd = $ini_conf['print-command'];
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
