<?PHP
$db = 'location.sqlite';
if (isset($argv[1])) {
   $db = $argv[1];
}
$db = new SQLite3($db);
$tables = array (
   'status' => array(
      'status_id' => SQLITE3_INTEGER,
      'status_color' => SQLITE3_TEXT,
      'status_default' => SQLITE3_INTEGER,
      'status_type' => SQLITE3_INTEGER),
   'contacts' => array(
      'contacts_id' => SQLITE3_INTEGER,
      'contacts_reservation' => SQLITE3_INTEGER,
      'contacts_target' => SQLITE3_TEXT,
      'contacts_comment' => SQLITE3_TEXT,
      'contacts_freeform' => SQLITE3_TEXT),
   'reservation' => array(
      'reservation_id' => SQLITE3_INTEGER,
      'reservation_begin' => SQLITE3_TEXT,
      'reservation_end' => SQLITE3_TEXT,
      'reservation_target' => SQLITE3_TEXT,
      'reservation_status' => SQLITE3_INTEGER,
      'reservation_address' => SQLITE3_TEXT,
      'reservation_locality' => SQLITE3_TEXT,
      'reservation_contact' => SQLITE3_TEXT,
      'reservation_comment' => SQLITE3_TEXT,
      'reservation_deliveryBegin' => SQLITE3_TEXT,
      'reservation_deliveryEnd' => SQLITE3_TEXT,
      'reservation_special' => SQLITE3_INTEGER,
      'reservation_closed' => SQLITE3_INTEGER,
      'reservation_reference' => SQLITE3_TEXT,
      'reservation_equipment' => SQLITE3_TEXT,
      'reservation_title' => SQLITE3_TEXT,
      'reservation_folder' => SQLITE3_TEXT,
      'reservation_gps' => SQLITE3_TEXT,
      'reservation_creator' => SQLITE3_TEXT,
      'reservation_previous' => SQLITE3_TEXT,
      'reservation_warehouse' => SQLITE3_TEXT,
      'reservation_note' => SQLITE3_TEXT,
      'reservation_created' => SQLITE3_INTEGER,
      'reservation_modification' => SQLITE3_INTEGER,
      'reservation_deleted' => SQLITE3_INTEGER),
   'user' => array(
      'user_id' => SQLITE3_INTEGER),
   'association' => array(
      'association_id' => SQLITE3_INTEGER,
      'association_number' => SQLITE3_INTEGER,
      'associattion_follow' => SQLITE3_INTEGER),
   'warehouse' => array(
      'warehouse_id' => SQLITE3_INTEGER),
   'tags' => array(),
   'extendedReservation' => array(
      'extendedReservation_id' => SQLITE3_INTEGER,
      'extendedReservation_reservation' => SQLITE3_INTEGER),
   'arrival' => array(
      'arrival_id' => SQLITE3_INTEGER,
      'arrivat_target' => SQLITE3_INTEGER,
      'arrival_created' => SQLITE3_INTEGER,
      'arrival_deleted' => SQLITE3_INTEGER,
      'arrival_modification' => SQLITE3_INTEGER),
   'invoice' => array(
      'invoice_id' => SQLITE3_INTEGER,
      'invoice_address' => SQLITE3_INTEGER,
      'invoice_created' => SQLITE3_INTEGER,
      'invoice_deleted' => SQLITE3_INTEGER,
      'invoice_modified' => SQLITE3_INTEGER),
   'countReservation' => array(
      'countReservation_id' => SQLITE3_INTEGER,
      'countReservation_count' => SQLITE3_INTEGER,
      'countReservation_reservation' => SQLITE3_INTEGER),
   'count' => array(
      'count_id' => SQLITE3_INTEGER,
      'count_invoice' => SQLITE3_INTEGER,
      'count_total' => SQLITE3_FLOAT,
      'count_deleted' => SQLITE3_INTEGER,
      'count_created' => SQLITE3_INTEGER,
      'count_modified' => SQLITE3_INTEGER),
   'centry' => array(
      'centry_id' => SQLITE3_INTEGER,
      'centry_count' => SQLITE3_INTEGER,
      'centry_article' => SQLITE3_INTEGER,
      'centry_price' => SQLITE3_FLOAT,
      'centry_quantity' => SQLITE3_FLOAT,
      'centry_unit' => SQLITE3_INTEGER,
      'centry_group' => SQLITE3_INTEGER,
      'centry_reservation' => SQLITE3_INTEGER),
   'unit' => array(
      'unit_id' => SQLITE3_INTEGER,
      'unit_collection' => SQLITE3_INTEGER,
      'unit_deleted' => SQLITE3_INTEGER,
      'unit_created' => SQLITE3_INTEGER,
      'unit_modified' => SQLITE3_INTEGER),
   'collection' => array(
      'collection_id' => SQLITE3_INTEGER,
      'collection_deleted' => SQLITE3_INTEGER,
      'collection_created' => SQLITE3_INTEGER,
      'collection_modified' => SQLITE3_INTEGER),
   'article' => array(
      'article_id' => SQLITE3_INTEGER,
      'article_price' => SQLITE3_FLOAT,
      'article_collection' => SQLITE3_INTEGER,
      'article_ucollection' => SQLITE3_INTEGER,
      'article_deleted' => SQLITE3_INTEGER,
      'article_created' => SQLITE3_INTEGER,
      'article_modified' => SQLITE3_INTEGER)
   );

foreach ($tables as $name => $content) {
   $stmt = $db->prepare('SELECT * FROM "' . $name . '"');
   $res = $stmt->execute();
   $first = true;
   $values = array();
   $qhead = '';
   while($res && ($row = $res->fetchArray(SQLITE3_ASSOC)) != FALSE) {
      $v = array();
      $qhead = array();
      $keepRow = true;
      foreach ($row as $k => $value) {
         $col = true;
         if (empty($value)) {
            $col = false;
         }
         $type = SQLITE3_TEXT;
         if (isset($content[$k])) {
            $type = $content[$k];
         }
         if ($col) {
            switch($type) {
            default:
            case SQLITE3_TEXT: case SQLITE3_BLOB:
               $v[] = '\'' . str_replace('\'', '\\\'', $value) . '\''; break;
            case SQLITE3_INTEGER: case SQLITE3_FLOAT:
               if (!is_numeric($value)) { $keepRow = false; } // sqlite allow to violate datatype
               $v[] = $value; 
               break;
            case SQLITE3_NULL:
               $v[] = 'NULL'; break;
            }
         }
         if ($col) {
            $qhead[] = '"' . $k . '"';
         }
      }
      $q = 'INSERT INTO "' . $name . '" (' . implode(',', $qhead) . ') VALUES (' . implode(',', $v) . ');' . PHP_EOL;
      if ($keepRow) {    
         echo $q;
      } else {
         fprintf(STDERR, 'Drop row => %s', $q);
      }
      $first = FALSE;
   }
}
?>
