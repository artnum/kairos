<?PHP
class MissionModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'mission', 'mission_uid', []);
      $this->conf('auto-increment', true);
   }
}
?>
