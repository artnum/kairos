<?PHP

class StatusModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'status', 'status_id', $config);
      $this->conf('auto-increment', true);
   }
}

?>
