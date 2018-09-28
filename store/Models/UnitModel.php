<?PHP
class UnitModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'unit', 'unit_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
