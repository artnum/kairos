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
  
  function read($dn) {
    $result = parent::read($dn);
    if ($result[0]) {
      $res = $result[0][0];
      if (!isset($res['description'])) { return array(NULL, 0); }
      if ($res['description']) {
        $entry_ref = strval($res['description']);
        $res['uid'] = $entry_ref;
        $res['reference'] = $entry_ref;
        $details = $this->getEntryDetails($entry_ref);
        $res = array_merge($res, $details);
      }
      $result = array(array($res), 1);
    } else {
      $dn = strval($dn);
      $filter = "(&(objectclass=*)(|(description=$dn)(airaltref=$dn)))";
      $c = $this->DB->readable();
      $res = ldap_search($c, $this->_dn(), $filter);
      if ($res && ldap_count_entries($c, $res) === 1) {
        $entry = ldap_first_entry($c, $res);
        if ($entry) {
          $_dn = ldap_get_dn($c, $entry);
          $_dn = ldap_explode_dn($_dn, 0);
          $_ber = null;
          $ret = array();
          for ($attr = ldap_first_attribute($c, $entry, $_ber);
            $attr !== FALSE;
            $attr = ldap_next_attribute($c, $entry, $_ber))
          {
            $attr = strtolower($attr);           
            $value = FALSE;
            if (in_array($attr, $this->Binary)) {
              $value = ldap_get_values_len($c, $entry, $attr);
              for ($i = 0; $i < $value['count']; $i++) {
                $value[$i] = base64_encode($value[$i]);
              }
            } else {
              $value = ldap_get_values($c, $entry, $attr);
            }
            if ($value === FALSE) { continue; }

            if ($value['count'] === 1) {
              $value = $value[0];
            } else {
              unset($value['count']);
            }
            $ret[$attr] = $value;
            if ($attr === 'description') {
              if(strval($value) === $dn) {
                $ret['IDent'] = rawurlencode($_dn[0]);
                $ret['uid'] = strval($value);
              }
              $ret['reference'] = strval($value);
            }
          }
          if (!isset($ret['IDent'])) {
            $ret['IDent'] = $dn;
            $ret['uid'] = strval($dn);
          }
          $details = $this->getEntryDetails($ret['uid']);
          $ret = array_merge($ret, $details);
          $result = array(array($ret), 1);
        }
      }
    }
    return $result;
  }

  function listing ($options) {
    $c = $this->DB->readable();
    if(isset($options['search'])) {
      $filter = $this->prepareSearch($options['search']);
    } else {
      $filter = '(objectclass=*)';
    }
    $res = ldap_list($c, $this->_dn(), $filter, array('dn'));
    $ret = array();
    if($res) {
      for($e = ldap_first_entry($c, $res); $e; $e = ldap_next_entry($c, $e)) {
        $dn = ldap_get_dn($c, $e);
        $dn = ldap_explode_dn($dn, 0);
        $r = $this->read(rawurlencode($dn[0]));
        if ($r[1] == 1) {
          $entry = $r[0][0];
          $ret[] = $entry;
          if (isset($entry['airaltref'])) {
            if (!is_array($entry['airaltref'])) {
              $entry['airaltref'] = array($entry['airaltref']);
            }
            foreach ($entry['airaltref'] as $idemEntry) {
              $idem = $this->read($idemEntry);
              if ($idem[1] === 1) {
                $ret[] = $idem[0][0];
              }
            }
          }
        }
      }
    }
    return array($ret, count($ret));  
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
