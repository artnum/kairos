<?PHP
class ContactsModel extends artnum\LDAP {
  protected $kconf;
  function __construct($db, $config)  {
    $this->kconf = $config;
    parent::__construct($db, $this->kconf->get('trees.contacts'), array('givenname', 'sn', 'displayname', 'mail', 'telephonenumber', 'o', 'mobile', 'l', 'postalcode', 'c', 'postaladdress', 'uid'), []);
  }

  function processEntry ($conn, $ldapEntry, &$result) {
    $entry = parent::processEntry($conn, $ldapEntry, $result);

    if (empty($entry['displayname'])) {
      $displayname = '';
      foreach (array('o', 'givenname', 'sn', 'l', 'mobile', 'telephonenumber', 'mail') as $k) {
        if (!empty($entry[$k])) {
          $v = is_array($entry[$k]) ? $entry[$k][0] : $entry[$k];
          if (!empty($displayname)) { $displayname = sprintf('%s %s', $displayname, $v); break; }
          $displayname = $v;
        }
      }
      if (!empty($displayname)) {
        $entry['displayname'] = $displayname;
      }
    }

    return $entry;
  }

  function getCacheOpts() {
    /* 15min cache for contacts */
    return ['age' => 900, 'public' => true];
  }
}
?>
