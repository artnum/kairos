/* MySQL schema */
SET SQL_MODE=ANSI_QUOTES;
CREATE DATABASE IF NOT EXISTS "location" CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci";
USE "location";

CREATE TABLE IF NOT EXISTS "status" 		( "status_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "status_name" TEXT,
						  "status_description" TEXT DEFAULT NULL,
						  "status_color" VARCHAR(8) DEFAULT NULL,
						  "status_bgcolor" VARCHAR(8) DEFAULT NULL,
						  "status_default" BOOL,
						  "status_type" INTEGER DEFAULT 0, -- kind of object it apply
						  "status_symbol" VARCHAR(16) DEFAULT NULL
						) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "contacts" 		( "contacts_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "contacts_reservation" INTEGER,
						  "contacts_target" TEXT,
						  "contacts_comment" TEXT,
						  "contacts_freeform" TEXT
						) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "reservation" (
	"reservation_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"reservation_begin" VARCHAR(32) NOT NULL, -- ISO8601 datetime
	"reservation_end" VARCHAR(32) NOT NULL, -- ISO8601 datetime
	"reservation_target" TEXT DEFAULT NULL,
	"reservation_status" INTEGER,
	"reservation_address" TEXT DEFAULT NULL,
	"reservation_locality" TEXT DEFAULT NULL,
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
	"reservation_creator" TEXT DEFAULT NULL,
	"reservation_technician" TEXT DEFAULT NULL,
	"reservation_previous" TEXT DEFAULT NULL,
	"reservation_warehouse" TEXT DEFAULT NULL,
	"reservation_note" TEXT DEFAULT NULL,
	"reservation_padlock" TEXT DEFAULT NULL,
	"reservation_other" TEXT DEFAULT NULL, -- json data
	"reservation_created" INTEGER DEFAULT NULL, -- unix ts
	"reservation_deleted" INTEGER DEFAULT NULL, -- unix ts
	"reservation_modification" INTEGER DEFAULT NULL -- unix ts
	) CHARACTER SET "utf8mb4";
CREATE INDEX "reservationBeginIdx" ON "reservation"("reservation_begin"(32));
CREATE INDEX "reservationEndIdx" ON "reservation"("reservation_end"(32));
CREATE INDEX "reservationDeletedIdx" ON "reservation"("reservation_deleted");

