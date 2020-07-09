<?PHP
class MissionModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'mission', 'mission_uid', $config);
      $this->conf('auto-increment', true);
   }
}
?>
