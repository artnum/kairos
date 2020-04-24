<?PHP
class ContactsModel extends artnum\LDAP {
  function __construct($db, $config)  {
    parent::__construct($db, 'ou=Contacts,o=airnace', array('givenname', 'sn', 'displayname', 'mail', 'telephonenumber', 'o', 'mobile', 'l', 'postalcode', 'c', 'postaladdress', 'uid'), $config);
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
}
?>
