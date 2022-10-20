<?php

require('kfetch.php');
require('kobject.php');
require('kappconf.php');
class KStore {
    function __construct($conf, $type, $bindQuery = [], $auth = null) {
        $this->type = $type;
        $this->conf = $conf;
        $this->url = $conf->get('stores.' . $type . '.store');
        $this->bindedQuery = null;
        if (!empty($bindQuery)) {
            $this->bindedQuery = $bindQuery;
        }
        $this->auth = $auth;
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
        $options = ['method' => 'POST', 'body' => $query];
        if ($this->auth) {
            $options['headers'] = ['Authorization' => $this->auth];
        }
        $response = kfetch($this->url . '/_query', $options);
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
        $options = [];
        if ($this->auth) {
            $options['headers'] = ['Authorization' => $this->auth];
        }
        $response = kfetch($this->url . '/' . $id, $options);
        if (!$response->ok) { return null; }
        $result = $response->json();
        if (intval($result['length']) <= 0) { return null; }
        return new KObject($this->conf, $this->type, is_array($result['data']) ? $result['data'][0] : $result['data']);
        
        return null;
    }
}