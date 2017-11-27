<?PHP
class ReservationContactModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'contacts', 'contacts_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
