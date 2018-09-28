<?PHP
class InvoiceModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'invoice', 'invoice_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'invoice_modified');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'invoice_deleted');
      $this->conf('delete.ts', true);
      $this->conf('datetime', array('deleted', 'modified', 'created', 'sent', 'paid'));
   }
}
?>
