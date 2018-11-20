<?PHP
class ArticleModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'article', 'article_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('mtime', 'article_modified');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'article_deleted');
      $this->conf('delete.ts', true); 
      $this->conf('create', 'article_created');
      $this->conf('create.ts', true); 

      $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "collection" ON "\\Table"."article_collection" = "collection"."collection_id" WHERE "\\IDName" = :id');
   }
}
?>
