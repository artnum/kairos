<?PHP

class CommentsModel extends artnum\SQL {
   protected $kconf;
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'comments', 'comments_id', []);
      $this->conf('auto-increment', true);
   }
}

?>
