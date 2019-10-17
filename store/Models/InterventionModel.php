<?PHP
class InterventionModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'intervention', 'intervention_id', $config);
    $this->conf('auto-increment', true);
    $this->conf('datetime', array('date'));
  }

  function getIntervention ($options) {
    $req = 'SELECT
              "intervention_id",
              "intervention_date",
              "intervention_duration",
              "intervention_reservation",
              "intervention_comment",
              COALESCE("user_name", "intervention_technician") AS "intervention_technician",
              "status_symbol" AS "intervention_symbol",
              "status_name" AS "intervention_name",
              "status_id" AS "intervention_status",
              "user_id" AS "intervention_technicianid"
            FROM "intervention"
            LEFT JOIN "user" ON "user_id" = IDFromURL("intervention_technician")
            LEFT JOIN "status" ON "status_id" = IDFromURL("intervention_type")';
    $req = $this->prepare_statement($req, $options);
    try {
      $st = $this->get_db(true)->prepare($req);
      if($st->execute()) {
        $entries = array();
        while(($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $entries[] = $this->unprefix($data);
        }
        return array($entries, count($entries));
      }
    } catch(\Exception $e) {
      $this->error('Database error : ' . $e->getMessage(), __LINE__, __FILE__);
      return array(NULL, 0);
    }

    return array(NULL, 0);
  }
}
?>
