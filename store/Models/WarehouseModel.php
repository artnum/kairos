<?PHP
class WarehouseModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'warehouse', 'warehouse_id', $config);
    $this->conf('auto-increment', true);
  }

  function _postprocess ($entry) {
    $entry = parent::_postprocess($entry);
    $entry['label'] = 'Dépôt ' . $entry['name'];
    return $entry;
  }
}
?>
