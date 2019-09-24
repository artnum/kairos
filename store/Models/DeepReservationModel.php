<?PHP
/* Extract all information needed for frontpage, read-only */ 
class DeepReservationModel extends ReservationModel {

  function __construct($dbs, $config) {
    parent::__construct($dbs['sql'], $config);
    $this->dbs = $dbs;
    $this->conf('datetime', array('begin', 'end', 'deliveryBegin', 'deliveryEnd', 'reported', 'done', 'inprogress'));
  }

  function get_db($x = false) {
    return $this->DB;
  }

  function set_db($dbs) {
    $this->DB = $dbs['sql'];
    $this->dbs = $dbs;
  }

  function dbtype() {
    return array('sql', 'ldap');
  }

  function listing($options) {
    try {
      $st = $this->DB->prepare($this->prepare_statement('SELECT reservation_id FROM reservation', $options));
      $ret = array();
      if($st->execute()) {
        foreach($st->fetchAll(\PDO::FETCH_ASSOC) as $v) {
          $ret[] = $this->read($this->unprefix($v)['id'])[0];
        }
      }

      return array($ret, count($ret));
    } catch (\Exception $e) {
      return array(NULL , 0);
    }

    return array(NULL, 0);
  }

  function getTodo ($options) {
    $req = "SELECT * FROM reservation LEFT JOIN arrival ON arrival_target = reservation_id " .
           "WHERE reservation_deleted IS NOT NULL AND ((RIGHT(reservation_begin, 10) < :day1 AND arrival_done IS NULL) OR (RIGHT(reservation_begin, 10) > :day2 AND " .
           "(reservation_status = :status OR " .
           "NOT EXISTS (SELECT NULL FROM contacts WHERE contacts_comment = '_client' AND contacts_reservation = reservation_id) OR " .
           "(NOT EXISTS (SELECT NULL FROM contacts WHERE contacts_comment = '_place' AND contacts_reservation = reservation_id) AND reservation_locality NOT LIKE 'Warehouse/%') OR " .
           "(reservation_equipment IS NULL OR TRIM(reservation_equipment) = '') OR " .
           "(reservation_locality IS NULL OR TRIM(reservation_locality) = '') OR " .
           "((reservation_address IS NULL OR TRIM(reservation_address) = '') AND reservation_locality NOT LIKE 'Warehouse/%') " .
           ") ) )";

    $status = 2;
    $day = new DateTime();
    if (isset($options['search'])) {
      if(isset($options['search']['day'])) {
        try {
          $day = new DateTime($options['search']['day']);
        } catch (\Exception $e) {
          $day = new DateTime();
        }
      }
      if (isset($options['search']['status']) && is_numeric($options['search']['status'])){
        $status = $options['search']['status'];
        
      }
    } 

    if (isset($options['sort']) && !empty($options['sort'])) {
      $req .= $this->prepareSort($req, $options);
    }
    if (isset($options['limit']) && !empty($options['limit'])) {
      $req .= $this->prepareLimit($req, $options);
    }

    $results = array();
    try {
      $st = $this->DB->prepare($req);
      $st->bindValue(':day1', $day->format('Y-m-d'), PDO::PARAM_STR);
      $st->bindValue(':day2', $day->format('Y-m-d'), PDO::PARAM_STR);
      $st->bindValue(':status', $status, PDO::PARAM_INT);
      if ($st->execute()) {
        $count = 0;
        while (($row = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
          $results[] = $this->unprefix($row);
          $count++;
        }
      }
      if ($count > 0) {
        return array($results, $count);
      }
    } catch (\Exception $e) {}
    return array(NULL, 0);
  }
  
  function get($id) {
    $pre_statement = '
         SELECT warehouse.*, reservation.*, arrival.*, creator.user_name AS creator_name, creator.user_phone AS creator_phone, creator.user_id AS creator_id FROM reservation
               LEFT JOIN warehouse ON warehouse.warehouse_id = reservation.reservation_id
               LEFT JOIN arrival ON arrival.arrival_target = reservation.reservation_id
               LEFT JOIN user AS creator ON creator.user_id = REVERSE(SUBSTR(REVERSE(reservation.reservation_creator), 1, LOCATE(\'/\', REVERSE(reservation.reservation_creator))-1))
            WHERE reservation_id = :id';
    try {
      $st = $this->DB->prepare($pre_statement);
      $bind_type = ctype_digit($id) ? \PDO::PARAM_INT : \PDO::PARAM_STR;
      $st->bindParam(':id', $id, $bind_type);
      if($st->execute()) {
        $data = $st->fetch(\PDO::FETCH_ASSOC);
        if($data != FALSE) {
          if(!empty($data['reservation_status'])) {
            $pre_statement = 'SELECT status_color FROM status WHERE status_id = :id';
            try {
              $st = $this->DB->prepare($pre_statement);
              $bind_type = ctype_digit($data['reservation_status']) ? \PDO::PARAM_INT : \PDO::PARAM_STR;
              $st->bindParam(':id', $data['reservation_status'], $bind_type);
              if($st->execute()) {
                $status = $st->fetch();
                if($status) {
                  $data['reservation_color'] = $status[0];
                } else {
                  $data['reservation_color'] = 'FFFFFF';
                }
              } else {
                $data['reservation_color'] = 'FFFFFF';
              }
            } catch(\Exception $e) {
              $data['reservation_color'] = 'FFFFFF';
            }
          } else {
            $data['reservation_color'] = 'FFFFFF';
          }
          return $data;
        }
      }
    } catch (\Exception $e) {
      return NULL;
    }

    return NULL;
  }

  function read($id) {
    $entry = $this->get($id);
    if($entry) {
      $entry = $this->unprefix($entry);
      $entry = $this->_postprocess($entry);
      $entry['complements'] = array();            
      try {
        $st = $this->DB->prepare('SELECT * FROM association WHERE association_reservation = :reservation');
        $st->bindParam(':reservation', $id, \PDO::PARAM_INT);
        $st->execute();
        foreach($st->fetchAll(\PDO::FETCH_ASSOC) as $complement) {
          $ux = $this->unprefix($complement, 'association');
          $ux = $this->_postprocess($ux);
          $pathType = explode('/', str_replace('//', '/', $ux['type']));
          $ux['type'] = array();
          if (count($pathType) >= 2) {
            $table = strtolower($pathType[count($pathType) - 2]);
            $subid = $pathType[count($pathType) - 1];
            try {
              $subst = $this->DB->prepare(sprintf('SELECT * FROM %s WHERE %s = :value', $table, $table . '_id'));
              $subst->bindParam(':value', $subid, \PDO::PARAM_STR);
              $subst->execute();
              if($type = $subst->fetchAll(\PDO::FETCH_ASSOC)[0]) {
                $_ux = $this->unprefix($type, $table);
                $ux['type'] = $_ux;
              }
            } catch (\Exception $e) {
            }
          }
          $entry['complements'][] = $ux;
        }

        $st = $this->DB->prepare('SELECT * FROM `contacts` WHERE `contacts_reservation` = :reservation');
        $st->bindParam(':reservation', $id, \PDO::PARAM_INT);
        $st->execute();
        $CModel = new ContactsModel($this->dbs['ldap'], null);
        $contacts = array();
        foreach($st->fetchAll(\PDO::FETCH_ASSOC) as $contact) {
          $contact = $this->unprefix($contact, 'contacts');
          $contact['_displayname'] = '';
          $dname = array();
          
          /* Request contact */ 
          if($contact['target']) {
            $target = $this->unstorify($contact['target']);
            if($target[0] == 'Contacts') {
              $c = $CModel->read($target[1]);
              if (!isset($c[1])) {
                error_log(var_export($c, true));
              }
              if($c[1] > 0) {
                $contact['target'] = $c[0][0];
              } else {
                continue;
              }
            } else {
              $jrc = new \artnum\JRestClient($_SERVER['SERVER_NAME']);
              $res = $jrc->direct(base_url('/store/' . $contact['target']));
              if($res['length'] > 0) {
                $contact['target'] = $res['data'][0];
              }
            }
            foreach (array('displayname', 'o', 'cn') as $a) {
              if (isset($contact['target'][$a]) && !empty($contact['target'][$a])) {
                $dname[] = $contact['target'][$a];
                break;
              }
            }
            foreach (array('mobile', 'telephonenumber') as $a) {
              if (!isset($contact['target'][$a]) || empty($contact['target'][$a])) { continue; }
              $dname[] = $contact['target'][$a];
              break;
            }
            if (!empty($dname)) {
              foreach ($dname as &$v) {
                if (is_array($v)) {
                  $v = join(', ', $v);
                }
              }
              $contact['_displayname'] = join(', ', $dname);
            } else {
              $contact['_displayname'] = '';
            }
          } else {
            $contact['_displayname'] = str_replace("\n", ', ', $contact['freeform']);
          }

          switch ($contact['comment']) {
            case '_client':
            case '_place':
            case '_responsable':
            case '_facturation':
              $attr = substr($contact['comment'], 1);
              if (!isset($entry[$contact['comment']])) {
                $entry[$attr . '_'] = $contact['_displayname'];
              }
              break;
          }
          if(!isset($contacts[$contact['comment']])) {
            $contacts[$contact['comment']] = array($contact);
          } else {
            $contacts[$contact['comment']][] = $contact;
          }
        }
        
        $entry['contacts'] = $contacts;
      } catch (\Exception $e) {
        /* nothing */
      }
      $entry['id'] = (string)$entry['id'];
      return array($entry, 1);
    }
    return array();
  }

  private function unstorify ( $str ) {
    $col = ''; $item = '';

    $ex = explode('/', $str);
    for($i = array_shift($ex); !is_null($i); $i = array_shift($ex)) {
      if(!empty($i) && empty($col)) { $col = $i; continue; }
      if(!empty($i) && !empty($col)) { $item = $i; break; }
    }

    return array($col, $item);
  }
}
?>
