<?PHP
class MachineModel extends artnum\LDAP {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct(
      $db,
      $this->kconf->get('trees.machines'),
      null, // all attribute
      []);
  }

  function getEntryDetails ($ref) {
    $ret = array();
    try {
      $stmt = $this->SQL->prepare('SELECT * FROM "entry" WHERE "entry_ref" = :ref');
      $stmt->bindParam(':ref', $ref, \PDO::PARAM_STR);
      if ($stmt->execute()) {
        while (($data = $stmt->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $ret[$data['entry_name']] = array(
            'value' => $data['entry_value'], 'id' => $data['entry_id']
          );
        }
      }
    } catch(\Exception $e) {
    }
    return $ret;
  }

  function processEntry ($conn, $ldapEntry, &$result, $idQuery = null) {
    $entry = parent::processEntry($conn, $ldapEntry, $result);
    /* either a reference (new numbering) or a description (old numbering) */
    if (empty($entry['description']) && empty($entry['airref'])) { return NULL; }
  
    $idOld = !empty($entry['description']) ? trim(strval($entry['description'])) : '';
    $idNew = !empty($entry['airref']) ? trim(strval($entry['airref'])) : '';
    $entry_ref = !empty($idNew) ? $idNew : $idOld;
    $entry['description'] = $entry_ref;
    $entry['uid'] = $entry_ref;
    $entry['airref'] = $entry_ref;
    $entry['parent'] = '';
    $details = $this->getEntryDetails($entry_ref);
    if (!empty($idOld)) {
      $entry['oldid'] = $idOld;
      $details = array_merge($details, $this->getEntryDetails($idOld));
    }
    return array_merge($entry, $details);
  }

  function _read ($id) {
    $result = new \artnum\JStore\Result();
    try {
      $conn = $this->DB->readable();
      $eId = ldap_escape($id);
      $filter = sprintf('(|(description=%s)(airaltref=%s)(airref=%s))', $eId, $eId, $eId);
      $res = ldap_list($conn, $this->_dn(), $filter, $this->Attribute ?? [ '*' ]);
      if ($res && ldap_count_entries($conn, $res) === 1) {
        $entry = ldap_first_entry($conn, $res);
        $entry = $this->processEntry($conn, $entry, $result, $id);
        if (!is_null($entry)) {
          if (!empty($entry['airaltref'])) {
            if (is_array($entry['airaltref']) && in_array($id, $entry['airaltref'])) {
              unset($entry['airaltref']);
              $entry['uid'] = $id;
              $entry['parent'] = $entry['description'];
              $entry['description'] = $entry['uid'];
              $entry['airref'] = $entry['uid'];
              $entry['oldid'] = $entry['uid'];
            } else if (!is_array($entry['airaltref']) && strval($entry['airaltref']) === strval($id)) {
              unset($entry['airaltref']);
              $entry['uid'] = $id;
              $entry['parent'] = $entry['description'];
              $entry['description'] = $entry['uid'];
              $entry['airref'] = $entry['uid'];
              $entry['oldid'] = $entry['uid'];
            }
          }
          $result->setItems($entry);
          $result->setCount(1);
        }
      } else {
        $result->addError('Multiple entry returned');
      }
    } catch (Exception $e) {
      $result->addError($e->getMessage(), $e);
    }

    return $result;
  }
  
  function listing ($options) {
    $result = new \artnum\JStore\Result();
    try {
      $c = $this->DB->readable();
      if(isset($options['search'])) {
        $filter = $this->prepareSearch($options['search']);
      } else {
        $filter = '(objectclass=*)';
      }
      $res = ldap_list($c, $this->_dn(), $filter, $this->Attribute ?? [ '*' ]);
      if($res) {
        for($e = ldap_first_entry($c, $res); $e; $e = ldap_next_entry($c, $e)) {
          $entry = $this->processEntry($c, $e, $result);
          if (is_null($entry)) { continue; }
          $result->addItem($entry);
          if (isset($entry['airaltref'])) {
            $altref = $entry['airaltref'];
            if (!is_array($altref)) { $altref = [$altref]; }
            foreach ($altref as $idemEntry) {
              $x = array_merge([], $entry);
              unset($entry['airaltref']);
              $x['description'] = $idemEntry;
              $x['uid'] = $idemEntry;
              $x['reference'] = $idemEntry;
              $x['airref'] = $idemEntry;
              $x['oldid'] = $idemEntry;
              $x['parent'] = $entry['uid'];
              $details = $this->getEntryDetails($x['uid']);
              if ($details) {
                $x = array_merge($x, $details);
              }
              $result->addItem($x);
            }
          }
        }
      }
    } catch (Exception $e) {
      $result->addError($e->getMessage(), $e);
    }

    return $result;
  }
  
  function set_db($dbs) {
    if (!isset($dbs['sql']) || !isset($dbs['ldap'])) {
      throw new Exception('Database not configured');
    }
    $this->DB = $dbs['ldap'];
    $this->SQL = $dbs['sql'];
  }

  function dbtype() {
    return array('sql', 'ldap');
  }

  function getCacheOpts() {
    /* 15min cache for machine */
    return ['age' => 900, 'public' => true];
  }
}
?>
