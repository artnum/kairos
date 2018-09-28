<?PHP

class ReservationModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'reservation', 'reservation_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'reservation_modification');
      $this->conf('datetime', array('created', 'deleted', 'modification', 'begin', 'end', 'deliveryBegin', 'deliveryEnd'));
   }
}
?>
