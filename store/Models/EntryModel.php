<?PHP

class EntryModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'entry', 'entry_id', []);
      $this->conf('auto-increment', true);
   }
}

?>
