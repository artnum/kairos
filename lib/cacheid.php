<?PHP
class CacheID {
    function __construct() {
        $this->mcache = new Memcached();
        $this->mcache->addServer('localhost', 11211);
    }

    function get ($rid) {
        if ($this->mcache->get($rid) === FALSE) {
            return 0;
        } else {
            return 1;
        }
    }

    function set ($rid, $duration) {
        $this->mcache->set($rid, 0, $duration);
    }
}
?>