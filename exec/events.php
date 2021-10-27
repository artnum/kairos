<?php
require('wesrv/lib/srv.php');
require('wesrv/lib/msg.php');
require('../conf/wesrv.php');

(new \wesrv\srv(WESRV_IP, WESRV_PORT, WESRV_IP, WESRV_PORT, WESRV_KEY, WESRV_BACKLOG))->run();