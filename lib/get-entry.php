<?PHP 
include('artnum/autoload.php');
include('url.php');

class GetEntry {
    function __construct() {
        $this->jclient = new artnum\JRestClient(base_url('/store'));    
    }

    function getMachine ($id) {
        $res = $this->jclient->get($id, 'Machine'); 
        $machine = null;
        if($res['length'] > 0) {
            $machine = !isset($res['data']['IDent']) ? $res['data'][0] : $res['data'];
        }
        if (!$machine) { return $machine; }
        $machine['_id'] = [];
        foreach(['description', 'airaltref', 'reference', 'oldid'] as $k) {
            if (!isset($machine[$k])) { continue; }
            if (is_array($machine[$k])) {
                foreach ($machine[$k] as $_k => $v) {
                    $machine[$k][$_k] = strval($v);
                    $machine['_id'][] = $machine[$k][$_k];
                }
            } else {
                $machine[$k] = strval($machine[$k]);
                $machine['_id'][] = $machine[$k];
            }
        }
        return $machine;
    }
}
?>