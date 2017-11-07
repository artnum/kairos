<?PHP

class EventsModel extends SQL {

   function __construct($db, $config) {
      parent::__construct($db, 'events', 'events_id');
   }

   function emit($type, $message, $other = null) {
      $time = floor(microtime(true) * 1000);

      $pre_statement = 'INSERT INTO `events` ( `events_time`, `events_type`, `events_message`, `events_other` ) VALUES ( :time, :type, :message, :other  )';
      $st = $this->DB->prepare($pre_statement);
      $st->bindParam(':time', $time, \PDO::PARAM_INT);       
      $st->bindParam(':type', $type, \PDO::PARAM_STR);       
      $st->bindParam(':time', $message, \PDO::PARAM_STR);       
      if(is_null($other)) {
         $st->bindParam(':other', $other, \PDO::PARAM_NULL);       
      } else {
         $st->bindParam(':other', $other, \PDO::PARAM_STR);       
      }

      return $st->execute();
   }

   function last() {
      $pre_statement = sprintf('SELECT  MAX(%s) FROM `%s`');
   }

   function read($position) {
      $pre_statement = sprintf('SELECT * FROM `%s` WHERE %s < :position'); 
   }

}

?>
