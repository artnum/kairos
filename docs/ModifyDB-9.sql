SET SQL_MODE=ANSI_QUOTES;

CREATE TABLE IF NOT EXISTS "affaire" (
    "affaire_uid" INTEGER PRIMARY KEY AUTO_INCREMENT,
    "affaire_created" INTEGER DEFAULT 0, -- unix ts
    "affaire_deleted" INTEGER DEFAULT 0, -- unix ts
    "affaire_modified" INTEGER DEFAULT 0 -- unix ts
) CHARACTER SET "utf8mb4";

ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "reservation_affaire" INTEGER DEFAULT NULL;
ALTER TABLE "reservation" ADD CONSTRAINT "fkReservationAffaire" FOREIGN KEY("reservation_affaire") REFERENCES "affaire"("affaire_uid") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "reservation" ADD INDEX IF NOT EXISTS "idxReservationAffaire" ("reservation_affaire");