<?PHP

class EntryModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'entry', 'entry_id', $config);
      $this->conf('auto-increment', true);
   }
}

?>
