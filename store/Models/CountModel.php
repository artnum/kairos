<?PHP
class CountModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'count', 'count_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'count_modified');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'count_deleted');
      $this->conf('delete.ts', true);
      $this->conf('datetime', array('deleted', 'modified', 'created', 'date'));
   }
}
?>
