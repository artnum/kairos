<?PHP
class CountReservationModel extends artnum\SQL {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'countReservation', 'countReservation_id', []);
    $this->conf('auto-increment', true);
    $this->set_req('get', 'SELECT * from "\\Table" LEFT JOIN "count" ON "\\Table"."countReservation_count" = "count"."count_id"');
  }
}
?>
