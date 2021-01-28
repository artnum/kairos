<?PHP
class UnitModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'unit', 'unit_id', []);
      $this->conf('auto-increment', true);
      $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "collection" ON "\\Table"."unit_collection" = "collection"."collection_id"');
   }
}
?>
