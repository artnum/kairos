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
      return sprintf('%.2F', $price);
   } else {
      return sprintf('%d.–', intval($price));
   }
}

function ffloat(float $value) {
   if ($value - (intval($value)) > 0) {
      return sprintf('%.2F', $value);
   } else {
      return sprintf('%d', intval($value));
   }
}

function flat_text($txt) {
   $txt = explode("\n", $txt);
   $new_txt = array();
   foreach($txt as $t) {
      if (!empty(trim($t))) {
         $new_txt[] = trim($t);
      }
   }
   return join(", ", $new_txt);
}
?>
