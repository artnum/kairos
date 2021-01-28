<?PHP
class CentryModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'centry', 'centry_id', []);
      $this->conf('auto-increment', true);
      $this->conf('defaults', array(
         'description' => '',
         'price' => NULL,
         'discount' => NULL,
         'quantity' => NULL,
         'total' => NULL,
         'unit' => NULL,
         'count' => NULL));
      $this->conf('force-type', array(
         'count_price' => 'str',
         'count_discount' => 'str',
         'count_quantity' => 'str',
         'count_total' => 'str'));
   }
}
?>
