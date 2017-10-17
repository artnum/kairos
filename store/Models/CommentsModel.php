<?PHP

class CommentsModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'comments', 'comments_id', $config);
      $this->conf('auto-increment', true);
   }
}

?>
