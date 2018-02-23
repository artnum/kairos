<?PHP
class TagsModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'tags', '', $config);
      $this->conf('auto-increment', true);
   }

   function delete($id) {
      list ($target, $value) = explode('.', $id, 2);
      if(!empty($value) && !empty($target)) {
         $pre_statement = sprintf('DELETE FROM `%s` WHERE %s_target = :target AND %s_value = :value',
               $this->Table, $this->Table, $this->Table);

         try {
            $st = $this->DB->prepare($pre_statement);
            $st->bindParam(':value', $value, \PDO::PARAM_STR);
            $st->bindParam(':target', $target, \PDO::PARAM_STR);
         } catch(\Exception $e) {
            return false;
         }

         return $st->execute();
      }

      return false;
   }

   function listing($options) {
      $results = array();
      try {
         $st = $this->DB->prepare(sprintf('SELECT * FROM %s', $this->Table));
         $st->execute();

         while($row = $st->fetch()) {
            if(! isset($results[$row['tags_target']])) {
               $results[$row['tags_target']] = array();
            }

            array_push($results[$row['tags_target']], $row['tags_value']);
         }
      } catch (\Exception $e) {
         return array();
      }
      
      return $results;
   }

   function get($id) {
      $results = array();

      $pre_statement = 'SELECT * FROM %s WHERE %s = :where';
      if(substr($id, 0, 1) == '.') {
         $where = substr($id, 1);
         $pre_statement = sprintf($pre_statement, $this->Table, 'tags_value');
      } else {
         $where = $id;
         $pre_statement = sprintf($pre_statement, $this->Table, 'tags_target');
      }

      try {
         $st = $this->DB->prepare($pre_statement);
         $st->bindParam(':where', $where, \PDO::PARAM_STR);
         $st->execute();

         while($row = $st->fetch()) {
            if(! isset($results[$row['tags_target']])) {
               $results[$row['tags_target']] = array();
            }
            array_push($results[$row['tags_target']], $row['tags_value']);
         }
      } catch(\Exception $e) {
         return array();
      }
      
      return $results;
   }

   function read($id) {
      return $this->get($id);
   }

   function write($data) {
      $insert = array();
      $delete = array();
      foreach($data as $k => $v) {
         $_k = $this->DB->quote($k);
         array_push($delete, $_k);
         if(!is_array($v)) { $v = array($v); }
         foreach($v as $_v) {
            if(empty($_v)) { continue; }
            array_push($insert, sprintf('( %s, %s )',$this->DB->quote($_v), $_k));
         }
      }

      if(count($delete) > 0) {
         try {
            foreach($delete as $d) {
               $this->DB->query(sprintf('DELETE FROM %s WHERE tags_target = %s', $this->Table, $d));
            } 
         } catch(\Exception $e) {
            return false;
         }
      }
      if(count($insert) > 0) {
         try {
            $st = $this->DB->prepare(sprintf('INSERT INTO %s VALUES %s', $this->Table, join(',', $insert)));
            return $st->execute();
         } catch(\Exception $e) {
            return false;
         }
      } else {
         return true;
      }
   }
}
?>
