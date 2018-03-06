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
         } catch (\Exception $e) {
            /* nothing */
         }

         return $entry;
      }
      return array();
   }   

}
?>
