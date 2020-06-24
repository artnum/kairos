SET SQL_MODE=ANSI_QUOTES;
CREATE TABLE IF NOT EXISTS "evenement" (
       "evenement_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "evenement_reservation" INTEGER DEFAULT NULL,
       "evenement_type" CHAR(32) DEFAULT NULL,
       "evenement_comment" TEXT,
       "evenement_date" CHAR(32) NOT NULL, -- ISO8601
       "evenement_duration" INTEGER DEFAULT 0, -- in seconds
       "evenement_technician" CHAR(64) DEFAULT NULL,
       "evenement_target" CHAR(32) DEFAULT NULL,
       "evenement_previous" INTEGER DEFAULT NULL,
       FOREIGN KEY ("evenement_reservation") REFERENCES "reservation"("reservation_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY ("evenement_previous") REFERENCES "evenement"("evenement_id") ON UPDATE CASCADE ON DELETE CASCADE
) CHARACTER SET "utf8mb4";
CREATE INDEX "idxEvenementPrevious" ON "evenement"("evenement_previous");
CREATE INDEX "idxEvenementReservation" ON "evenement"("evenement_reservation");


INSERT INTO "evenement" ("evenement_id", "evenement_reservation", "evenement_type", "evenement_comment", "evenement_date", "evenement_duration", "evenement_technician") SELECT "intervention_id", "intervention_reservation", "intervention_type", "intervention_comment", "intervention_date", "intervention_duration", "intervention_technician" FROM "intervention";
