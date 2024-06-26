<?PHP

use Ramsey\Uuid\Nonstandard\Uuid;

require('../vendor/autoload.php');

class ReservationModel extends artnum\SQL
{
   protected $kconf;
   function __construct($db, $config)
   {
      $this->kconf = $config;
      parent::__construct($db, 'reservation', 'reservation_id', []);
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
      $this->set_req('update', 'UPDATE "\\Table" SET \\COLVALTXT, "reservation_version" = "reservation_version" + 1 WHERE "\\IDName" = :\\IDName');
   }

   function getStats($options)
   {
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

      $options['fromSeven'] = $options['to'] - (86400 * 7);
      $query = 'SELECT idFromUrl("reservation_creator") AS "reservation_id", "reservation_creator", COUNT("reservation_id") AS "reservation_totUser",
                  MAX("reservation_created") AS "reservation_last", MIN("reservation_created") as "reservation_first",
                  (SELECT COUNT("reservation_id") FROM "reservation" WHERE "reservation_created" >= :from AND "reservation_created" <= :to AND COALESCE("reservation_deleted", 0) = 0 AND "reservation_status" <> 3) AS "reservation_total",
                  (SELECT COUNT("reservation_id") FROM "reservation" LEFT JOIN "association" ON "association_reservation" = "reservation_id" WHERE idFromUrl("association_type") = 4 AND "reservation_created" >= :from AND "reservation_created" <= :to AND COALESCE("reservation_deleted", 0) = 0 AND "reservation_status" <> 3) AS "reservation_totalMachinist"
                  FROM "reservation"  
                  WHERE "reservation_created" >= :from AND "reservation_created" <= :to AND COALESCE("reservation_deleted", 0) = 0 AND "reservation_status" <> 3 __USER__
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

   function getMachineStats($options)
   {
      $result = new \artnum\JStore\Result();
      $from = null;
      $to = null;
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

      $diffPeriod = $from->diff($to, true);
      $sundaysPeriod = intval($diffPeriod->days / 7) + ($from->format('N') + $diffPeriod->days % 7 >= 7);
      $saturdaysPeriod = intval($diffPeriod->days / 7) + ($from->format('N') + $diffPeriod->days % 7 >= 6);

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

      $query2 = 'SELECT "reservation_status" AS "status", "reservation_begin" AS "begin", "reservation_end" AS "end", "reservation_deliveryBegin" AS "deliveryBegin", "reservation_deliveryEnd" AS "deliveryEnd"
                 FROM "reservation" 
                 WHERE UNIX_TIMESTAMP(STR_TO_DATE("reservation_begin", \'%Y-%m-%dT%T\')) <= :to 
                   AND UNIX_TIMESTAMP(STR_TO_DATE("reservation_end", \'%Y-%m-%dT%T\')) >= :from 
                   AND COALESCE("reservation_deleted", 0) = 0 
                   AND "reservation_target" = :target';
      if ($stmt->execute()) {
         while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $entry = $this->unprefix($row);

            $subQuery = $this->get_db(true)->prepare($query2);
            $subQuery->bindParam(':from', $options['from'], PDO::PARAM_INT);
            $subQuery->bindParam(':to', $options['to'], PDO::PARAM_INT);
            $subQuery->bindParam(':target', $entry['id'], PDO::PARAM_STR);
            $entry['daysReserved'] = 0;
            $entry['daysRepair'] = 0;
            $entry['daysWaiting'] = 0;
            if ($subQuery->execute()) {
               while ($reservation = $subQuery->fetch(PDO::FETCH_ASSOC)) {
                  $begin = new DateTime($reservation['begin']);
                  $end = new DateTime($reservation['end']);

                  if ($end->getTimestamp() > $options['to']) {
                     $end = new DateTime("@$options[to]");
                     $dEnd = null;
                  }
                  if ($begin->getTimestamp() < $options['from']) {
                     $begin = new DateTime("@$options[from]");
                     $dBegin = null;
                  }

                  $days = $begin->diff($end, true)->days + 1;
                  $sundays = intval($days / 7) + ($begin->format('N') + $days % 7 >= 7);
                  $saturdays = intval($days / 7) + ($begin->format('N') + $days % 7 >= 6);

                  $dBegin = is_null($reservation['deliveryBegin']) ? null : new DateTime($reservation['deliveryBegin']);
                  $dEnd = is_null($reservation['deliveryEnd']) ? null : new DateTime($reservation['deliveryEnd']);

                  if (!is_null($dBegin)) {
                     $diffB = $dBegin->diff($begin, true)->days;
                     $entry['daysWaiting'] += $diffB;
                  }
                  if (!is_null($dEnd)) {
                     $diffC = $dEnd->diff($end, true)->days;
                     $entry['daysWaiting'] += $diffC;
                  }

                  if ($reservation['status'] == 1) {
                     $entry['daysReserved'] += $days - ($saturdays + $sundays);
                  } else if ($reservation['status'] == 3) {
                     $entry['daysRepair'] += $days - ($saturdays + $sundays);
                  }
               }
            }
            $entry['daysRepair'] = $entry['daysRepair'];
            $entry['daysWaiting'] = $entry['daysWaiting'];
            $entry['daysReserved'] = $entry['daysReserved'];
            $entry['daysPeriod'] = $diffPeriod->days - ($sundaysPeriod + $saturdaysPeriod);
            $result->addItem($entry);
         }
      }
      return $result;
   }
   function update($data)
   {
      $id = $data[$this->IDName];
      if (isset($data[$this->IDName])) {
         unset($data[$this->IDName]);
      }

      $previous_version = $data['reservation_version'];
      unset($data['reservation_version']);
      foreach (array_keys($data) as $c) {
         if (strcmp($c, $this->IDName) != 0) {
            $columns_values[] = '`' . $c . '` = :' . $c;
         }
      }
      $columns_values_txt = implode(',', $columns_values);

   
      $db = $this->get_db(false);
      if ($previous_version === 'force') {
         $st = $db->prepare($this->req('update', array('COLVALTXT' => $columns_values_txt)));
      } else {
         $req = $this->req('update', array('COLVALTXT' => $columns_values_txt)) . ' AND "reservation_version" = :previous_version';
         $st = $db->prepare($req);
         $st->bindValue(':previous_version', intval($previous_version), \PDO::PARAM_INT);
      }
      foreach ($data as $k_data => &$v_data) {
         $bind_type = $this->_type($k_data, $v_data);
         if (is_null($bind_type)) {
            $bind_type = \PDO::PARAM_STR;
            if (is_null($v_data)) {
               $bind_type = \PDO::PARAM_NULL;
            } else if (ctype_digit($v_data)) {
               $bind_type = \PDO::PARAM_INT;
            } else if (is_bool($v_data)) {
               $bind_type = \PDO::PARAM_BOOL;
            }
         }

         $st->bindParam(':' . $k_data, $v_data, $bind_type);
      }
      $bind_type = ctype_digit($id) ? \PDO::PARAM_INT : \PDO::PARAM_STR;
      $st->bindParam(':' . $this->IDName, $id, $bind_type);
      $ex = $st->execute();
      if (!$ex) {
         throw new Exception('Database error');
      }
      return $id;
   }

   function getVersion($id)
   {
      $db = $this->get_db(true);
      $st = $db->prepare('SELECT "reservation_version" FROM "reservation" WHERE "reservation_id" = :id');
      $st->bindValue(':id', $id, \PDO::PARAM_INT);
      $st->execute();
      $value = $st->fetch();

      return ['id' => $id, 'version' => $value['reservation_version']];  
   }

   function _write($data, &$id = NULL)
   {
      global $MSGSrv;
      if ($id === null && empty($data['uuid'])) {
         $data['uuid'] = Uuid::uuid4()->toString();
      }

      foreach (['begin', 'end'] as $field) {
         if (!empty($data[$field])) {
            $b = new DateTime($data[$field]);
            $data['d' . $field] = $b->format('Y-m-d');
         }
      }

      $result = parent::_write($data, $id);
      if ($result['count'] > 0) {
         $item = $this->getVersion($result['id']);
         $MSGSrv->send(json_encode([
            'operation' => 'write',
            'type' => 'reservation',
            'id' => $item['id'],
            'cid' => $this->kconf->getVar('clientid'),
            'version' => $item['version'],
         ]));
      }
      return $result;
   }

   function _delete($id) {
      global $MSGSrv;
      $time = time();
      $data = ['reservation_id' => $id, 'reservation_deleted' => $time, 'reservation_modification' => $time, 'reservation_version' => 'force'];
      $this->response->setItemId($id);
      $_id = $this->update($data);
      $this->response->start_output();
      $this->response->print(['id' => $_id]);
      if ($_id !== false) {
         $MSGSrv->send(json_encode([
            'operation' => 'delete',
            'type' => 'reservation',
            'cid' => $this->kconf->getVar('clientid'),
            'id' => $_id
         ]));
      }
      return ['count' => 1];
   }

   function getLastModification ($request) {
      $id = $request->getParameter('id');
      if ($id === null) { return ['count' => 0]; }
      
      $audit = $this->kconf->getVar('audit');
      $action = $audit->get_item_action('MODIFY', 'Reservation', $id);
      if (!$action) { 
         $action = $audit->get_item_action('CREATE', 'Reservation', $id);
         if (!$action) { return ['count' => 0]; }
      }
      $this->response->start_output();
      $this->response->print($action);
      return ['count' => 1];
   }
}
