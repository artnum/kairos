<?PHP
include("string.php");
class PCModel extends artnum\JStore\OP {
  private $entries = array();
  function __construct() {
    $this->conf('readonly', true);
    $fp = fopen(dirname(__FILE__) . '/../../resources/post-codes/post-codes.csv' , 'r');
    if ($fp) {
      while(($line = fgetcsv($fp))) {
        if ($line[0] === 'KTKZ') { continue; }
        $uid = trim($line[10]);
        $this->entries[$uid] = array(
          'uid' => $uid,
          'state' => strtolower($line[0]),
          'np' => $line[7],
          'npext' => $line[8], /* extension du code postal : 1000 Lausanne 25 */
          'part'=> strtolower($line[1]) === 'Q',
          'name' => $line[2],
          'postname' => $line[9], /* nom raccourci utilisé par la post */
          'township' => $line[5], /* nom de commune, maximum 24 caractères */
          'tsid' => $line[4], /* numéro OFS de la commune */
          /* transliterated lowercase name to help search */
          'tr_name' => $this->_searchableString($line[2]),
          'label' => $line[7] . ' ' . $line[2]
        );
      }
    }
  }

  function set_db() {
  }
  
  function dbtype() {
    return 'csv';
  }

  function _searchableString ($str) {
    $str = str_replace(['-', '_', '.', ' ', ','], '', $str);
    return strtolower(remove_accents($str));
  }
  
  function listing($arg) {
    if (isset($arg['search'])) {
      $r1 = [];

      $in_set = [];
      foreach($arg['search'] as $k => $v) {
        foreach($this->entries as $entry) {
          if (in_array($entry['uid'], $in_set)) { continue; } // déjà dans le groupe de données
          switch ($k) {
            case 'np':
              if (!empty($v) && strpos($entry[$k], $v) === 0) {
                $r1[] = $entry;
                $in_set[] = $entry['uid'];
              }
              break;
            default:
            case 'name':
              if (empty($v)) { break; }
              $v = $this->_searchableString($v);
              $cmpVal = $entry[$k];
              if (isset($entry['tr_' . $k])) {
                $cmpVal = $entry['tr_' . $k];
              }

              if (strpos($cmpVal, $v) === 0) {
                $r1[] = $entry;
                $in_set[] = $entry['uid'];
              }
              break;
          }
        }
      }
      usort($r1, function ($a, $b) {
        return strcasecmp($a['name'], $b['name']);
      });
      return array($r1, count($r1));
    } else {
      return array(array_values($this->entries), count($this->entries));
    }
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
  
  function _read($arg) {
    if ($this->_exists($arg)) {
      return array($this->entries[$arg], 1);
    }
  }
  
  function _exists($arg) {
    if (isset($this->entries[$arg])) {
      return true;
    }
    return false;
  }
}

?>
