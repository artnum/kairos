<?PHP

class StatusModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'status', 'status_id', []);
      $this->conf('delete', 'status_deleted');
      $this->conf('delete.ts', true);
      $this->conf('auto-increment', true);
   }

   function getCacheOpts() {
      /* 1h cache for status */
      return ['age' => 3600, 'public' => true];
   }
}

?>
