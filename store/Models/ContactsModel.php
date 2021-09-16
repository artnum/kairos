<?php
class ContactsModel extends artnum\LDAP {
  function __construct($db, $config)  {
    $this->local = false;
    $this->kconf = $config;
    parent::__construct(
      $db,
      $this->kconf->get('trees.contacts'),
      [
        'objectclass',
        'givenname',
        'sn',
        'displayname',
        'mail',
        'telephonenumber',
        'o',
        'mobile',
        'l',
        'st',
        'postalcode',
        'c',
        'postaladdress',
        'uid',
        'seealso',
        'labeleduri'
      ],
      []
    );
    $this->conf('rdnAttr', 'uid');
    $this->conf('objectclass', function (&$entry) {
      $defaultClass = [
        'inetOrgPerson',
        'iroAdditionalUserInfo',
        'contactPerson'
      ];
      if (!empty($entry['type'])) {
        if ($entry['type'] !== 'person') {
          $defaultClass = [
            'organization',
            'iroOrganizationExtended',
            'contactPerson'
          ];
        }
        unset ($entry['type']);
      }
      return $defaultClass;
    });
  }

  function getBase () {
    if ($this->local) {
      $base = $this->kconf->get('trees.local-contact');
      if ($base) {
        return $base;
      }
    }
    if ($this->base) {
      return $this->base;
    } else {
      if ($this->DB) {
        return $this->DB->getBase();
      }
    }
    return NULL;
  }

  function get($dn, $conn) {
    try {
      $dn = $this->_dn($dn);
      $res = @ldap_read($conn, $dn, '(objectclass=*)', $this->Attribute ?? ['*']);
      if ($res && ldap_count_entries($conn, $res) === 1) {
        $entry = @ldap_first_entry($conn, $res);
        if ($entry) { return $entry; }
      }
      if ($this->local) { return null; }
      $this->local = true;
      return $this->get($dn, $conn);
    } catch (\Exception $e) {
      error_log($e->getMessage());
      return null;
    }
  }

  function localListing ($filter, $limit, $conn, &$result) {
    $res = @ldap_list($conn, $this->_dn(), $filter, $this->Attribute ?? [ '*' ], 0, $limit);
    if($res) {
      for($e = ldap_first_entry($conn, $res); $e; $e = ldap_next_entry($conn, $e)) {
        $result->addItem($this->processEntry($conn, $e, $result));
      }
    }
  }

  function listing($options) {
    $result = new \artnum\JStore\Result();
    $c = $this->DB->readable();
    if(!empty($options['search'])) {
      $filter = $this->prepareSearch($options['search']);
    } else {
      $filter = '(objectclass=*)';
    }
    $limit = 0;
    if (!empty($options['limit']) && ctype_digit(($options['limit']))) {
      $limit = intval($options['limit']);
    }
    $res = @ldap_list($c, $this->_dn(), $filter, $this->Attribute ?? [ '*' ], 0, $limit);
    if($res) {
      for($e = ldap_first_entry($c, $res); $e; $e = ldap_next_entry($c, $e)) {
        $result->addItem($this->processEntry($c, $e, $result));
      }
    }
    $this->local = true;
    $this->localListing($filter, $limit, $c, $result);
    return $result;
  }

  function readLocal ($dn, $conn, &$result) {
    $this->local = true;
    $res = @ldap_read($conn, $this->_dn($dn), '(objectclass=*)', $this->Attribute ?? ['*']);
    if($res && ldap_count_entries($conn, $res) == 1) {
      $entry = $this->processEntry($conn, ldap_first_entry($conn, $res), $result);
      if ($entry) {
        $result->addItem($entry);
      }
    }
  }

