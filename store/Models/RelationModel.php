<?php
class RelationModel extends artnum\SQL
{
    protected $kconf;

    function __construct($db, $config)
    {
        $this->kconf = $config;
        parent::__construct($db, 'relation', 'relation_id', []);
    }
}
