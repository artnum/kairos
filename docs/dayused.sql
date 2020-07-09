DROP FUNCTION IF EXISTS DaysBetween;
CREATE FUNCTION DaysBetween(aBegin TEXT, aEnd TEXT, aYear TEXT) RETURNS FLOAT
DETERMINISTIC RETURN
  TIMESTAMPDIFF(
    second,
    IF (
      TIMESTAMP(LEFT(aBegin, 19)) < TIMESTAMP(CONCAT(aYear, '-01-01T00:00:00')),
      TIMESTAMP(CONCAT(aYear, '-01-01T00:00:00')),
      TIMESTAMP(LEFT(aBegin, 19))
    ),
    IF (
      TIMESTAMP(LEFT(aEnd, 19)) > TIMESTAMP(CONCAT(aYear, '-12-31T23:59:59')),
      TIMESTAMP(CONCAT(aYear, '-12-31T23:59:59')),
      TIMESTAMP(LEFT(aEnd, 19))
    )
  ) / 86400;

SET @sYear = '2018';
SELECT
  reservation_target AS Machine,
  ROUND(SUM(DaysBetween(reservation_begin, reservation_end, @sYear)), 2) AS "Utilisation [j]",
  ROUND(SUM(DaysBetween(reservation_begin, reservation_end, @sYear)) * 100 /
    DaysBetween(
      CONCAT(@sYear, '-01-01T00:00:00'),
      CONCAT(@sYear, '-12-31T23:59:59'),
      @sYear
    ), 2) AS "Utilisation [%]",
  ROUND(
    SUM(
      IF(reservation_deliveryBegin IS NULL OR reservation_deliveryBegin = reservation_begin, 0,
        DaysBetween(reservation_deliveryBegin, reservation_begin, @sYear)) +
      IF(reservation_deliveryEnd IS NULL OR reservation_deliveryEnd = reservation_end, 0,
        DaysBetween(reservation_end, reservation_deliveryEnd, @sYear))
    ),
    2
  ) AS "Déplacement [j]",

  status_name AS "Status"
  FROM reservation
  JOIN status ON status_id = reservation_status
  WHERE
    LEFT(reservation_begin, 10) <= CONCAT(@sYear, '-12-31') AND
    LEFT(reservation_end, 10) >= CONCAT(@sYear, '-01-01') AND
    reservation_deleted IS NULL
  GROUP BY reservation_status, reservation_target
  ORDER BY reservation_target ASC;
/*
SELECT
  reservation_target AS Machine,
  ROUND(
    SUM(
      IF(reservation_deliveryBegin IS NULL OR reservation_deliveryBegin = reservation_begin, 0,
        DaysBetween(reservation_deliveryBegin, reservation_begin, @sYear)) +
      IF(reservation_deliveryEnd IS NULL OR reservation_deliveryEnd = reservation_end, 0,
        DaysBetween(reservation_end, reservation_deliveryEnd, @sYear))
    ),
    2
  ) AS "Déplacement [j]",
  status_name AS "Status"
  FROM reservation
  JOIN status ON status_id = reservation_status
  WHERE
    LEFT(reservation_begin, 10) <= CONCAT(@sYear, '-12-31') AND
    LEFT(reservation_end, 10) >= CONCAT(@sYear, '-01-01') AND
    reservation_status = (SELECT status_id FROM status WHERE status_name LIKE 'reserve') AND
    reservation_deleted IS NULL
   GROUP BY reservation_target
   ORDER BY reservation_target ASC;
  
*/
