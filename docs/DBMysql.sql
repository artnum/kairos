/* MySQL schema */
SET SQL_MODE=ANSI_QUOTES;
CREATE DATABASE IF NOT EXISTS "kairos" CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci";
USE "kairos";

CREATE TABLE IF NOT EXISTS "status" (
		"status_id" SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
		"status_name" CHAR(60) DEFAULT '',
		"status_description" VARCHAR(200) DEFAULT '',
		"status_color" CHAR(8) DEFAULT '',
		"status_bgcolor" CHAR(8) DEFAULT '',
		"status_default" BOOL,
		"status_type" INTEGER DEFAULT 0, -- kind of object it apply
		"status_symbol" CHAR(16) DEFAULT NULL
) CHARACTER SET "utf8mb4";

CREATE TABLE `status` (
  `status_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `status_name` char(60) DEFAULT '',
  `status_description` varchar(200) DEFAULT '',
  `status_color` char(8) DEFAULT '',
  `status_bgcolor` char(8) DEFAULT '',
  `status_default` tinyint(1) DEFAULT NULL,
  `status_type` int(11) DEFAULT 0,
  `status_symbol` char(64) DEFAULT NULL,
  `status_group` varchar(60) DEFAULT '',
  `status_order` int(10) unsigned DEFAULT 0,
  `status_deleted` int(10) unsigned DEFAULT 0,
   PRIMARY KEY (`status_id`)
)CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "contacts" 		(
	"contacts_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"contacts_reservation" INTEGER,
	"contacts_target" CHAR(120),
	"contacts_comment" TEXT,
	"contacts_freeform" CHAR(1) DEFAULT NULL -- not used anymore but some code rely on it being present
) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "reservation" (
	"reservation_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"reservation_uuid" CHAR(36) NOT NULL,
	"reservation_begin" CHAR(32) NOT NULL DEFAULT '', -- ISO8601 datetime
	"reservation_end" CHAR(32) NOT NULL DEFAULT '', -- ISO8601 datetime
	"reservation_target" CHAR(36) NOT NULL DEFAULT '',
	"reservation_status" SMALLINT UNSIGNED DEFAULT 0,
	"reservation_address" VARCHAR(250) DEFAULT '',
	"reservation_locality" CHAR(60) DEFAULT '',
	"reservation_contact" TEXT DEFAULT NULL,
	"reservation_comment" TEXT DEFAULT NULL,
	"reservation_deliveryBegin" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"reservation_deliveryEnd" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"reservation_special" INTEGER,
	"reservation_closed"  INTEGER DEFAULT NULL, -- unix ts
	"reservation_reference" TEXT DEFAULT NULL,
	"reservation_equipment" TEXT DEFAULT NULL,
	"reservation_title" TEXT DEFAULT NULL,
	"reservation_folder" TEXT DEFAULT NULL,
	"reservation_gps" TEXT DEFAULT NULL,
	"reservation_creator" CHAR(100) DEFAULT '',
	"reservation_technician" CHAR(100) DEFAULT '',
	"reservation_previous" TEXT DEFAULT NULL,
	"reservation_warehouse" CHAR(100) DEFAULT '',
	"reservation_note" TEXT DEFAULT NULL,
	"reservation_padlock" CHAR(10) DEFAULT '',
	"reservation_deliveryRemark" CHAR(100) DEFAULT '',
	"reservation_other" TEXT DEFAULT NULL, -- json data
	"reservation_created" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"reservation_deleted" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"reservation_modification" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"reservation_version" INT(10) UNSIGNED DEFAULT 1,
	"reservation_affaire" INT(10) UNSIGNED DEFAULT 0,
	"reservation_time" INT(10) UNSIGNED NOT NULL DEFAULT 0, -- effective time (a 24h work spans over 3 days, this would be set de 24 * 60 * 60 (seconds)) while end - begin would be much more than 24h.
	"reservation_locked" TINYINT UNSIGNED NOT NULL DEFAULT 0,
	"reservation_dbegin" CHAR(10) NOT NULL DEFAULT '',
	"reservation_dend" CHAR(10) NOT NULL DEFAULT ''
) CHARACTER SET "utf8mb4";
CREATE INDEX "reservationBeginIdx" ON "reservation"("reservation_begin"(32));
CREATE INDEX "reservationEndIdx" ON "reservation"("reservation_end"(32));
CREATE INDEX "reservationDeletedIdx" ON "reservation"("reservation_deleted");
CREATE INDEX "idxReservationModification" ON "reservation" ("reservation_modification");
CREATE INDEX "idxReservationTarget" ON "reservation" ("reservation_target");
CREATE INDEX "idxReservationDbegin" ON "reservation" ("reservation_dbegin");
CREATE INDEX "idxReservationDend" ON "reservation" ("reservation_dend");



CREATE TABLE IF NOT EXISTS "user" 		( 
	"user_id" SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"user_name" CHAR(60),
	"user_phone" CHAR(15) DEFAULT '',
	"user_color" CHAR(32) DEFAULT 'black',
	"user_function" CHAR(16) DEFAULT 'admin',
	"user_temporary" TINYINT UNSIGNED DEFAULT 0
) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "association"	( 
	"association_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"association_reservation" INTEGER UNSIGNED DEFAULT 0,
	"association_target" TEXT,
	"association_begin" VARCHAR(32), -- ISO8601 datetime
	"association_end" VARCHAR(32), -- ISO8601 datetime
	"association_comment" TEXT,
	"association_type" TEXT,
	"association_number" INTEGER DEFAULT 1,
	"association_follow" INTEGER DEFAULT 0,
	FOREIGN KEY("association_reservation") REFERENCES "reservation"("reservation_id") 
	ON UPDATE CASCADE
	ON DELETE CASCADE
) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "warehouse" (
	"warehouse_id" SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"warehouse_name" CHAR(60),
	"warehouse_color" CHAR(30) 
) CHARACTER SET "utf8mb4";


CREATE TABLE IF NOT EXISTS "tags" 		(
	"tags_value" VARCHAR(200),
	"tags_target" CHAR(60)
) CHARACTER SET "utf8mb4";
CREATE INDEX "tagsTargetIdx" ON "tags"("tags_target"(16)); -- target are reference which are, actually, up to 4 letters

CREATE TABLE IF NOT EXISTS "entry"		(
	"entry_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"entry_ref" CHAR(60), 
	"entry_name" CHAR(60),
	"entry_value" VARCHAR(200)
) CHARACTER SET "utf8mb4";
CREATE INDEX "entryRefIdx" ON "entry"("entry_ref"(16)); -- as tagsTargetIdx


-- this table is not used yet and might never be
CREATE TABLE IF NOT EXISTS "extendedReservation" ( "extendedReservation_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "extendedReservation_reservation" INTEGER,
						  "extendedReservation_name" CHAR(60),
						  "extendedReservation_content" TEXT
						) CHARACTER SET "utf8mb4";
-- Arrival progress
CREATE TABLE IF NOT EXISTS "arrival" (
	"arrival_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"arrival_target" INTEGER UNSIGNED,
	"arrival_reported" CHAR(32), -- ISO8601 datetime
	"arrival_done" CHAR(32), -- ISO8601 datetime
	"arrival_inprogress" CHAR(32), -- ISO8601 datetime
	"arrival_contact" TEXT,
	"arrival_where" TEXT,
	"arrival_comment" TEXT,
	"arrival_other" TEXT,
	"arrival_locality" TEXT,
	"arrival_creator" TEXT,
	"arrival_created"INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"arrival_deleted" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"arrival_modification" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	FOREIGN KEY("arrival_target") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE
        ) CHARACTER SET "utf8mb4";
CREATE INDEX "arrivalTargetIdx" ON "arrival"("arrival_target");

-- Invoices
CREATE TABLE IF NOT EXISTS "invoice" (
	"invoice_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"invoice_winbiz" VARCHAR(200) DEFAULT '', -- used to sync with an external invoicing software if any.
	"invoice_address" INTEGER UNSIGNED,
	"invoice_sent" CHAR(32) DEFAULT NULL, -- ISO8601
	"invoice_paid" CHAR(32) DEFAULT NULL, -- ISO8601
	"invoice_deleted" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"invoice_created" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"invoice_modified" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	FOREIGN KEY("invoice_address") REFERENCES "contacts"("contacts_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL
	) CHARACTER SET "utf8mb4";

-- Basis for invoice creation
CREATE TABLE IF NOT EXISTS "count" (
	"count_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"count_invoice" INTEGER UNSIGNED, 
	"count_status" SMALLINT UNSIGNED,
	"count_date" VARCHAR(32) NOT NULL, -- ISO8601 datetime
	"count_begin" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"count_end" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"count_total" FLOAT DEFAULT 0,
	"count_reference" TEXT DEFAULT NULL,
	"count_comment" TEXT,
	"count_state" ENUM('INTERMEDIATE', 'FINAL') DEFAULT 'INTERMEDIATE',
	"count_printed" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"count_deleted" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"count_created" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	"count_modified" INT(10) UNSIGNED DEFAULT NULL, -- unix ts
	FOREIGN KEY("count_invoice") REFERENCES "invoice"("invoice_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY("count_status") REFERENCES "status"("status_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE
	) CHARACTER SET "utf8mb4";

-- Associate reservation to count
CREATE TABLE IF NOT EXISTS "countReservation" (
	"countReservation_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"countReservation_count" INTEGER UNSIGNED  NOT NULL,
	"countReservation_reservation" INTEGER UNSIGNED  NOT NULL,
	FOREIGN KEY("countReservation_count") REFERENCES "count"("count_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY("countReservation_reservation") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE ) CHARACTER SET "utf8mb4";

-- Generic group to group things under a name
CREATE TABLE IF NOT EXISTS "collection" (
	"collection_id" SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"collection_name" TEXT NOT NULL,
	"collection_description" TEXT NULL,
	"collection_deleted" INTEGER DEFAULT NULL,
	"collection_created" INTEGER DEFAULT NULL,
	"collection_modified" INTEGER DEFAULT NULL
	) CHARACTER SET "utf8mb4";

-- Units ...
CREATE TABLE IF NOT EXISTS "unit" (
	"unit_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"unit_name" CHAR(60) NOT NULL,
	"unit_names" CHAR(60) DEFAULT NULL, -- plural of name
	"unit_collection" SMALLINT UNSIGNED,
	"unit_symbol" CHAR(8) DEFAULT NULL,
	"unit_deleted" INTEGER DEFAULT NULL,
	"unit_created" INTEGER DEFAULT NULL,
	"unit_modified" INTEGER DEFAULT NULL,
	"unit_default" INTEGER DEFAULT 0,
	FOREIGN KEY ("unit_collection") REFERENCES "collection"("collection_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL
	) CHARACTER SET "utf8mb4";

-- Articles 
CREATE TABLE IF NOT EXISTS "article" (
	"article_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"article_name" CHAR(60) NOT NULL,
	"article_names" CHAR(60) DEFAULT NULL, -- plural of name
	"article_price" FLOAT DEFAULT 0, -- default price
	"article_description" TEXT DEFAULT NULL,
	"article_collection" SMALLINT UNSIGNED,
	"article_ucollection" SMALLINT UNSIGNED, -- link to collection of unit to use for this article
	"article_deleted" INTEGER DEFAULT NULL,
	"article_created" INTEGER DEFAULT NULL,
	"article_modified" INTEGER DEFAULT NULL,
	FOREIGN KEY("article_collection") REFERENCES "collection"("collection_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	FOREIGN KEY("article_ucollection") REFERENCES "collection"("collection_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL
	) CHARACTER SET "utf8mb4";
-- Entries for count
CREATE TABLE IF NOT EXISTS "centry" (
	"centry_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"centry_count" INTEGER UNSIGNED,
	"centry_article" INTEGER UNSIGNED,
	"centry_reference" TEXT DEFAULT NULL,
	"centry_description" TEXT,
	"centry_price" FLOAT DEFAULT NULL,
	"centry_discount" FLOAT DEFAULT NULL, -- percent value
	"centry_quantity" FLOAT DEFAULT NULL,
	"centry_total" FLOAT DEFAULT NULL,
	"centry_unit" INTEGER UNSIGNED,
	"centry_group" INTEGER UNSIGNED,
	"centry_reservation" INTEGER UNSIGNED,
	FOREIGN KEY("centry_count") REFERENCES "count"("count_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY("centry_unit") REFERENCES "unit"("unit_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	FOREIGN KEY("centry_reservation") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	FOREIGN KEY ("centry_group") REFERENCES "centry"("centry_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY ("centry_article") REFERENCES "article"("article_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL ) CHARACTER SET "utf8mb4";

-- Files linked to reservation
CREATE TABLE IF NOT EXISTS "mission" (
       "mission_uid" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
       "mission_reservation" INTEGER UNSIGNED NOT NULL,
       FOREIGN KEY ("mission_reservation") REFERENCES "reservation"("reservation_id")
       	       ON UPDATE CASCADE ON DELETE CASCADE
) CHARACTER SET "utf8mb4";

-- CREATE TABLE IF NOT EXISTS "missionFichier" (
--        "missionFichier_uid" INTEGER PRIMARY KEY AUTO_INCREMENT,
--        "missionFichier_fichier" CHAR(40) NOT NULL,
--        "missionFichier_mission" INTEGER NOT NULL,
--        "missionFichier_order" INTEGER DEFAULT 0
-- ) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "missionFichier" (
       "missionFichier_fichier" CHAR(40),
       "missionFichier_mission" INTEGER UNSIGNED,
       "missionFichier_ordre" SMALLINT UNSIGNED DEFAULT 0,
       PRIMARY KEY("missionFichier_fichier", "missionFichier_mission")
) CHARACTER SET "utf8mb4";

--CREATE TABLE IF NOT EXISTS "intervention" (
--       "intervention_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
--       "intervention_reservation" INTEGER,
--       "intervention_type" TEXT DEFAULT NULL,
--       "intervention_comment" TEXT,
--       "intervention_date" VARCHAR(32) NOT NULL, -- ISO8601
--       "intervention_duration" INTEGER DEFAULT 0, -- in seconds
--       "intervention_technician" TEXT DEFAULT NULL,
--       FOREIGN KEY ("intervention_reservation") REFERENCES "reservation"("reservation_id") ON UPDATE CASCADE ON DELETE CASCADE
--) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "evenement" (
       "evenement_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
       "evenement_reservation" INTEGER UNSIGNED DEFAULT 0,
       "evenement_type" CHAR(32) DEFAULT NULL,
       "evenement_comment" TEXT,
       "evenement_date" CHAR(32) NOT NULL, -- ISO8601
       "evenement_duration" INTEGER DEFAULT 0, -- in seconds
       "evenement_technician" CHAR(64) DEFAULT NULL,
       "evenement_target" CHAR(32) DEFAULT NULL,
       "evenement_previous" INTEGER UNSIGNED DEFAULT NULL,
       "evenement_process" CHAR(32) DEFAULT '', -- for automatic process to add identifying information
       FOREIGN KEY ("evenement_reservation") REFERENCES "reservation"("reservation_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY ("evenement_previous") REFERENCES "evenement"("evenement_id") ON UPDATE CASCADE ON DELETE CASCADE
) CHARACTER SET "utf8mb4";
CREATE INDEX "idxEvenementPrevious" ON "evenement"("evenement_previous");
CREATE INDEX "idxEvenementReservation" ON "evenement"("evenement_reservation");

CREATE TABLE IF NOT EXISTS "histoire" (
       "histoire_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
       "histoire_object" INTEGER UNSIGNED NOT NULL,
       "histoire_type" ENUM('Reservation', 'Arrival', 'Association') NOT NULL,
       "histoire_date" CHAR(25) NOT NULL, -- iso8061 without ms
       "histoire_creator" SMALLINT UNSIGNED DEFAULT 0,
       "histoire_attribute" TEXT(1024) NOT NULL, -- attribute list
       "histoire_original" BLOB(4096) -- data (compressed)
       );

CREATE TABLE IF NOT EXISTS "localite" (
       "localite_uid" CHAR(32) PRIMARY KEY,
       "localite_state" CHAR(2) NOT NULL DEFAULT '',
       "localite_np" INT NOT NULL DEFAULT -1,
       "localite_npext" INT NOT NULL DEFAULT -1,
       "localite_part" BOOLEAN NOT NULL DEFAULT FALSE,
       "localite_name" CHAR(40) NOT NULL DEFAULT '',
       "localite_postname" CHAR(18) NOT NULL DEFAULT '',
       "localite_township" CHAR(24) NOT NULL DEFAULT '',
       "localite_tsid" INT NOT NULL DEFAULT -1,
       "localite_trname" CHAR(140) NOT NULL DEFAULT '',
       "localite_trtownship" CHAR(24) NOT NULL DEFAULT ''
       );
CREATE INDEX idxLocaliteName ON localite (localite_name);
CREATE INDEX idxLocaliteTownship ON localite (localite_township);
CREATE INDEX idxLocaliteNP ON localite (localite_np);

CREATE TABLE IF NOT EXISTS "fichier" (
       "fichier_id" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
       "fichier_name" CHAR(64) NOT NULL DEFAULT '',
       "fichier_hash" CHAR(50) NOT NULL UNIQUE,
       "fichier_size" INT UNSIGNED DEFAULT 0,
       "fichier_mime" CHAR(127) NOT NULL DEFAULT 'application/octet-stream'
       );
CREATE INDEX "idxHash" ON "fichier" ("fichier_hash");

CREATE FUNCTION IdFromURL(s TEXT) RETURNS CHAR(50) DETERMINISTIC RETURN REVERSE(SUBSTR(REVERSE(s), 1, LOCATE('/', REVERSE(s)) - 1));
CREATE FUNCTION IdFromURL2(s TEXT) RETURNS CHAR(250) DETERMINISTIC RETURN REVERSE(SUBSTR(REVERSE(s), 1, LOCATE('/', REVERSE(s)) - 1));

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

-- Tri par date de fin arrivant souvent
CREATE INDEX "idxCountEndDate" ON "count" ("count_end");

-- Un filtre venant souvent est de savoir l'état
CREATE INDEX "idxCountState" ON "count" ("count_state");

-- Avec deleted toujours utile
CREATE INDEX "idxReservationClosed" ON "reservation" ("reservation_closed");

-- Recherche par nom des contacts
CREATE INDEX "idxContactsTarget" ON "contacts" ("contacts_target"(32));

-- Recherche récurrentes par type (commentaire)
CREATE INDEX "idxContactsComment" ON "contacts" ("contacts_comment"(16));

-- Recherche récurrente par nom
CREATE INDEX "idxEntryName" ON "entry" ("entry_name"(32));


-- Relation between reservation
CREATE TABLE IF NOT EXISTS "relation" (
	"relation_id" INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	"relation_source" INTEGER UNSIGNED,
	"relation_closure" INTEGER UNSIGNED,
	"relation_name" CHAR(30) DEFAULT '',
	"relation_description" CHAR(200) DEFAULT '',
    FOREIGN KEY ("relation_source") REFERENCES "reservation"("reservation_id") ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY ("relation_closure") REFERENCES "reservation"("reservation_id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX "idxRelationSourceClosure" ON "relation" ("relation_source", "relation_closure");

CREATE TABLE IF NOT EXISTS "rallocation" (
	"rallocation_id" INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	"rallocation_target" INTEGER UNSIGNED NOT NULL,
	"rallocation_source" INTEGER UNSIGNED NOT NULL,
	"rallocation_type" CHAR(8) NOT NULL,
	"rallocation_date" CHAR(10) NOT NULL COMMENT 'date of allocation YYYY-MM-DD',
	"rallocation_hour" CHAR(5) DEFAULT NULL COMMENT 'hour of allocation, not necessary'
);