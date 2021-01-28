<?PHP
class InvoiceModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'invoice', 'invoice_id', []);
      $this->conf('auto-increment', true);
      $this->conf('create', 'invoice_created');
      $this->conf('create.ts', true);
      $this->conf('mtime', 'invoice_modified');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'invoice_deleted');
      $this->conf('delete.ts', true);
      $this->conf('datetime', array('deleted', 'modified', 'created', 'sent', 'paid'));
   }
}
?>
