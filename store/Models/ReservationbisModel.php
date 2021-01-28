<?PHP
class ReservationbisModel extends artnum\SQL {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'reservation', 'reservation_id', []);
    $this->conf('auto-increment', true);
    $this->conf('create', 'reservation_created');
    $this->conf('create.ts', true);
    $this->conf('mtime', 'reservation_modification');
    $this->conf('mtime.ts', true);
    $this->conf('delete', 'reservation_deleted');
    $this->conf('delete.ts', true);
    $this->conf('datetime', array('begin', 'end', 'deliveryBegin', 'deliveryEnd'));
    $this->conf('force-type', array(
      'reservation_reference' => 'string',
      'reservation_title' => 'string',
      'reservation_comment' => 'string',
      'reservation_note' => 'string',
      'reservation_folder' => 'string',
      'reservation_gps' => 'string',
      'reservation_equipment' => 'string',
      'reservation_locality' => 'string',
      'reservation_address' => 'string'
    ));
    $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "countReservation" ON "reservation"."reservation_id" = "countReservation"."countReservation_reservation"');
  }
}
?>
