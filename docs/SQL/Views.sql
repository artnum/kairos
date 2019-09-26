--- Views
SET SQL_MODE=ANSI_QUOTES;

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
         MAX("count_end")
	FROM "reservation"
	     LEFT JOIN "countReservation" ON "countReservation_reservation" = "reservation_id"
	     LEFT JOIN "count" on "countReservation_count" = "count_id"
	     LEFT JOIN "arrival" ON "arrival_target" = "reservation_id"
	     LEFT JOIN "user" AS "creator" ON "creator"."user_id" = REVERSE(SUBSTR(REVERSE("reservation"."reservation_creator"), 1, LOCATE('/', REVERSE("reservation"."reservation_creator")) - 1))
	     LEFT JOIN "user" AS "technician" ON "technician"."user_id" = REVERSE(SUBSTR(REVERSE("reservation"."reservation_technician"), 1, LOCATE('/', REVERSE("reservation"."reservation_technician")) - 1))
	     LEFT JOIN (SELECT * FROM "contacts" WHERE "contacts_comment" = '_client' GROUP BY "contacts_reservation") AS contact ON "reservation_id" = "contact"."contacts_reservation"
	WHERE "reservation_deleted" IS NULL AND "reservation_closed" IS NULL AND ("count_state" != 'FINAL' OR "countReservation_id" IS NULL)
	GROUP BY "reservation_id"
