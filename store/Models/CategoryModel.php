<?php
class CategoryModel extends artnum\LDAP {
  protected $kconf;
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct(
      $db,
      $this->kconf->get('trees.categories'),
      null, // all attribute
      []);
  }

  function set_db($dbs) {
    if (!isset($dbs['ldap'])) {
      throw new Exception('Database not configured');
    }
    $this->DB = $dbs['ldap'];
  }

    function dbtype() {
        return ['ldap'];
    }

  function getCacheOpts() {
    /* 15min cache for machine */
    return ['age' => 900, 'public' => true];
  }
}