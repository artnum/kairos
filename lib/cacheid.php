<?PHP
class CacheID {
    function __construct() {
        $this->mcache = new Memcache();
        $this->mcache->connect('localhost', 11211);
    }

    function get ($rid) {
        if ($this->mcache->get($rid) === FALSE) {
            return 0;
        } else {
            return 1;
        }
    }

    function set ($rid, $duration) {
        $this->mcache->set($rid, 1, 0, $duration);
    }
}
?>