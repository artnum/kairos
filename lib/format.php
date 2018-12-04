<?PHP
/* Set of function to format data from Json to PHP */
function FReservation($reservation) {
   foreach(array('created', 'deleted', 'modification') as $k) {
      if (isset($reservation[$k])) {
         if (!is_null($reservation[$k]) && !empty($reservation[$k])) {
            try {
               $reservation[$k] = DateTime::createFromFormat('U', $reservation[$k]);
               $reservation[$k]->setTimeZone(new DateTimeZone(date_default_timezone_get()));
            } catch (Exception $e) {
               $reservation[$k] = null;
               error_log('Exception caught : ' . $e->getMessage());
            }
         } else {
            $reservation[$k] = null;
         }
      }
   }

   foreach (array('deliveryBegin', 'begin', 'deliveryEnd', 'end') as $k) {
      if (isset($reservation[$k])) {
         if (!is_null($reservation[$k]) && !empty($reservation[$k])) {
            try {
               $reservation[$k] = new DateTime($reservation[$k]);
               $reservation[$k]->setTimeZone(new DateTimeZone(date_default_timezone_get()));
            } catch (Exception $e) {
               $reservation[$k] = null;
               error_log('Exception caught : ' . $e->getMessage());
            }
         } else {
            $reservation[$k] = null;
         }
      } else {
            $reservation[$k] = null;
      }
   }

   return $reservation;
}

function fprice(float $price) {
   if ($price - (intval($price)) > 0) {
      $p = number_format($price, 2, '.', ' ');
   } else {
      $p = number_format($price, 0, '.', ' ') . '.–';
   }
   return $p;
}

function ffloat(float $value) {
   if ($value - (intval($value)) > 0) {
      $p = number_format($value, 2, '.', ' ');
   } else {
      $p = number_format($value, 0, '.', ' ');
   }
   return $p;
}

function flat_text($txt) {
   $txt = explode("\n", $txt);
   $new_txt = array();
   foreach($txt as $t) {
      $_t = trim($t);
      if (!empty($_t)) {
         $new_txt[] = $_t;
      }
   }
   return join(", ", $new_txt);
}
?>
