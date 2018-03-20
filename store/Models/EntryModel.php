<?PHP

class EntryModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'entry', 'entry_id', $config);
      $this->conf('auto-increment', true);
   }

   function write($data) {
      $pre_statement = 'SELECT entry_id FROM entry WHERE entry_ref = :ref AND entry_name = :name';
      try {
         $st = $this->DB->prepare($pre_statement);
         $st->bindParam(':ref', $data['ref'], \PDO::PARAM_STR);
         $st->bindParam(':name', $data['name'], \PDO::PARAM_STR);
         if($st->execute()) {
            if($st->rowCount() > 0) {
               $id = $st->fetchAll();

               $data['id'] = $id[0];
            }

            return parent::write($data);
         }
      } catch(\Exception $e) {
         return FALSE;
      }
   
      return FALSE;
   }
}

?>
