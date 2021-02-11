<?PHP
class AssociationModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'association', 'association_id', []);
      $this->conf('auto-increment', true);
      $this->conf('force-type', array(
         'association_comment' => 'string',
         'assocation_type' => 'string'
      ));
   }
}
?>
