<?PHP
class ContactsModel extends artnum\LDAP {
  function __construct($db, $config)  {
    parent::__construct($db, 'ou=Contacts,o=airnace', array('givenname', 'sn', 'displayname', 'mail', 'telephonenumber', 'o', 'mobile', 'l', 'postalcode', 'c', 'postaladdress', 'uid'), $config);
  }

  function processEntry ($conn, $ldapEntry, &$result) {
    $entry = parent::processEntry($conn, $ldapEntry, $result);

    if (empty($entry['displayname'])) {
      $displayname = '';
      foreach (array('o', 'givenname', 'sn', 'l', 'mobile', 'telephonenumber', 'mail') as $v) {
        if (!empty($v)) {
          if (!empty($displayname)) { $displayname = sprintf('%s %s', $displayname, $v); break; }
          $displayname = $v;
        }
      }
    }

    return $entry;
  }
}
?>
