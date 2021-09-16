<?PHP
class ReservationContactModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'contacts', 'contacts_id', []);
      $this->conf('auto-increment', true);
      $this->conf('force-type', array(
         'contacts_target' => 'string',
         'contacts_comment' => 'string',
         'contacts_freeform' => 'string'
      ));
   }

   function _write($data, $id = NULL) {
      global $MSGSrv;

      if (!empty($data['target'])) {
         if ($data['target'][0] !== '/') { $data['target'] = '/' . $data['target']; }
      }

      $result = parent::_write($data, $id);
      $item = $result->getItem(0);
      if ($item !== null) {
      $MSGSrv->send(json_encode([
            'operation' => 'write',
            'type' => 'contact',
            'id' => $item['id']
         ]));
      }

      return $result;
   }

   function _delete($id) {
      global $MSGSrv;
      $oldEntry = $this->_read($id);
      $result = parent::_delete($id);
      $item = $oldEntry->getItem(0);
      if ($item !== null) {
         if ($item['reservation']) {
            $MSGSrv->send(json_encode([
               'operation' => 'delete',
               'type' => 'contact',
               'reservation' => $item['reservation'],
               'id' => $item['id']
            ]));
         }
      }
      return $result;
   }
}
?>