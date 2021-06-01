<?PHP
class WarehouseModel extends artnum\SQL {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'warehouse', 'warehouse_id', []);
    $this->conf('auto-increment', true);
  }

  function _postprocess ($entry) {
    $entry = parent::_postprocess($entry);
    $entry['label'] = 'Dépôt ' . $entry['name'];
    return $entry;
  }

  function getCacheOpts() {
    /* 15min cache for contacts */
    return ['age' => 3600, 'public' => true];
  }
}
?>
