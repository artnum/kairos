<?PHP
class ContactsModel extends artnum\LDAP {
  function __construct($db, $config)  {
    parent::__construct($db, 'ou=Contacts,o=airnace', array('givenname', 'sn', 'displayname', 'mail', 'telephonenumber', 'o', 'mobile', 'l', 'postalcode', 'c', 'postaladdress', 'uid'), $config);
  }

  function read($dn) {
    $result = parent::read($dn);
    if ($result[1] === 1) {
      $dName = array();
      if (!empty($result[0][0]['displayname'])) {
        return $result;
      }
      foreach (array('o', 'givenname', 'sn', 'l', 'mobile', 'telephonenumber', 'mail') as $v) {
        if (!empty($result[0][0][$v])) {
          $dName[] = $result[0][0][$v];        
        }
      }
      $result[0][0]['displayname'] = implode(' ', array_slice($dName, 0, 2));
    }
    return $result;
  }
}
?>
