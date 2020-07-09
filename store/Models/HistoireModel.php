<?PHP
class HistoireModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'histoire', 'histoire_id', $config);
    $this->conf('auto-increment', true);
    $this->conf('datetime', array('date'));
    $this->conf('force-type', array('original' => 'str'));
    $this->set_req('get', 'SELECT "histoire_id", "histoire_object", "histoire_type", "histoire_date", "histoire_creator", "histoire_attribute", "histoire_details", "histoire_hide", "user".*  FROM "\\Table" LEFT JOIN "user" ON "histoire_creator" = "user_id"');
    $this->conf('postprocess', function ($key, $value) {
      switch ($key) {
        case 'attribute':
          if (!empty($value)) {
            return explode(',', $value);
          } else {
            return null;
          }
      }
      return $value;
    });
  }
  
  function _write($data, $id = NULL) {
    if (isset($data['original']) && !empty($data['original'])) {
      $data['original'] = gzencode(json_encode($data['original']), 6); // 
    }
    if (isset($data['attribute']) && !empty($data['attribute'])) {
      $data['attribute'] = join(',', $data['attribute']);
    } else {
      $data['attribute'] = '';
    }
    return parent::_write($data, $id);
  }
}
?>
