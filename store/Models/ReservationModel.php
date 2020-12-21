<?PHP

class ReservationModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'reservation', 'reservation_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('create', 'reservation_created');
      $this->conf('create.ts', true);
      $this->conf('mtime', 'reservation_modification');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'reservation_deleted');
      $this->conf('delete.ts', true);
      $this->conf('datetime', array('begin', 'end', 'deliveryBegin', 'deliveryEnd'));
      $this->conf('force-type', array(
         'reservation_reference' => 'string',
         'reservation_title' => 'string',
         'reservation_comment' => 'string',
         'reservation_note' => 'string',
         'reservation_folder' => 'string',
         'reservation_gps' => 'string',
         'reservation_equipment' => 'string',
         'reservation_locality' => 'string',
         'reservation_address' => 'string'
      ));
   }

   function getStats($options) {
      $result = new \artnum\JStore\Result();
      if (empty($options['from'])) {
         $from = new DateTime('now');
         $from->setDate($from->format('Y'), 1, 1);
         $from->setTime(0, 0, 0, 0);
         $options['from'] = $from->format('U');
      } else {
         $from = new DateTime($options['from']);
         $options['from'] = $from->format('U');
      }
      if (empty($options['to'])) {
         $to = new DateTime('now');
         $options['to'] = $to->format('U');
      } else {
         $to = new DateTime($options['to']);
         $options['to'] = $to->format('U');
      }
      
      /* SELECT "reservation_creator",
             COUNT("reservation_id") AS "reservation_totUser",
             MIN("reservation_created") AS "reservation_first",
             MAX("reservation_created") AS "reservation_last", 
            (SELECT COUNT("reservation_id") FROM "reservation" WHERE "reservation_created" >=  1577836800  AND "reservation_created" <= 1608545832 AND COALESCE("reservation_deleted", 0) = 0) AS reservation_total
         FROM "reservation"
         WHERE "reservation_created" >=  1577836800  AND "reservation_created" <= 1608545832 AND COALESCE("reservation_deleted", 0) = 0 
         GROUP BY idFromUrl(reservation_creator) 
         ORDER BY "reservation_totUser" DESC;
       */
      $query = 'SELECT idFromUrl("reservation_creator") AS "reservation_id", "reservation_creator", COUNT("reservation_id") AS "reservation_totUser",
                  MAX("reservation_created") AS "reservation_last", MIN("reservation_created") as "reservation_first",
                  (SELECT COUNT("reservation_id") FROM "reservation" WHERE "reservation_created" >= :from AND "reservation_created" <= :to AND COALESCE("reservation_deleted", 0) = 0) AS "reservation_total"
                  FROM "reservation"  
                  WHERE "reservation_created" >= :from AND "reservation_created" <= :to AND COALESCE("reservation_deleted", 0) = 0 __USER__
                  GROUP BY idFromUrl(reservation_creator)
                  ORDER BY "reservation_totUser" DESC';

      if (empty($options['user'])) {
         $query = str_replace('__USER__', '', $query);
      } else {
         $query = str_replace('__USER__', ' AND idFromUrl("reservation_creator") = :user', $query);
      }

      $stmt = $this->get_db(true)->prepare($query);
      $stmt->bindParam(':from', $options['from'], PDO::PARAM_INT);
      $stmt->bindParam(':to', $options['to'], PDO::PARAM_INT);
      if (!empty($options['user'])) {
         $stmt->bindParam(':user', $options['user'], PDO::PARAM_INT);
      }

      if ($stmt->execute()) {
         while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $result->addItem($this->unprefix($row));
         }
      }
      return $result;
   }

   function getMachineStats($options) {
      $result = new \artnum\JStore\Result();
      if (empty($options['from'])) {
         $from = new DateTime('now');
         $from->setDate($from->format('Y'), 1, 1);
         $from->setTime(0, 0, 0, 0);
         $options['from'] = $from->format('U');
      } else {
         $from = new DateTime($options['from']);
         $options['from'] = $from->format('U');
      }
      if (empty($options['to'])) {
         $to = new DateTime('now');
         $options['to'] = $to->format('U');
      } else {
         $to = new DateTime($options['to']);
         $options['to'] = $to->format('U');
      }
      
      $query = 'SELECT "reservation_target" AS "reservation_id", "reservation_target", COUNT("reservation_id") AS "reservation_totUser",
                  MAX("reservation_created") AS "reservation_last", MIN("reservation_created") as "reservation_first",
                  (SELECT COUNT("reservation_id") FROM "reservation" WHERE "reservation_created" >= :from AND "reservation_created" <= :to AND COALESCE("reservation_deleted", 0) = 0) AS "reservation_total"
                  FROM "reservation"  
                  WHERE "reservation_created" >= :from AND "reservation_created" <= :to AND COALESCE("reservation_deleted", 0) = 0 __MACHINE__
                  GROUP BY "reservation_target"
                  ORDER BY "reservation_totUser" DESC';

      if (empty($options['machine'])) {
         $query = str_replace('__MACHINE__', '', $query);
      } else {
         $query = str_replace('__MACHINE__', ' AND "reservation_target" = :machine', $query);
      }

      $stmt = $this->get_db(true)->prepare($query);
      $stmt->bindParam(':from', $options['from'], PDO::PARAM_INT);
      $stmt->bindParam(':to', $options['to'], PDO::PARAM_INT);
      if (!empty($options['machine'])) {
         $stmt->bindParam(':machine', $options['machine'], PDO::PARAM_INT);
      }

      if ($stmt->execute()) {
         while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $result->addItem($this->unprefix($row));
         }
      }
      return $result;
   }

}
?>
