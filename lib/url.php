<?PHP
function base_url ($append = '') {
   $url = $_SERVER['REQUEST_URI'];

   $parts = explode('/', $url);
   for($url = array_shift($parts); count($parts) > 0; $url = array_shift($parts)) {
      if (!empty($url)) { break; }
   }

   $https = false;
   if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
      $https = true;
   } else if ((!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https') ||
      (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] == 'on')) {
      $https = true;
   } else if (strtolower($_SERVER['REQUEST_SCHEME']) == 'https') {
      $https = true;
   }

   $host = '';
   if (!empty($_SERVER['HTTP_X_FORWARDED_HOST'])) {
      $host = trim(end(explode(',', $_SERVER['HTTP_X_FORWARDED_HOST'])));
   } else if (!empty($_SERVER['HTTP_FORWARDED'])) {
      $forwarded = explode(',', $_SERVER['HTTP_FORWARDED']);
      foreach ($forwarede as $item) {
         list ($f, $v) = explode('=', $item);
         $f = strtolower(trim($f)); $v = trim($v);

         if ($f == 'proto' && $v == 'https') {
            $https = true;
         } else if ($f == 'host') {
            $host = $v;
         }
      }
   }

   if (empty($host)) {
      $host = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : (!empty($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : $_SERVER['SERVER_ADDR']);
   }

   $url = str_replace('//', '/', $host . '/' . $url . '/' . $append);
   if ($https) { $url = 'https://' . $url; }
   else { $url = 'http://' . $url; }

   return $url;
}

function sanitize_path ($path) {
   $path = explode('/', $path);
   $out_path = [];
   foreach($path as $p) {
      if (!empty($p)) {
         $out_path[] = $p;
      }
   }
   return implode('/', $out_path);
}

?>
