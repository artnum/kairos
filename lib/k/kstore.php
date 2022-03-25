<?php

require('kfetch.php');
require('kobject.php');
require('kappconf.php');
class KStore {
    function __construct($conf, $type, $bindQuery = []) {
        $this->type = $type;
        $this->conf = $conf;
        $this->url = $conf->get('stores.' . $type . '.store');
        $this->bindedQuery = null;
        if (!empty($bindQuery)) {
            $this->bindedQuery = $bindQuery;
        }
    }

    function query ($query, &$outQuery = null) {
        if ($this->bindedQuery) {
            $originalQuery = $query;
            $query = ['#and' => []];
            foreach($originalQuery as $k => $v) {
                $query['#and'][$k] = $v;
            }
            foreach ($this->bindedQuery as $k => $v) {
                $query['#and'][$k] = $v;
            }
        }
        $outQuery = $query;
        $response = kfetch($this->url . '/_query', ['method' => 'POST', 'body' => $query]);
        if (!$response->ok) { return []; }
        $result = $response->json();
        if (intval($result['length']) <= 0) { return []; }
        $objects = [];
        $data = is_array($result['data']) ? $result['data'] : [$result['data']];
        foreach ($data as $object) {
            $objects[] = new KObject($this->conf, $this->type, $object);
        }
        return $objects;
    }

    function get($id) {
        if (!$id) { return null; }
        $id = strval($id);
        if (strpos($id, '/') !== -1) {
            $id = explode('/', $id);
            $id = array_pop($id);
        }
        $response = kfetch($this->url . '/' . $id);
        if (!$response->ok) { return null; }
        $result = $response->json();
        if (intval($result['length']) <= 0) { return null; }
        return new KObject($this->conf, $this->type, is_array($result['data']) ? $result['data'][0] : $result['data']);
        
        return null;
    }
}