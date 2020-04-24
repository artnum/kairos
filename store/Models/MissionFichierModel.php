<?PHP
class MissionFichierModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'missionFichier', 'missionFichier_fichier', $config);
  }

  function get ($id) {
    $id = explode(',', $id);
    if (count($id) !== 2) { return NULL; }

    $fichier = strtolower(trim($id[0]));
    $mission = trim($id[1]);
    if (!ctype_alnum($fichier) && !ctype_digit($mission)) { return NULL; }
    
    $st = $this->get_db(true)->prepare('SELECT * FROM "missionFichier" WHERE "missionFichier_mission" = :mission AND "missionFichier_fichier" = :fichier');
    if (!$st) { return NULL; }
    
    $st->bindParam(':mission', $mission, \PDO::PARAM_INT);
    $st->bindParam(':fichier', $fichier, \PDO::PARAM_STR);
    if ($st->execute()) {
      $datalist = array();
      while (($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
        $entry = $this->unprefix($data);
        $entry['uid'] = "$entry[fichier],$entry[mission]";
        $datalist[] = $entry;
      }
      if (count($datalist) === 1) {
        return $datalist[0];
      } else if (count($datalist) > 1) {
        $entry = array();
        foreach ($datalist as $d) {
          foreach ($d as $k => $v) {
            isset($entry[$k]) ? $entry[$k][] = $v : $entry[$k] = array($v);
          }
        }
        foreach ($entry as $k => $v) {
          $v = $this->_remove_same_value($entry[$k]);
          count($v) === 1 ? $entry[$k] = $v[0] : $entry[$k] = $v;
        }
        return $entry;
      }
    }

    return NULL;
  }

  function listing ($options) {
    $result = new \artnum\JStore\Result();
    if (isset($options['search']) && isset($options['search']['fichier'])) {
      $r = $this->get($options['search']['fichier']);
      if ($r !== NULL) {
        $result->addItem($r);
        return $result;
      }
    }
    $where_clause = '';
    if (isset($options['search']) && !empty($options['search'])) {
      $where_clause .= $this->prepareSearch($options['search']);
    }
    if (isset($options['sort']) && !empty($options['sort'])) {
      $where_clause .= $this->prepareSort($options['sort']);
    }
    if (isset($options['limit']) && !empty($options['limit'])) {
      $where_clause .= $this->prepareLimit($options['limit']);
    }

    $st = $this->get_db(true)->prepare('SELECT * FROM "missionFichier" ' . $where_clause);
    if ($st->execute()) {
      $retVal = array();
      while (($row = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
        $outVal = $this->unprefix($row);
        $outVal = $this->_postprocess($outVal);
        $outVal['uid'] = "$outVal[fichier],$outVal[mission]";
        $result->addItem($outVal);
      }
    }

    return $result;
  }
  
  function _delete ($id) {
    $result = new \artnum\JStore\Result();
    $id = explode(',', $id);
    if (count($id) !== 2) { 
      $result->addItem([false]);
      return $result; 
    }
    $fichier = strtolower(trim($id[0]));
    $mission = trim($id[1]);
    if (!ctype_alnum($fichier) && !ctype_digit($mission)) { 
      $result->addItem([$mission => false]);
      return $result;
    }

    $st = $this->get_db(false)->prepare('DELETE FROM "missionFichier" WHERE "missionFichier_mission" = :mission AND "missionFichier_fichier" = :fichier');
    if ($st) {
      $st->bindParam(':mission', $mission, \PDO::PARAM_INT);
      $st->bindParam(':fichier', $fichier, \PDO::PARAM_STR); 
      try {
        $result->addItem([$mission => $st->execute()]);

      } catch (\Exception $e) {
        $result->addItem([$mission => false]);
      }
    }
    return $result;
  }

  function _overwrite ($data, $id = NULL) {

    return $this->write($data, $id);
  }
  
  function _write ($data, $id = NULL) {
    $result = new \artnum\JStore\Result();
    try {
      if (is_null($id)) {
        $st = $this->get_db(false)->prepare('INSERT IGNORE INTO "missionFichier" ("missionFichier_fichier", "missionFichier_mission", "missionFichier_ordre") VALUES (:fichier, :mission, :ordre)');
        if ($st) {
          $st->bindParam(':mission', $data['mission'], \PDO::PARAM_INT);
          $st->bindParam(':fichier', $data['fichier'], \PDO::PARAM_STR);
          $st->bindParam(':ordre', $data['ordre'], \PDO::PARAM_INT);
          if ($st->execute()) {
            $result->addItem(['id' => "$data[fichier],$data[mission]"]);
          }
        }
      } else {
        $id = explode(',', $id);
        if (count($id) === 2) {
          $fichier = strtolower(trim($id[0]));
          $mission = trim($id[1]);
          if (ctype_alnum($fichier) && ctype_digit($mission)) {

            $st = $this->get_db(false)->prepare('UPDATE "missionFichier" SET "missionFichier_ordre" = :ordre WHERE "missionFichier_mission" = :mission AND "missionFichier_fichier" = :fichier');
            if (!$st) { return $falseRet; }
              $st->bindParam(':mission', $mission, \PDO::PARAM_INT);
              $st->bindParam(':fichier', $fichier, \PDO::PARAM_STR);
              $st->bindParam(':ordre', $data['ordre'], \PDO::PARAM_STR);
              if ($st->execute()) {
                $result->addItem(['id' => "$fichier,$mission"]);
              }
          }
        }
      }
    } catch (Exception $e) {
      error_log($e->getMessage());
    }
    return $result;
  }
}
?>
