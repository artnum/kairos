<?PHP
class EvenementModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'evenement', 'evenement_id', $config);
    $this->conf('auto-increment', true);
    $this->conf('datetime', array('date'));
  }

  function getEvenement ($options) {
    $result = new \artnum\JStore\Result();
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

  function getChain ($options) {
    $result = new \artnum\JStore\Result();
    $req = 'SELECT
        "evenement_id",
        "evenement_date",
        "evenement_duration",
        "evenement_reservation",
        "evenement_comment",
        "evenement_type",
        COALESCE("user_name", "evenement_technician") AS "evenement_technician",
        "status_symbol" AS "evenement_symbol",
        "status_name" AS "evenement_name",
        "status_id" AS "evenement_status",
        "user_id" AS "evenement_technicianid",
        "status_severity" AS "evenement_severity",
        "evenement_previous"
      FROM "evenement"
      LEFT JOIN "user" ON "user_id" = IDFromURL("evenement_technician")
      LEFT JOIN "status" ON "status_id" = IDFromURL("evenement_type")
      LEFT JOIN "reservation" ON "evenement_reservation" = "reservation_id"
      WHERE "reservation_target" = :target OR "evenement_target" = :target
        AND "reservation_deleted" IS NULL';

    if (empty($options['machine'])) {
      return $result;
    }

    try {
      $st = $this->get_db(true)->prepare($req);
      $st->bindParam(':target', $options['machine'], PDO::PARAM_STR);
      if($st->execute()) {
        $entries = array();
        while(($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $entries[] = $this->unprefix($data);
        }
        $root = [];
        $tmp = [];

        do {
          $moves = false;
          while (count($entries) > 0) {
            $entry = array_pop($entries);
            if ($entry['previous'] === NULL) {
              $root[$entry['id']] = $entry;
              $moves = true;
            } else {
              if (!isset($root[$entry['previous']])) {
                array_push($tmp, $entry);
              } else {
                $prev = $entry['previous'];
                $entry['previous'] = $root[$prev];
                unset($root[$prev]);
                $root[$entry['id']] = $entry;
                $moves = true;
              }
            }
          }
          $entries = $tmp;
        } while($moves);

        foreach ($root as $k => $v) {
          if (intval($v['severity']) < 1000) {
            unset($root[$k]);
          }
        }

        return array(array_values($root), count($root));
      }
    } catch (\Exception $e) {
      $this->error('Database error : ' . $e->getMessage(), __LINE__, __FILE__);
      return array(NULL, 0);
    }
    return array(NULL, 0);
  }

  function getMachineState ($options) {
    $req = 'SELECT "evenement".*, COALESCE(NULLIF("evenement_target", \'\'), "reservation_target") 
        AS "evenement_resolvedTarget", "status_severity" AS "evenement_severity"
          FROM "evenement" LEFT JOIN "status" ON "status_id" = idFromURL("evenement_type")
          LEFT JOIN "reservation" ON "reservation_id" = "evenement_reservation"
          WHERE "evenement_id" NOT IN (SELECT "evenement_previous" FROM "evenement" WHERE "evenement_previous" IS NOT NULL)
          AND "reservation"."reservation_deleted" IS NULL;';
    try {
      $st = $this->get_db(true)->prepare($req);
      if($st->execute()) {
        $entries = array();
        while(($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $entry = $this->unprefix($data);
          if (!isset($entries[$entry['resolvedTarget']])) {
            $entries[$entry['resolvedTarget']] = $entry;
          } else {
            if ($entries[$entry['resolvedTarget']]['severity'] < $entry['severity']) {
              $entries[$entry['resolvedTarget']] = $entry;
            }
          }
        }
        return array(array_values($entries), count($entries));
      }
    } catch(\Exception $e) {
      $this->error('Database error : ' . $e->getMessage(), __LINE__, __FILE__);
      return array(NULL, 0);
    }
  
    return array(NULL, 0);
  }

  function getUnified ($options) {
    $req = 'SELECT
              "evenement".*,
              COALESCE(NULLIF("evenement_target", \'\'), "reservation_target") AS "evenement_resolvedTarget",
              "status_severity" AS evenement_severity
            FROM "evenement"
              LEFT JOIN "status" ON "status_id" = idFromURL("evenement_type")
              LEFT JOIN "reservation" ON "reservation_id" =  "evenement_reservation"';

    if (isset($options['search'])) {
      $with_severity = false;
      if (isset($options['search']['severity'])) {
        $options['search']['status_severity'] = $options['search']['severity'];
        unset($options['search']['severity']);
        $with_severity = true;
      }

      if(isset($options['search']['target'])) {
        $options['search']['reservation_target'] = $options['search']['target'];
        if (!isset($options['search']['_rules'])) {
          $options['search']['_rules'] = '(target OR reservation_target)';
          foreach ($options['search'] as $k => $v) {
            if ($k != '_rules' && $k != 'target' && $k != 'reservation_target') {
              $options['search']['_rules'] .= ' AND ' . $k;
            }
          }
        } else {
          if ($with_severity) {
            $options['search']['_rules'] = str_replace('target', '(target OR reservation_target) AND status_severity', $options['search']['_rules']);
          } else {
            $options['search']['_rules'] = str_replace('target', '(target OR reservation_target)', $options['search']['_rules']);
          }
        }
      }
    }
    $req = $this->prepare_statement($req, $options);
    $parts = explode(' WHERE ', $req);
    if (empty($parts[1])) {
      $parts[1] = '"evenement_id" NOT IN (SELECT "evenement_previous" FROM "evenement" WHERE "evenement_previous" IS NOT NULL) AND "reservation"."reservation_deleted" IS NULL';
    } else {
      $parts[1] = '"evenement_id" NOT IN (SELECT "evenement_previous" FROM "evenement" WHERE "evenement_previous" IS NOT NULL) AND "reservation"."reservation_deleted" IS NULL AND ' . $parts[1];
    }
    $req = join(' WHERE ', $parts);
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