CREATE TABLE IF NOT EXISTS "user" 		( "user_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "user_name" TEXT,
						  "user_phone" VARCHAR(15) DEFAULT '',
						  "user_color" VARCHAR(32) DEFAULT 'black',
						  "user_function" VARCHAR(16) DEFAULT 'admin'
						) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "association"	( "association_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "association_reservation" INTEGER,
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

CREATE TABLE IF NOT EXISTS "warehouse"		( "warehouse_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "warehouse_name" TEXT,
						  "warehouse_color" TEXT ) CHARACTER SET "utf8mb4";


CREATE TABLE IF NOT EXISTS "tags" 		( "tags_value" TEXT,
						  "tags_target" TEXT
						) CHARACTER SET "utf8mb4";
CREATE INDEX "tagsTargetIdx" ON "tags"("tags_target"(16)); -- target are reference which are, actually, up to 4 letters

CREATE TABLE IF NOT EXISTS "entry"		( "entry_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "entry_ref" TEXT, 
						  "entry_name" TEXT,
						  "entry_value" TEXT
						) CHARACTER SET "utf8mb4";
CREATE INDEX "entryRefIdx" ON "entry"("entry_ref"(16)); -- as tagsTargetIdx


-- this table is not used yet and might never be
CREATE TABLE IF NOT EXISTS "extendedReservation" ( "extendedReservation_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
						  "extendedReservation_reservation" INTEGER,
						  "extendedReservation_name" TEXT,
						  "extendedReservation_content" TEXT
						) CHARACTER SET "utf8mb4";
-- Arrival progress
CREATE TABLE IF NOT EXISTS "arrival" (
	"arrival_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"arrival_target" INTEGER,
	"arrival_reported" VARCHAR(32), -- ISO8601 datetime
	"arrival_done" VARCHAR(32), -- ISO8601 datetime
	"arrival_inprogress" VARCHAR(32), -- ISO8601 datetime
	"arrival_contact" TEXT,
	"arrival_where" TEXT,
	"arrival_comment" TEXT,
	"arrival_other" TEXT,
	"arrival_locality" TEXT,
	"arrival_creator" TEXT,
	"arrival_created" INTEGER DEFAULT NULL, -- unix ts
	"arrival_deleted" INTEGER DEFAULT NULL, -- unix ts
	"arrival_modification" INTEGER DEFAULT NULL, -- unix ts
	FOREIGN KEY("arrival_target") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE
        ) CHARACTER SET "utf8mb4";
CREATE INDEX "arrivalTargetIdx" ON "arrival"("arrival_target");

-- Invoices
CREATE TABLE IF NOT EXISTS "invoice" (
	"invoice_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"invoice_winbiz" TEXT NULL, -- used to sync with an external invoicing software if any.
	"invoice_address" INTEGER NULL,
	"invoice_sent" VARCHAR(32) DEFAULT NULL, -- ISO8601
	"invoice_paid" VARCHAR(32) DEFAULT NULL, -- ISO8601
	"invoice_deleted" INTEGER DEFAULT NULL, -- unix ts
	"invoice_created" INTEGER DEFAULT NULL, -- unix ts
	"invoice_modified" INTEGER DEFAULT NULL, -- unix ts
	FOREIGN KEY("invoice_address") REFERENCES "contacts"("contacts_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL
	) CHARACTER SET "utf8mb4";

-- Basis for invoice creation
CREATE TABLE IF NOT EXISTS "count" (
	"count_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"count_invoice" INTEGER NULL,
	"count_status" INTEGER NULL,
	"count_date" VARCHAR(32) NOT NULL, -- ISO8601 datetime
	"count_begin" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"count_end" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"count_total" FLOAT DEFAULT 0,
	"count_reference" TEXT DEFAULT NULL,
	"count_comment" TEXT,
	"count_printed" VARCHAR(32) DEFAULT NULL, -- ISO8601 datetime
	"count_deleted" INTEGER DEFAULT NULL, -- unix ts
	"count_created" INTEGER DEFAULT NULL, -- unix ts
	"count_modified" INTEGER DEFAULT NULL, -- unix ts
	FOREIGN KEY("count_invoice") REFERENCES "invoice"("invoice_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY("count_status") REFERENCES "status"("status_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE
	) CHARACTER SET "utf8mb4";

-- Associate reservation to count
CREATE TABLE IF NOT EXISTS "countReservation" (
	"countReservation_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"countReservation_count" INTEGER NOT NULL,
	"countReservation_reservation" INTEGER NOT NULL,
	FOREIGN KEY("countReservation_count") REFERENCES "count"("count_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY("countReservation_reservation") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE ) CHARACTER SET "utf8mb4";

-- Generic group to group things under a name
CREATE TABLE IF NOT EXISTS "collection" (
	"collection_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"collection_name" TEXT NOT NULL,
	"collection_description" TEXT NULL,
	"collection_deleted" INTEGER DEFAULT NULL,
	"collection_created" INTEGER DEFAULT NULL,
	"collection_modified" INTEGER DEFAULT NULL
	) CHARACTER SET "utf8mb4";

-- Units ...
CREATE TABLE IF NOT EXISTS "unit" (
	"unit_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"unit_name" TEXT NOT NULL,
	"unit_names" TEXT DEFAULT NULL, -- plural of name
	"unit_collection" INTEGER DEFAULT NULL,
	"unit_symbol" VARCHAR(8) DEFAULT NULL,
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
	"article_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"article_name" TEXT NOT NULL,
	"article_names" TEXT DEFAULT NULL, -- plural of name
	"article_price" FLOAT DEFAULT 0, -- default price
	"article_description" TEXT DEFAULT NULL,
	"article_collection" INTEGER DEFAULT NULL,
	"article_ucollection" INTEGER DEFAULT NULL, -- link to collection of unit to use for this article
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
	"centry_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"centry_count" INTEGER NOT NULL,
	"centry_article" INTEGER DEFAULT NULL,
	"centry_reference" TEXT DEFAULT NULL,
	"centry_description" TEXT,
	"centry_price" FLOAT DEFAULT NULL,
	"centry_discount" FLOAT DEFAULT NULL, -- percent value
	"centry_quantity" FLOAT DEFAULT NULL,
	"centry_total" FLOAT DEFAULT NULL,
	"centry_unit" INTEGER DEFAULT NULL,
	"centry_group" INTEGER DEFAULT NULL,
	"centry_reservation" INTEGER DEFAULT NULL,
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
       "mission_uid" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "mission_reservation" INTEGER NOT NULL,
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
       "missionFichier_mission" INTEGER,
       "missionFichier_ordre" INTEGER DEFAULT 0,
       PRIMARY KEY("missionFichier_fichier", "missionFichier_mission")
) CHARACTER SET "utf8mb4";

CREATE TABLE IF NOT EXISTS "intervention" (
       "intervention_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "intervention_reservation" INTEGER,
       "intervention_type" TEXT DEFAULT NULL,
       "intervention_comment" TEXT,
       "intervention_date" VARCHAR(32) NOT NULL, -- ISO8601
       "intervention_duration" INTEGER DEFAULT 0, -- in seconds
       "intervention_technician" TEXT DEFAULT NULL,
       FOREIGN KEY ("intervention_reservation") REFERENCES "reservation"("reservation_id") ON UPDATE CASCADE ON DELETE CASCADE
) CHARACTER SET "utf8mb4";
       
CREATE TABLE IF NOT EXISTS "histoire" (
       "histoire_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "histoire_object" INTEGER NOT NULL,
       "histoire_type" ENUM('Reservation', 'Arrival', 'Association') NOT NULL,
       "histoire_date" CHAR(25) NOT NULL, -- iso8061 without ms
       "histoire_creator" INTEGER NOT NULL,
       "histoire_attribute" TEXT(1024) NOT NULL, -- attribute list
       "histoire_original" BLOB(4096) -- data (compressed)
       );
