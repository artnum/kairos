<?PHP

class EventsController extends artnum\HTTPController {

   function postAction ($req) {
      return array('succes' => true, 'id' => 0);
   }

   function deleteAction($req) {
      return array('succes' => true, 'msg' => '');
   }

   function putAction($req) {
      return array('succes' => true, 'id' => 0);
   }

   function getAction($req) {
      if($req->onCollection()) {
         return $this->Model->last();
      } else {
         $sleepTime = 3;
         if( ! set_time_limit(60)) {
            $sleepTime = floor(ini_get('maximum_execution_time') / 20);
            if($sleepTime <= 0) { $sleepTime = 1; }
         }

         $i = 0;
         do {
            $res = $this->Model->read($req->getItem());
            sleep($sleepTime);
         } while(count($res) == 0 || $i > 10);
      }
   }
}

?>
