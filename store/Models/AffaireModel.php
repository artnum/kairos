<?php
class AffaireModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'affaire', 'affaire_uid', []);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'affaire_modified');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'affaire_deleted');
      $this->conf('delete.ts', true); 
      $this->conf('create', 'affaire_created');
      $this->conf('create.ts', true);
   }
}
?>
