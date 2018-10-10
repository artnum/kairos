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
            $reservations[$k] = null;
         }
      }
   }

   return $reservation;
}
?>
