<?PHP
class AssociationModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'association', 'association_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
