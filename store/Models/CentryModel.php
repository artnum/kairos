<?PHP
class CentryModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'centry', 'centry_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('defaults', array(
         'description' => '',
         'price' => NULL,
         'quantity' => NULL,
         'total' => NULL,
         'unit' => NULL,
         'count' => NULL));
      $this->conf('force-type', array(
         'count_price' => 'str',
         'count_quantity' => 'str',
         'count_total' => 'str'));
   }
}
?>
