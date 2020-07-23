<?PHP
   class UserModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'user', 'user_id', $config);
         $this->set_req('get', 'SELECT "user_id", "user_name", "user_nick", "user_phone", "user_disabled", "user_color", "user_function", "user_temporary" FROM "\\Table"');
         $this->conf('auto-increment', true);
      }
   }
?>
