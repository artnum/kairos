<?PHP
class CountReservationModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'countReservation', 'countReservation_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
