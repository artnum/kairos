<?php

class RallocationModel extends artnum\SQL {
    protected $kconf;
    function __construct($db, $config) {
       $this->kconf = $config;
       parent::__construct($db, 'rallocation', 'rallocation_id', []);
       $this->conf('auto-increment', true);
    }
 }