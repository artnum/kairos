<?php
require('wesrv/lib/client.php');
require('conf/wesrv.php');

(new \wesrv\client())->run(WESERV_IP, WESRV_PORT, WESRV_KEY);