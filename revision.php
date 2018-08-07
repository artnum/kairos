<?PHP
   exec('git rev-parse --verify HEAD', $output, $retval);

   if (intval($retval) == 0) {
      echo '{ "revision": "'. $output[0]. '" }'; 
   }
?>
