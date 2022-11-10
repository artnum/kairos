<?PHP
class PCModel extends artnum\SQL {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'localite', 'localite_uid', []);
   }

  function extendEntry ($entry, &$result) {
    $label = '';
    if (!empty($entry['np'])) { $label .= $entry['np'] . ' '; }
    if (!empty($entry['name'])) { $label .= $entry['name'] . ' '; }
    if (!empty($entry['state'])) { $label .= '[' . strtoupper($entry['state']) . ']'; }
    $entry['label'] = trim($label);
    return $entry;
  }
  
  function _write($arg, &$id = NULL) {
    return false;
  }
  function _overwrite($arg, &$id = NULL) {
    return false;
  }
  function _delete(&$arg) {
    return false;
  }
  function getCacheOpts() {
    /* 15min cache for contacts */
    return ['age' => 3600, 'public' => true];
  }
}

?>
