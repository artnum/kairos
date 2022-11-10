<?PHP
class ArrivalModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'arrival', 'arrival_id', []);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'arrival_modification');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'arrival_deleted');
      $this->conf('delete.ts', true); 
      $this->conf('create', 'arrival_created');
      $this->conf('create.ts', true); 
      $this->conf('datetime', array('reported', 'inprogress', 'done'));
   }

   function _write($data, &$id = NULL) {
      global $MSGSrv;
      $result = parent::_write($data, $id);
      $id = $result->getItem(0);
      if ($id !== null) {
         $MSGSrv->send(json_encode([
            'operation' => 'write',
            'type' => 'arrival',
            'cid' => $this->kconf->getVar('clientid'),
            'id' => $id['id']
         ]));
      }
      return $result;
   }

   function _delete(&$id) {
      global $MSGSrv;
      $result = parent::_delete($id);
      $item = $result->getItem(0);
      if ($item !== null) {
         if ($item[$id]) {
            $MSGSrv->send(json_encode([
               'operation' => 'delete',
               'type' => 'arrival',
               'cid' => $this->kconf->getVar('clientid'),
               'id' => $id
            ]));
         }
      }
      return $result;
   }
}
?>
