<?php

class KObject {
    public $type;
    public $lastChange;

    function __construct($conf, $type, $data) {
        $this->conf = $conf;
        $this->type = $type;
        $this->data = [];

        foreach ($data as $k => $v) {
            $this->set($k, $v);
        }
    }

    function set ($name, $value) {
        $this->lastChange = (new DateTime())->getTimestamp() * 1000;
        $this->data[$name] = $value;
        return $value;
    }

    function get ($name) {
        if (empty($name)) { return ''; }
        if ($name === 'cn') { return $this->getCn(); }
        if ($name === 'last-change') { return $this->lastChange; }

        $storeName = $this->conf->get('stores.' . $this->type . '.' . $name . '.remote');
        if ($storeName !== null) { return isset($this->data[$storeName]) ? $this->data[$storeName] : ''; }
        return isset($this->data[$name]) ? $this->data[$name] : '';
    }

    function getCn () {

    }

    function variables ($txt) {
        preg_match_all('/(?<!\\)\${([a-zA-Z0-9.]*)}/gm', $txt, $matches, PREG_SET_ORDER);
        
    }

    function has($name) {
        return isset($this->data[$name]);
    }
}