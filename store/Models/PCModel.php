<?PHP
class PCModel extends artnum\SQL {
  function __construct($db, $config) {
      parent::__construct($db, 'localite', 'localite_uid', $config);
   }

  function extendEntry ($entry, &$result) {
    $label = '';
    if (!empty($entry['np'])) { $label .= $entry['np'] . ' '; }
    if (!empty($entry['name'])) { $label .= $entry['name'] . ' '; }
    if (!empty($entry['state'])) { $label .= '[' . strtoupper($entry['state']) . ']'; }
    $entry['label'] = trim($label);
    return $entry;
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
