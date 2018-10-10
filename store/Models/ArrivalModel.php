<?PHP
class ArrivalModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'arrival', 'arrival_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'arrival_modification');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'arrival_deleted');
      $this->conf('delete.ts', true); 
      $this->conf('create', 'arrival_created');
      $this->conf('create.ts', true); 
      $this->conf('datetime', array('reported', 'inprogress', 'done'));
   }
}
?>
