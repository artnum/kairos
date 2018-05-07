<?PHP
class AssociationModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'association', 'association_id', $config);
      $this->conf('auto-increment', true);
   }

   function write($data) {
      $results = parent::write($data);
      if($results) {
         $now = new \DateTime('now', new \DateTimeZone('UTC')); $now = $now->format('c');
         try {
            $st = $this->DB->prepare('UPDATE reservation SET reservation_modification = :time WHERE reservation_id = :target');
            $st->bindParam(':time', $now, \PDO::PARAM_STR);
            $st->bindParam(':target', $data['reservation'], \PDO::PARAM_INT);
            $st->execute();
         } catch (\Exception $e) {
            /* nothing */
         }
      }

      return $results;
   }
}
?>
