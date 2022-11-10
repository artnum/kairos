<?PHP
class CountReservationModel extends artnum\SQL {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'countReservation', 'countReservation_id', []);
    $this->conf('auto-increment', true);
    $this->set_req('get', 'SELECT * from "\\Table" LEFT JOIN "count" ON "\\Table"."countReservation_count" = "count"."count_id"');
  }

  function _write($data, &$id = NULL)
   {
      global $MSGSrv;
      $result = parent::_write($data, $id);
      $item = $result->getItem(0);
      if ($item !== null) {
         $MSGSrv->send(json_encode([
            'operation' => 'write',
            'type' => 'count',
            'id' => $item['id'],
            'cid' => $this->kconf->getVar('clientid')
         ]));
      }
      return $result;
   }

   function _delete(&$id) {
      global $MSGSrv;
      $result = parent::_delete($id);
      $item = $result->getItem(0);
      if ($item !== false) {
         $MSGSrv->send(json_encode([
            'operation' => 'delete',
            'type' => 'count',
            'cid' => $this->kconf->getVar('clientid'),
            'id' => array_keys($item)[0]
         ]));
      }
      return $result;
   }
}
?>
