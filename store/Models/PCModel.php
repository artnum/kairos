<?PHP
class PCModel extends artnum\SQL {
  function __construct($db, $config) {
      parent::__construct($db, 'localite', 'localite_uid', $config);
   }
  
  function _write($arg, $id = NULL) {
    return false;
  }
  function _overwrite($arg, $id = NULL) {
    return false;
  }
  function _delete($arg) {
    return false;
  }
}

?>
