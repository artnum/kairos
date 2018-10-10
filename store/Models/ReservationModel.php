<?PHP

class ReservationModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'reservation', 'reservation_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('create', 'reservation_created');
      $this->conf('create.ts', true);
      $this->conf('mtime', 'reservation_modification');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'reservation_deleted');
      $this->conf('delete.ts', true);
      $this->conf('datetime', array('begin', 'end', 'deliveryBegin', 'deliveryEnd'));
   }
}
?>
