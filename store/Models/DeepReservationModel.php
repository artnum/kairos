<?PHP
/* Extract all information needed for frontpage, read-only */ 
class DeepReservationModel extends ReservationModel {

   function __construct($dbs, $config) {
      parent::__construct($dbs['sql'], $config);
      $this->dbs = $dbs;
      $this->conf('datetime', array('created', 'deleted', 'modification', 'begin', 'end', 'deliveryBegin', 'deliveryEnd', 'reported', 'done', 'inprogress'));
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
               $ret[] = $this->read($this->unprefix($v)['id']);
            }
         }

         return $ret;
      } catch (\Exception $e) {
         return NULL;
      }

      return NULL;
   }

   function get($id) {
      $pre_statement = '
         SELECT warehouse.*, reservation.*, return.* FROM reservation
               LEFT JOIN warehouse ON reservation.reservation_warehouse = warehouse.warehouse_id
               LEFT JOIN return ON reservation.reservation_id = return.return_target
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
               $table = strtolower($pathType[count($pathType) - 2]);
               $subid = $pathType[count($pathType) - 1];

               $ux['type'] = array();
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

               $entry['complements'][] = $ux;
            }

            $st = $this->DB->prepare('SELECT * FROM `contacts` WHERE `contacts_reservation` = :reservation');
            $st->bindParam(':reservation', $id, \PDO::PARAM_INT);
            $st->execute();
            $CModel = new ContactsModel($this->dbs['ldap'], null);
            $contacts = array();
            foreach($st->fetchAll(\PDO::FETCH_ASSOC) as $contact) {
               $contact = $this->unprefix($contact, 'contacts');
               
               /* Request contact */ 
               if($contact['target']) {
                  $target = $this->unstorify($contact['target']);
                  if($target[0] == 'Contacts') {
                     $c = $CModel->read($target[1]);
                     if(count($c) > 0) {
                        $contact['target'] = $c[0];
                     }
                  } else {
                     $jrc = new \artnum\JRestClient($_SERVER['SERVER_NAME']);
                     $res = $jrc->direct($_SERVER['SERVER_NAME'] . '/location/store/' . $contact['target']);
                     if($res['data'] && count($res['data']) > 0) {
                        $contact['target'] = $res['data'][0];
                     }
                  }
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

         /*try {
            $st = $this->DB->prepare('SELECT * FROM `return` WHERE `return_target` = :target');
            $st->bindParam(':target', $entry['id'], \PDO::PARAM_INT);
            $st->execute();
            $res = $st->fetchAll(\PDO::FETCH_ASSOC);
            if(!empty($res)) {
               $return = $this->unprefix($res[0]);
               $return = $this->_postprocess($return);
               $entry['return'] = $return;
            } else {
               $entry['return'] = null;
            }
         } catch (\Exception $e) {

         }*/
         $entry['id'] = (string)$entry['id'];
         return $entry;
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
