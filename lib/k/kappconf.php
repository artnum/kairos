<?php
class KAppConf {
    function __construct($path = '../../conf/app.json') {
        $this->conf = json_decode(file_get_contents($path), true)['KAIROS'];
    }

    function get($name) {
        $tree = explode('.', $name);
        $conf = $this->conf;
        while (($attr = array_shift($tree)) !== null) {
            if (isset($conf[$attr])) { $conf = $conf[$attr]; }
            else { return null; }
        }
        if (is_string($conf)) {
            preg_match_all('/%([a-zA-Z]*)%/m', $conf, $matches, PREG_SET_ORDER, 0);
            for ($i = 0; $i < count($matches); $i++) {
                switch($matches[$i][1]) {
                    default: break;
                    case 'KBASE': 
                        $conf = str_replace('//', '/', str_replace('%KBASE%', '%KSERVER%/' . $this->get('base'), $conf)); 
                        $conf = str_replace('//', '/', str_replace('%KSERVER%', '%KPROTO%' . $_SERVER['SERVER_NAME'], $conf));
                        if (!empty($_SERVER['HTTPS'])) {
                            $conf = str_replace('%KPROTO%', 'https://', $conf);
                        } else {
                            $conf = str_replace('%KPROTO%', 'http://', $conf);
                        }
                        break;
                    case 'KBASENAME': $conf = str_replace('%KBASENAME%', str_replace('/', '', $this->get('base')), $conf); break;
                    case 'KSERVER': 
                        $conf = str_replace('//', '/', str_replace('%KSERVER%', '%KPROTO%' . $_SERVER['SERVER_NAME'], $conf));
                        if (!empty($_SERVER['HTTPS'])) {
                            $conf = str_replace('%KPROTO%', 'https://', $conf);
                        } else {
                            $conf = str_replace('%KPROTO%', 'http://', $conf);
                        }
                        break; 
                }
            }
        }
        return $conf;
    }
}