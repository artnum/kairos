<?php

namespace Kairos;

class KObject {
    protected $data;

    function __construct(array $data) {
        $this->data = $data;
    }

    private function _getArrayString (array $array):array {
        $out = [];
        foreach ($array as $entry) {
            switch(gettype($entry)) {
                case 'array':
                    $out = array_merge($out, $this->_getArrayString($entry));
                    break;
                case 'string': $out[] = $entry; break;
                case 'integer':
                case 'double':
                    $out[] = strval($entry);
                    break;
                case 'boolean':
                    $out[] = $entry ? '1' : '0';
                    break;
                default: break;
            }

        }
        return $out;
    }

    function getMultiString (string $name):array {
        $data = $this->get($name);
        if ($data === null) { return []; }
        if (gettype($data) !== 'array') {
            return [ $this->getString($name) ];
        }
        return $this->_getArrayString($data);
    }

    function getString (string $name):string {
        $data = $this->get($name);
        if ($data === null) { return ''; }
        do {
            switch (gettype($data)) {
                case 'string': return $data;
                case 'integer':
                case 'double':
                    return strval($data);
                case 'array':
                    $data = current($data);
                    break;
                case 'boolean':
                    return $data ? '1' : '0';
                default: return '';    
            }
        } while (true);
    }

    function get(string $name) {
        if (!isset($this->data[$name])) { return null; }
        return $this->data[$name];
    }

    function has(string $name):bool {
        return isset($this->data[$name]);
    }

    function hasAny(string ...$names):bool {
        foreach ($names as $name) {
            if ($this->has($name)) { return true; }
        }
        return false;
    }
}