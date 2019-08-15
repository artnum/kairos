<?PHP
class MachineModel extends artnum\LDAP {
   function __construct($db, $config) {
      parent::__construct($db, 'ou=Machines,ou=Catalog,o=airnace', array('description', 'cn', 'family', 'airaltref', 'floorheight', 'workheight', 'height'), $config);
   }

   function read($dn) {
      $result = parent::read($dn);
      if ($result[0]) {
         foreach ($result[0] as $k => $res) {
            if (!isset($res['description'])) { continue; }
            $entry_ref = strval($res['description']);
            try {
               $stmt = $this->SQL->prepare('SELECT * FROM "entry" WHERE "entry_ref" = :ref');
               $stmt->bindParam(':ref', $entry_ref, \PDO::PARAM_STR);
               if ($stmt->execute()) {
                  while (($data = $stmt->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
                     $result[0][$k][$data['entry_name']] = $data['entry_value'];
                  }
               }
            } catch(\Exception $e) {
            }
         }
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
