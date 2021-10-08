<?php
require('wesrv/lib/srv.php');
require('wesrv/lib/msg.php');
require('../conf/wesrv.php');

(new \wesrv\srv(WESERV_IP, WESRV_PORT, WESERV_IP, WESRV_PORT, WESRV_KEY, WESRV_BACKLOG))->run();