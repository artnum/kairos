<?PHP

class ContactsModel extends artnum\LDAP {
   function __construct($db, $config)  {
      parent::__construct($db, 'ou=Contacts,o=airnace', array('givenname', 'sn', 'displayname', 'mail', 'telephonenumber', 'o', 'mobile', 'l', 'postalcode', 'c', 'postaladdress', 'uid'), $config);
   }
}
?>
