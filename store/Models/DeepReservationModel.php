<?PHP
/* Extract all information needed for frontpage, read-only */ 
class DeepReservationModel extends ReservationModel {
  
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
      $pre_statement = 'SELECT reservation.*, status.status_color FROM `reservation` JOIN status ON reservation.reservation_status = status.status_id WHERE reservation_id = :id';
      try {
         $st = $this->DB->prepare($pre_statement);
         $bind_type = ctype_digit($id) ? \PDO::PARAM_INT : \PDO::PARAM_STR;
         $st->bindParam(':id', $id, $bind_type);
         if($st->execute()) {
            $data = $st->fetch(\PDO::FETCH_ASSOC);
            if($data != FALSE) {
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
         $entry['complements'] = array();            
         try {
            $st = $this->DB->prepare('SELECT * FROM association WHERE association_reservation = :reservation');
            $st->bindParam(':reservation', $id, \PDO::PARAM_INT);
            $st->execute();
            foreach($st->fetchAll(\PDO::FETCH_ASSOC) as $complement) {
               $ux = $this->unprefix($complement);
               $pathType = explode('/', str_replace('//', '/', $ux['type']));
               $table = strtolower($pathType[count($pathType) - 2]);
               $id = $pathType[count($pathType) - 1];

               $ux['type'] = array();
               try { 
                  $subst = $this->DB->prepare(sprintf('SELECT * FROM %s WHERE %s = :value', $table, $table . '_id'));
                  $subst->bindParam(':value', $id, \PDO::PARAM_STR);
                  $subst->execute();
                  if($type = $subst->fetchAll(\PDO::FETCH_ASSOC)[0]) {
                     $_ux = $this->unprefix($type);
                     $ux['type'] = $_ux;
                  }
               } catch (\Exception $e) {
               }

               $entry['complements'][] = $ux;
            }

            $st = $this->DB->prepare('SELECT * FROM `contacts` WHERE `contacts_reservation` = :reservation');
            $st->bindParam(':reservation', $id, \PDO::PARAM_INT);
            $st->execute();
            $contacts = array();
            foreach($st->fetchAll(\PDO::FETCH_ASSOC) as $contact) {
               $contact = $this->unprefix($contact);
               
               /* Request contact */ 
               if($contact['target']) {
                  $jrc = new \artnum\JRestClient($_SERVER['SERVER_NAME']);
                  $res = $jrc->direct($_SERVER['SERVER_NAME'] . '/location/store/' . $contact['target']);
                  if($res['data'] && count($res['data']) > 0) {
                     $contact['target'] = $res['data'][0];
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

         return $entry;
      }
      return array();
   }   

}
?>
