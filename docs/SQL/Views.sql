
SET SQL_MODE=ANSI_QUOTES;

DROP VIEW IF EXISTS "firstContactClient";
CREATE VIEW "firstContactClient" AS
       SELECT * FROM "contacts" WHERE "contacts_comment" = '_client' GROUP BY "contacts_reservation";

DROP VIEW IF EXISTS "reservationWithFinalCount";
CREATE VIEW "reservationWithFinalCount" AS
       SELECT "countReservation_reservation" FROM "count"
       	      LEFT JOIN "countReservation" ON "count_id" = "countReservation_count"
       WHERE "count_state" = 'FINAL'
       GROUP BY "countReservation_reservation";

DROP VIEW IF EXISTS "uncounted";
CREATE VIEW "uncounted" AS
       SELECT
         "arrival".*,
         "reservation".*,
         "count".*,
	 "contact".*,
         "creator"."user_name" AS "creator_name",
         "creator"."user_phone" AS "creator_phone",
         "technician"."user_name" AS "technician_name",
         "technician"."user_phone" AS "technician_phone",
	 MAX("count"."count_end") AS "lastcount"
	FROM "reservation"
	     LEFT JOIN "countReservation" ON "countReservation_reservation" = "reservation_id"
	     LEFT JOIN "count" on "countReservation_count" = "count_id"
	     LEFT JOIN "arrival" ON "arrival_target" = "reservation_id"
	     LEFT JOIN "user" AS "creator" ON "creator"."user_id" = REVERSE(SUBSTR(REVERSE("reservation"."reservation_creator"), 1, LOCATE('/', REVERSE("reservation"."reservation_creator")) - 1))
	     LEFT JOIN "user" AS "technician" ON "technician"."user_id" = REVERSE(SUBSTR(REVERSE("reservation"."reservation_technician"), 1, LOCATE('/', REVERSE("reservation"."reservation_technician")) - 1))
	     LEFT JOIN "firstContactClient" AS contact ON "reservation_id" = "contact"."contacts_reservation"
	WHERE "reservation_deleted" IS NULL AND "reservation_closed" IS NULL AND NOT EXISTS (SELECT 1 FROM reservationWithFinalCount WHERE countReservation_reservation = reservation_id)
	GROUP BY "reservation_id";
