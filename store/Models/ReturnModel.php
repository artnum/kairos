<?PHP
class ReturnModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'return', 'return_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'return_modification');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'return_deleted');
      $this->conf('delete.ts', true);
   }
}
?>
