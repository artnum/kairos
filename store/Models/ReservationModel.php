<?PHP

class ReservationModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'reservation', 'reservation_id', $config);
      $this->conf('auto-increment', true);
   }

/*   function listing($options) {
      $pre_statement = sprintf('SELECT `%s` FROM `%s`', 
            $this->IDName, $this->Table);

      if(! empty($options['search'])) {
         if(!empty($options['search']['begin']) && !empty($options['search']['end'])) {
            $b = $options['search']['begin']; $e = $options['search']['end'];
            $pre_statement = sprintf('reservation_begin < "%s" AND reservation_end > "%s"', $e, $b); 
         }
         unset($options['search']['begin']); unset($options['search']['end']);
         $pre_statement .= $this->prepareSearch($options['search']);
      
      }

      if(! empty($options['sort'])) {
         $pre_statement .= $this->prepareSort($options['sort']);
      }
      
      if(! empty($options['limit'])) { 
         $pre_statement .= ' ' . $this->prepareLimit($options['limit']);
      }

      $st = $this->DB->prepare($pre_statement);
      if($st->execute()) {
         $data = $st->fetchAll(\PDO::FETCH_ASSOC);
         $return = array();
         foreach($data as $d) {
            $return[] = $this->read($d[$this->IDName])[0];
         }
         return $return;
      }
      return NULL;
   }*/
}

?>
