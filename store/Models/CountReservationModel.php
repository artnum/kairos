<?PHP
class CountReservationModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'countReservation', 'countReservation_id', $config);
    $this->conf('auto-increment', true);
    $this->set_req('get', 'SELECT * from "\\Table" LEFT JOIN "count" ON "\\Table"."countReservation_count" = "count"."count_id" WHERE "\\IDName" = :id');
  }
}
?>
