<?PHP
   header('Cache-Control: no-cache; max-age=0')  
   exec('git rev-parse --verify HEAD', $output, $retval);

   if (intval($retval) == 0) {
      echo '{ "revision": "'. $output[0]. '" }'; 
   }
?>
