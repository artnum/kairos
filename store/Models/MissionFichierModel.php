<?PHP
class MissionFichierModel extends artnum\SQL {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'missionFichier', 'missionFichier_fichier', []);
  }

  function _read ($id) {
    $retVal = new \artnum\JStore\Result();
    $id = explode(',', $id);
    if (count($id) !== 2) {
      $retVal->addError('Not an ID');
    } else {
      $fichier = strtolower(trim($id[0]));
      $mission = trim($id[1]);
      if (!ctype_alnum($fichier) && !ctype_digit($mission)) {
        $retVal->addError('Not an ID');
      } else {
        $db = $this->get_db(true);
        $st = $db->prepare('SELECT * FROM "missionFichier" WHERE "missionFichier_mission" = :mission AND "missionFichier_fichier" = :fichier');
        if (!$st) {
          $retVal->addError($db->errorInfo()[2], $db->errorInfo());
        } else {
          $st->bindParam(':mission', $mission, \PDO::PARAM_INT);
          $st->bindParam(':fichier', $fichier, \PDO::PARAM_STR);
          if (!$st->execute()) {
            $retVal->addError($st->errorInfo()[2], $st->errorInfo());
          } else {
            $datalist = array();
            while (($data = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
              $entry = $this->unprefix($data);
              $entry['uid'] = "$entry[fichier],$entry[mission]";
              $datalist[] = $entry;
            }
            if (count($datalist) === 1) {
              $retVal->setItems($datalist[0]);
              $retVal->setCount(1);
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
              $retVal->setItems($entry);
              $retVal->setCount(1);
            }
          }
        }
      }
    }

    return $retVal;
  }

  function listing ($options) {
    $retVal = new \artnum\JStore\Result();
    if (isset($options['search']) && isset($options['search']['fichier'])) {
      return $this->read($options['search']['fichier']);
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

    try {
      $db = $this->get_db(true);
      $st = $db->prepare('SELECT * FROM "missionFichier" ' . $where_clause);
      if (!$st->execute()) {
        $retVal->addError($st->errorInfo()[2], $st->errorInfo());
      } else {
        while (($row = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $outVal = $this->unprefix($row);
          $outVal = $this->_postprocess($outVal);
          $outVal['uid'] = "$outVal[fichier],$outVal[mission]";
          $retVal->addItem($outVal);
        } 
      }
    } catch (Exception $e) {
      $retVal->addError($e->getMessage(), $e);
    }

    return $retVal;
  }
  
  function _delete ($id) {
    $retVal = new \artnum\JStore\Result();
    $id = explode(',', $id);
    if (count($id) !== 2) { return FALSE; }
    $fichier = strtolower(trim($id[0]));
    $mission = trim($id[1]);
    if (!ctype_alnum($fichier) && !ctype_digit($mission)) { return FALSE; }

    $db = $this->get_db(false);
    $st = $db->prepare('DELETE FROM "missionFichier" WHERE "missionFichier_mission" = :mission AND "missionFichier_fichier" = :fichier');
    if (!$st) {
      $retVal->addError($db->errorInfo()[2], $db->errorInfo());
    } else {
      $st->bindParam(':mission', $mission, \PDO::PARAM_INT);
      $st->bindParam(':fichier', $fichier, \PDO::PARAM_STR); 
      if (!$st->execute()) {
        $retVal->addError($st->errorInfo()[2], $st->errorInfo());
      }
    }
    return $retVal;
  }

  function _overwrite ($data, $id = NULL) {
    return $this->write($data, $id);
  }
  
  function _write ($data, $id = NULL) {
    $retVal = new \artnum\JStore\Result();
    try {
      $db = $this->get_db(false);
      if (is_null($id)) {
        $st = $db->prepare('INSERT IGNORE INTO "missionFichier" ("missionFichier_fichier", "missionFichier_mission", "missionFichier_ordre") VALUES (:fichier, :mission, :ordre)');
        if (!$st) {
          $retVal->addError($db->errorInfo()[2], $db->errorInfo());
        } else {
          $st->bindParam(':mission', $data['mission'], \PDO::PARAM_INT);
          $st->bindParam(':fichier', $data['fichier'], \PDO::PARAM_STR);
          $st->bindParam(':ordre', $data['ordre'], \PDO::PARAM_INT);
          if (!$st->execute()) {
            $retVal->addError($st->errorInfo()[2], $st->errorInfo());
          } else {
            $retVal->addItem(array('id' => "$data[fichier],$data[mission]"));
          }
        }
      } else {
        $id = explode(',', $id);
        if (count($id) !== 2) { return $falseRet; }
        $fichier = strtolower(trim($id[0]));
        $mission = trim($id[1]);
        if (!ctype_alnum($fichier) && !ctype_digit($mission)) { return $falseRet; }

        $st = $db->prepare('UPDATE "missionFichier" SET "missionFichier_ordre" = :ordre WHERE "missionFichier_mission" = :mission AND "missionFichier_fichier" = :fichier');
        if (!$st) {
          $retVal->addError($db->errorInfo()[2], $db->errorInfo());
        } else {
          $st->bindParam(':mission', $mission, \PDO::PARAM_INT);
          $st->bindParam(':fichier', $fichier, \PDO::PARAM_STR);
          $st->bindParam(':ordre', $data['ordre'], \PDO::PARAM_STR);
          if (!$st->execute()) {
            $retVal->addError($st->errorInfo()[2], $st->errorInfo());
          } else {
            $retVal->addItem(array('id' => "$fichier,$mission"));
          }
        }
      }
    } catch (Exception $e) {
      $retVal->addError($e->getMessage(), $e);
    }
    return $retVal;
  }
}
?>
