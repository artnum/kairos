<?PHP
class MachineModel extends artnum\LDAP {
  function __construct($db, $config) {
    parent::__construct($db, 'ou=Machines,ou=Catalog,o=airnace', array('description', 'cn', 'family', 'airaltref', 'type', 'state', 'floorheight', 'workheight', 'height'), $config);
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

  function processEntry ($conn, $ldapEntry, &$result) {
    $entry = parent::processEntry($conn, $ldapEntry, $result);
    if (!isset($entry['description'])) { return NULL; }
    $entry_ref = trim(strval($entry['description']));
    $entry['uid'] = $entry_ref;
    $entry['reference'] = $entry_ref;
    $entry['parent'] = '';
    $details = $this->getEntryDetails($entry_ref);
    return array_merge($entry, $details);
  }

  function _read ($id) {
    $result = new \artnum\JStore\Result();
    try {
      $conn = $this->DB->readable();
      $eId = ldap_escape($id);
      $filter = sprintf('(|(description=%s)(airaltref=%s))', $eId, $eId);
      $res = ldap_list($conn, $this->_dn(), $filter, $this->Attribute);
      if ($res && ldap_count_entries($conn, $res) === 1) {
        $entry = ldap_first_entry($conn, $res);
        $entry = $this->processEntry($conn, $entry, $result);
        if (!is_null($entry)) {
          $entry['uid'] = $id;
          $entry['reference'] = $id;
          if (!empty($entry['airaltref']) &&
              ((is_array($entry['airlatref']) && in_array($id, $entry['airaltref']) ||
               (strval($entry['airaltref']) === strval($id))))) {
            $entry['parent'] = $entry['description'];
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
      $res = ldap_list($c, $this->_dn(), $filter, $this->Attribute);
      if($res) {
        for($e = ldap_first_entry($c, $res); $e; $e = ldap_next_entry($c, $e)) {
          $entry = $this->processEntry($c, $e, $result);
          if (is_null($entry)) { continue; }
          $result->addItem($entry);
          if (isset($entry['airaltref'])) {
            $altref = $entry['airaltref'];
            if (!is_array($altref)) { $altref = array($altref); }
            foreach ($altref as $idemEntry) {
              $x = array_merge(array(), $entry);
              $x['description'] = $idemEntry;
              $x['uid'] = $idemEntry;
              $x['reference'] = $idemEntry;
              $x['parent'] = $entry['uid'];
              if (isset($x['airaltref'])) {
                if (is_array($x['airaltref'])) {
                  foreach ($x['airaltref'] as &$v) {
                    if ($v === $x['uid']) {
                      $v = $entry['uid'];
                    }
                  }
                } else {
                  $x['airaltref'] = $entry['uid'];
                }
              }
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
}
?>