  function _read($dn) {
    $this->local = false;
    $result = new \artnum\JStore\Result();
    try {
      $c = $this->DB->readable();
      $dn = rawurldecode($dn);
      $res = @ldap_read($c, $this->_dn($dn), '(objectclass=*)', $this->Attribute ?? ['*']);
      if($res && ldap_count_entries($c, $res) == 1) {
        $entry = $this->processEntry($c, ldap_first_entry($c, $res), $result);
        if ($entry) {
          $result->addItem($entry);
        }
      }
      $this->readLocal($dn, $c, $result);
    } catch (\Exception $e) {
      $result->addError($e->getMessage(), $e);
    }
    return $result;
  }

  function processEntry($conn, $ldapEntry, &$result) {
    $entry = parent::processEntry($conn, $ldapEntry, $result);
    $dn = ldap_get_dn($conn, $ldapEntry);
    $localbase = $this->kconf->get('trees.local-contact');
    $entry['local'] = false;
    if (substr($dn, -strlen($localbase)) === $localbase) {
      $entry['local'] = true;
    }
    if (!is_array($entry['objectclass'])) {
      $entry['objectclass'] = [$entry['objectclass']];
    }
    $oc = array_map('strtolower', $entry['objectclass']);
    unset($entry['objectclass']);
    if (in_array('inetorgperson', $oc)) {
      $entry['type'] = 'person';

      $displayname = [];
      foreach (['givenname', 'sn'] as $n) {
        if (!empty($entry[$n])) {
          if (is_array($entry[$n])) {
            $entry[$n] = implode(' ', $entry[$n]);
          }
          $displayname[] = $entry[$n];
        }
      }
      if (count($displayname) > 0) { $entry['displayname'] = join(' ', $displayname); }
    } else {
      $entry['type'] = 'organization';
      if (empty($entry['o'])) {
        return [];
      }
      $entry['displayname'] = $entry['o'];
      $person = [];
      if (!empty($entry['givenname'])) { $person[] = $entry['givenname']; }
      if (!empty($entry['sn'])) { $person[] = $entry['sn']; }
      if (count($person) > 0) { $entry['person'] = join(' ', $person); }
    }

    $locality = [];
    if (!empty($entry['postalcode'])) { $locality[] = $entry['postalcode']; }
    if (!empty($entry['l'])) { $locality[] = $entry['l']; }
    $entry['locality'] = join(' ', $locality);

    if (!empty($entry['seealso;'])) {
      foreach ($entry['seealso;'] as $k => $v) {
        if (substr($k, 0, 9) !== 'relation-') { continue; }
        if (is_array($v)) { $v = $v[0]; }
        $ident = explode(',', $v, 2)[0];
        $name = '_' . explode('-', $k, 2)[1];
        $entry[$name] = rawurlencode($ident);
      }
      unset($entry['seealso;']);
    }
    unset($entry['seealso']);

    return $entry;
  }

  function do_write($data, $overwrite = false) {
    if ($data['local']) {
      $this->local = true;
    }
    unset($data['local']);

    if ($data['type'] === 'person') {
      if (!isset($data['sn']) && !isset($data['givenname'])) { 
        $result = new \artnum\JStore\Result();
        $result->addError('Empty name');
        return $result;
      }
      if (!isset($data['sn'])) { $data['sn'] = ' '; }
      if (!isset($data['givenname'])) { $data['givenname'] = ' '; }
      $data['cn'] = $data['sn'] . ' ' . $data['givenname'];
      if (!empty($data['organization'])) {
        $org = trim($data['organization']);
        if (preg_match('/\/?Contacts\/.+/', $org)) {
          $orgId = rawurldecode(array_pop(explode('/', $org)));
          $dn = $this->_dn($orgId);
          if ($this->_exists($orgId)) {
            $data['seeAlso;relation-worker'] = $dn;
          }
        } else {
          $data['o'] = $data['organization'];
        }
      }
      unset($data['organization']);
    }
    return parent::do_write($data, $overwrite);
  }

  function getCacheOpts() {
    /* 15min cache for contacts */
    return ['age' => 90, 'public' => true];
  }
}
?>
