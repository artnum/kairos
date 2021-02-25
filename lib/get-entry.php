<?PHP 
include('artnum/autoload.php');
require_once('url.php');

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

class LDAPGetEntry {
    function __construct($kconf, $ldap = null) {
        $this->ldap = $ldap;
        $this->kconf = $kconf;
    }

    function setLdap($ldap) {
        $this->ldap = $ldap;
    }

    function getMachine($id) {
        $search = ldap_search(
            $this->ldap,
            $this->kconf->get('trees.machines'), 
            sprintf('(&(objectclass=machine)(|(airref=%s)(description=%s)))', $id, $id),
            ['description', 'cn', 'family', 'airaltref', 'type', 'state', 'floorheight', 'workheight', 'height', 'airref']);
        if (!$search) { return NULL; }
        if (ldap_count_entries($this->ldap, $search) === 0) { return NULL; }
        $entry = ldap_first_entry($this->ldap, $search);
        if (!$entry) { return NULL; }
        $content = ldap_get_attributes($this->ldap, $entry);
        if (!isset($content['airRef']) || $content['airRef']['count'] <= 0) { return NULL; }
        return $content['airRef'][0];
    }
}

?>