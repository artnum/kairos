<?PHP
class ReservationContactModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'contacts', 'contacts_id', []);
      $this->conf('auto-increment', true);
      $this->conf('force-type', array(
         'contacts_target' => 'string',
         'contacts_comment' => 'string',
         'contacts_freeform' => 'string'
      ));
   }
}
?>
