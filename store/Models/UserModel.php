<?PHP
   class UserModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'user', 'user_id', $config);
         $this->conf('auto-increment', true);
      }
   }
?>
