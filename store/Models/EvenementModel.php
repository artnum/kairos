<?PHP
class EvenementModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'evenement', 'evenement_id', $config);
    $this->conf('auto-increment', true);
    $this->conf('datetime', array('date'));
  }

  function getEvenement ($options) {
    $req = 'SELECT
              "evenement_id",
              "evenement_date",
              "evenement_duration",
              "evenement_reservation",
              "evenement_comment",
              COALESCE("user_name", "evenement_technician") AS "evenement_technician",
              "status_symbol" AS "evenement_symbol",
              "status_name" AS "evenement_name",
              "status_id" AS "evenement_status",
              "user_id" AS "evenement_technicianid"
            FROM "evenement"
            LEFT JOIN "user" ON "user_id" = IDFromURL("evenement_technician")
            LEFT JOIN "status" ON "status_id" = IDFromURL("evenement_type")';
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

  function getUnified ($options) {
    $req = 'SELECT
              "evenement_id",
              "evenement_technician",
              "evenement_previous",
              "evenement_reservation",
              "evenement_date",
              "evenement_type",
              "evenement_comment",
              "evenement_duration",
              COALESCE(NULLIF("evenement_target", \'\'), "reservation_target") AS "evenement_target",
              "evenement_reservation"
            FROM "evenement"
              LEFT JOIN "reservation" ON "reservation_id" =  "evenement_reservation"';

    if (isset($options['search']) && isset($options['search']['target'])) {
      $options['search']['reservation_target'] = $options['search']['target'];
      if (!isset($options['search']['_rules'])) {
        $options['search']['_rules'] = '(target OR reservation_target)';
        foreach ($options['search'] as $k => $v) {
          if ($k != '_rules' && $k != 'target' && $k != 'reservation_target') {
            $options['search']['_rules'] .= ' AND ' . $k;
          }
        }
      } else {
        $options['search']['_rules'] = str_replace('target', '(target OR reservation_target)', $options['search']['_rules']);
      }
    }
    print_r($options);
    $req = $this->prepare_statement($req, $options);
    var_dump($req);
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
