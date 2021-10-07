<?PHP
class EvenementModel extends artnum\SQL {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'evenement', 'evenement_id', []);
    $this->conf('auto-increment', true);
    $this->conf('datetime', ['date']);
  }

  function mapMachineId ($id) {
    $oldid = null;
    $newid = null;
    $conn = $this->LDAP->readable();
    $filter = sprintf('(|(description=%s)(airref=%s))', $id, $id);
    $res = ldap_list($conn, $this->kconf->get('trees.machines'), $filter, ['description', 'airref']);

    /* handle altref : they don't have proper existence, so they can map to themselves only */
    if (!$res) { return [[$id], $id]; }
    if (ldap_count_entries($conn, $res) <= 0) { return [[$id], $id]; }
    
    $ids = [];
    for ($entry = ldap_first_entry($conn, $res); $entry; $entry = ldap_next_entry($conn, $entry)) {
      for ($attr = ldap_first_attribute($conn, $entry); $attr; $attr = ldap_next_attribute($conn, $entry)) {
        $attr = strtolower($attr);
        switch ($attr) {
          case 'description':
          case 'airref':
            $values = ldap_get_values($conn, $entry, $attr);
            if ($values['count'] > 0) {
              unset($values['count']);
              $ids = array_merge($ids, $values);
              /* main id is id 0 of airref or description */
              if ($attr === 'airref') {
                $newid = $values[0];
              } else {
                $oldid = $values[0];
              }
            }
            break;
        }
      }
    }
    return [$ids, $newid === null ? $oldid : $newid];
  }

  function getEvenement ($options) {
    $results = new \artnum\JStore\Result();
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
        while(($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $entry = $this->unprefix($data);
          $results->addItem($entry);
        }
      }
    } catch(\Exception $e) {
      $results->addError($e->getMessage(), $e);
    }

    return $results;
  }

  function getChain ($options) {
    $results = new \artnum\JStore\Result();
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
      LEFT JOIN "reservation" ON "evenement_reservation" = "reservation_id"';

    $st = null;
    if (!empty($options['machine'])) {
      $ids = $this->mapMachineId($options['machine']);
      $in = str_repeat('?,', count($ids[0]) -1) . '?';
      $st = $this->get_db(true)->prepare($req . ' WHERE "reservation_target" IN (' . $in . ') OR "evenement_target" IN (' . $in . ') AND "reservation_deleted" IS NULL');
      foreach ($ids[0] as $k => $id) {
        $st->bindValue($k + 1, $id, PDO::PARAM_STR);
        $st->bindValue($k + count($ids[0]) + 1, $id, PDO::PARAM_STR);
      }
    } else if (!empty($options['reservation'])) {
      $st = $this->get_db(true)->prepare($req . ' WHERE "evenement_reservation" = :id AND "reservation_deleted" IS NULL');
      $st->bindParam(':id', $options['reservation'], PDO::PARAM_STR);
    } else {
      return $results;
    }

    try {
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
        foreach ($root as $entry) {
          $results->addItem($entry);
        }
      }
    } catch (\Exception $e) {
      $results->addError($e->getMessage(), $e);
    }
    return $results;
  }

  function getMachineState ($options) {
    $results = new \artnum\JStore\Result();
    $req = 'SELECT "evenement".*, COALESCE(NULLIF("evenement_target", \'\'), "reservation_target") 
        AS "evenement_resolvedTarget", "status_severity" AS "evenement_severity"
          FROM "evenement" LEFT JOIN "status" ON "status_id" = idFromURL("evenement_type")
          LEFT JOIN "reservation" ON "reservation_id" = "evenement_reservation"
          WHERE "evenement_id" NOT IN (SELECT "evenement_previous" FROM "evenement" WHERE "evenement_previous" IS NOT NULL)
          AND "reservation"."reservation_deleted" IS NULL;';
    try {
      $Maps = [];
      $st = $this->get_db(true)->prepare($req);
      if($st->execute()) {
        $entries = [];
        while(($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $entry = $this->unprefix($data);
          if (empty($entry['resolvedTarget'])) { continue; }
          if (!isset($Maps[$entry['resolvedTarget']])) {
            $ids = $this->mapMachineId($entry['resolvedTarget']);
            foreach ($ids[0] as $id) {
              $Maps[$id] = $ids[1];
            }
          }
          if (!isset($Maps[$entry['resolvedTarget']])) { continue; }
          $entry['resolvedTarget'] = $Maps[$entry['resolvedTarget']];
          if (!isset($entries[$entry['resolvedTarget']])) {
            $entries[$entry['resolvedTarget']] = $entry;
          } else {
            if ($entries[$entry['resolvedTarget']]['severity'] < $entry['severity']) {
              $entries[$entry['resolvedTarget']] = $entry;
            }
          }
        }
        foreach ($entries as $entry) {
          $results->addItem($entry);
        }
      }
    } catch(\Exception $e) {
      $results->addError($e->getMessage(), $e);
    }
  
    return $results;
  }

  function getUnified ($options) {
    $results = new \artnum\JStore\Result();
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
      $Maps = [];
      if($st->execute()) {
        $entries = array();
        while(($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $entry = $this->unprefix($data);
          if (empty($entry['resolvedTarget'])) { continue; }
          if (!isset($Maps[$entry['resolvedTarget']])) {
            $ids = $this->mapMachineId($entry['resolvedTarget']);
            foreach ($ids[0] as $id) {
              $Maps[$id] = $ids[1];
            }
          }
          $entry['resolvedTarget'] = $Maps[$entry['resolvedTarget']];
          $results->addItem($entry);
        }
      }
    } catch(\Exception $e) {
      $results->addError($e->getMessage(), $e);
    }

    return $results;
  }

  function dbtype() {
    return array('sql', 'ldap');
  }

  function get_db($none = true) {
    return $this->SQL;
  }

  function set_db($dbs) {
    if (!isset($dbs['sql']) || !isset($dbs['ldap'])) {
      throw new Exception('Database not configured');
    }
    $this->LDAP = $dbs['ldap'];
    $this->SQL = $dbs['sql'];
  }

  function _write($data, $id = NULL) {
     global $MSGSrv;
     $result = parent::_write($data, $id);
     $item = $result->getItem(0);
     if ($item !== null) {
        $MSGSrv->send(json_encode([
           'operation' => 'write',
           'type' => 'evenement',
           'id' => $item['id'],
           'cid' => $this->kconf->getVar('clientid')
          ]));
     }
     return $result;
  }

  function _delete($id) {
     global $MSGSrv;
      $result = parent::_delete($id);
      $item = $result->getItem(0);
      if ($item !== null) {
        $MSGSrv->send(json_encode([
          'operation' => 'delete',
          'type' => 'evenement',
          'id' => array_keys($item)[0],
          'cid' => $this->kconf->getVar('clientid')
         ]));
      }
      return $result;
  }
}
?>
