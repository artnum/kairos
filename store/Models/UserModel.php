<?PHP
   class UserModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'user', 'user_id', []);
         $this->set_req('get', 'SELECT "user_id", "user_name", "user_nick", "user_phone", "user_disabled", "user_color", "user_function", "user_temporary" FROM "\\Table"');
         $this->conf('auto-increment', true);
      }
   
      function _read ($id) {
         if ($id === '__SYSTEM') {
            $result = new \artnum\JStore\Result();
            $result->addItem([
               'id' => '__SYSTEM',
               'name' => 'Système',
               'nick' => 'Système',
               'phone' => '',
               'disabled' => '0',
               'color' => 'black',
               'function' => 'admin',
               'temporary' => '0'
            ]);
            return $result;
         } else {
            return parent::_read($id);
         }
      }

      function getCacheOpts() {
         /* 15min cache for user */
         return ['age' => 900, 'public' => true];
      }
   }
?>
