<?php
require('wesrv/lib/client.php');
require('../conf/wesrv.php');

(new \wesrv\client(WESRV_IP, WESRV_PORT, WESRV_KEY))->watch();