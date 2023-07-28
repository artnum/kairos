<?PHP
class TagsModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      $this->Machine = new LDAPGetEntry($this->kconf);
      $this->Machine->setLdap($this->kconf->getDB('ldap', true));
      parent::__construct($db, 'tags', '', []);
      $this->conf('auto-increment', true);
   }

   function delete($id) {
      $retVal  = new \artnum\JStore\Result();
      list ($target, $value) = explode('.', $id, 2);
      if(!empty($value) && !empty($target)) {
         $pre_statement = sprintf('DELETE FROM `%s` WHERE %s_target = :target AND %s_value = :value',
               $this->Table, $this->Table, $this->Table);

         try {
            $st = $this->get_db()->prepare($pre_statement);
            $st->bindParam(':value', $value, \PDO::PARAM_STR);
            $st->bindParam(':target', $target, \PDO::PARAM_STR);
         } catch(\Exception $e) {
            $retVal->addError($e->getMessage());
         }

         $retVal->addItem($st->execute());
      }

      return $retVal;
   }

   function listing($options) {
      $retVal = new \artnum\JStore\Result();
      try {
         $st = $this->get_db()->prepare(sprintf('SELECT * FROM %s', $this->Table));
         $st->execute();

         while($row = $st->fetch()) {
            if(! isset($results[$row['tags_target']])) {
               $results[$row['tags_target']] = array();
            }

            array_push($results[$row['tags_target']], $row['tags_value']);
         }
         $retVal->setItems($results);
         $retVal->setCount(count($results));
      } catch (\Exception $e) {
         $retVal->addError($e->getMessage());
      }
      
      return $retVal;
   }

   function get($id) {
      $results = [];
      $pre_statement = 'SELECT * FROM ' . $this->Table . ' WHERE %s = :w1';
      $whereClause = [];
      if(substr($id, 0, 1) == '.') {
         $whereClause['w1'] = substr($id, 1);
      } else {
         $whereClause['w1'] = $id;
         $sId = explode('/', $id);
         $allId = $this->Machine->getAllId($sId[count($sId) - 1]);
         if ($allId === null) {
            return $results;
         }

         $where = [];
         $i = 1;
         foreach ($allId as $id) {
            $sId[count($sId) - 1] = $id;
            $where[] = "tags_target = :w$i";
            $whereClause["w$i"] = join('/', $sId);
            $i++;
         }
         
         $pre_statement = 'SELECT * FROM ' . $this->Table . ' WHERE ' . join(' OR ', $where);
      }

      try {
         $st = $this->get_db()->prepare($pre_statement);
         foreach ($whereClause as $k => $v) {
            $st->bindValue(':' . $k, $v, \PDO::PARAM_STR);
         }
         $st->execute();
         while($row = $st->fetch()) {
            $sId = explode('/', $row['tags_target']);
            $newId = $this->Machine->getMachine($sId[count($sId) - 1]);
            $id = $row['tags_target'];
            if ($newId) {
               $sId[count($sId) - 1] = $newId;
               $id = join('/', $sId);
            }
            if(! isset($results[$newId])) {
               $results[$newId] = array();
            }
            array_push($results[$newId], $row['tags_value']);
         }
      } catch(\Exception $e) {
      }
      
      return $results;
   }

   function read($id, $options) {
      $retVal = new \artnum\JStore\Result();
      $retVal->addItem($this->get($id));
      return $retVal;
   }

   function write($data, $id = NULL) {
      $retVal = new \artnum\JStore\Result();
      $insert = [];
      $deletes = [];
      $delete = [];
      $deleteClause = [];
      foreach($data as $k => $v) {
         $sId = explode('/', $k);
         $newId = $this->Machine->getMachine($sId[count($sId) - 1]);
         $ids = $this->Machine->getAllId($sId[count($sId) - 1]);
         if ($ids === null) { return $retVal; }
         $i = 0;
         foreach ($ids as $id) {
            $sId[count($sId) - 1] = $id;
            $delete["t$i"] = join('/', $sId);
            $deleteClause[] = 'tags_target = :t' . $i;
            $i++;
         }
         $deletes[$k] = [$delete, $deleteClause];
         
         if ($newId !== null) {
            $sId[count($sId) - 1] = $newId;
            $newId = join('/', $sId);
            if(!is_array($v)) { $v = array($v); }
            foreach($v as $_v) {
               if(empty($_v)) { continue; }
               array_push($insert, sprintf('( %s, %s  )',$this->get_db()->quote($_v), $this->get_db()->quote($newId)));
            }
         }
      }

      if(count($deletes) > 0) {
         try {
            foreach($deletes as $d) {
               $query = 'DELETE FROM ' . $this->Table . ' WHERE ' . join(' OR ', $d[1]);
               $stmt = $this->get_db()->prepare($query);
               foreach ($d[0] as $k => $v) {
                  $stmt->bindValue(':' . $k, $v, \PDO::PARAM_STR);
               }
               $stmt->execute();
            } 
         } catch(\Exception $e) {
            $retVal->addError($e->getMessage());
         }
      }
      if(count($insert) > 0) {
         try {
            $query = sprintf('INSERT INTO %s VALUES %s', $this->Table, join(',', $insert));
            $st = $this->get_db()->prepare($query);
            $retVal->addItem($st->execute());
         } catch(\Exception $e) {
            $retVal->addError($e->getMessage());
         }
      }
      return $retVal;
   }
}
?>
