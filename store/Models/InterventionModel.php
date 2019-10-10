<?PHP
class InterventionModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'intervention', 'intervention_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('datetime', array('date'));
   }
}
?>
