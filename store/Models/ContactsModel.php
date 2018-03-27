<?PHP

class ContactsModel extends artnum\LDAP {
   function __construct($db, $config)  {
      parent::__construct($db, 'ou=Contacts,o=airnace', array('givenname', 'sn', 'mail', 'telephonenumber', 'o', 'mobile', 'l', 'postalcode', 'c' ), $config);
   }
}
?>
