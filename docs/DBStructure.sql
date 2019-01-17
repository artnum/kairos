/* SQLite 3 schema */
PRAGMA "foreign_keys" = ON;
CREATE TABLE IF NOT EXISTS status 		( status_id INTEGER PRIMARY KEY AUTOINCREMENT,
						  status_name TEXT,
						  status_color VARCHAR(8),
						  status_default BOOL,
						  status_type INTEGER DEFAULT 0
						);

CREATE TABLE IF NOT EXISTS contacts 		( contacts_id INTEGER PRIMARY KEY,
						  contacts_reservation INTEGER,
						  contacts_target TEXT,
						  contacts_comment TEXT,
						  contacts_freeform TEXT
						);

CREATE TABLE IF NOT EXISTS "reservation" (
	"reservation_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"reservation_begin" DATETIME NOT NULL,
	"reservation_end" DATETIME NOT NULL,
	"reservation_target" TEXT DEFAULT NULL,
	"reservation_status" INTEGER,
	"reservation_address" TEXT DEFAULT NULL,
	"reservation_locality" TEXT DEFAULT NULL,
	"reservation_contact" TEXT DEFAULT NULL,
	"reservation_comment" TEXT DEFAULT NULL,
	"reservation_deliveryBegin" DATETIME DEFAULT NULL,
	"reservation_deliveryEnd" DATETIME DEFAULT NULL,
	"reservation_special" INTEGER,
	"reservation_closed" TIMESTAMP DEFAULT NULL,
	"reservation_reference" TEXT DEFAULT NULL,
	"reservation_equipment" TEXT DEFAULT NULL,
	"reservation_title" TEXT DEFAULT NULL,
	"reservation_folder" TEXT DEFAULT NULL,
	"reservation_gps" TEXT DEFAULT NULL,
	"reservation_creator" TEXT DEFAULT NULL,
	"reservation_previous" TEXT DEFAULT NULL,
	"reservation_warehouse" TEXT DEFAULT NULL,
	"reservation_note" TEXT DEFAULT NULL,
	"reservation_other" TEXT DEFAULT NULL, -- json
	"reservation_created" INTEGER DEFAULT NULL,
	"reservation_deleted" INTEGER DEFAULT NULL,
	"reservation_modification" INTEGER DEFAULT NULL
	);

CREATE TABLE IF NOT EXISTS "user" 		( user_id INTEGER PRIMARY KEY AUTOINCREMENT,
						  user_name TEXT
						);

CREATE TABLE IF NOT EXISTS association		( association_id INTEGER PRIMARY KEY,
						  association_reservation INTEGER,
						  association_target TEXT,
						  association_begin DATETIME,
						  association_end DATETIME,
						  association_comment TEXT,
						  association_type TEXT,
						  association_number INTEGER DEFAULT 1,
						  association_follow INTEGER DEFAULT 0
						);

CREATE TABLE IF NOT EXISTS warehouse		( warehouse_id INTEGER PRIMARY KEY,
						  warehouse_name TEXT,
						  warehouse_color TEXT );


CREATE TABLE IF NOT EXISTS tags 		( tags_value TEXT,
						  tags_target TEXT
						);

CREATE TABLE IF NOT EXISTS entry		( entry_id INTEGER PRIMARY KEY,  
						  entry_ref TEXT, 
						  entry_name TEXT,
						  entry_value TEXT
						);

CREATE TABLE IF NOT EXISTS extendedReservation	( extendedReservation_id INTEGER PRIMARY KEY,
						  extendedReservation_reservation INTEGER,
						  extendedReservation_name TEXT,
						  extendedReservation_content TEXT
						);
-- Arrival progress
CREATE TABLE IF NOT EXISTS "arrival" (
	"arrival_id" INTEGER PRIMARY KEY,
	"arrival_target" INTEGER,
	"arrival_reported" DATETIME,
	"arrival_done" DATETIME,
	"arrival_inprogress" DATETIME,
	"arrival_contact" TEXT,
	"arrival_where" TEXT,
	"arrival_comment" TEXT,
	"arrival_other" TEXT,
	"arrival_locality" TEXT,
	"arrival_creator" TEXT,
	"arrival_created" INTEGER DEFAULT NULL,
	"arrival_deleted" INTEGER DEFAULT NULL,
	"arrival_modification" INTEGER DEFAULT NULL
        );
-- Associate reservation to count
CREATE TABLE IF NOT EXISTS "countReservation" (
	"countReservation_id" INTEGER PRIMARY KEY,
	"countReservation_count" INTEGER NOT NULL,
	"countReservation_reservation" INTEGER NOT NULL,
	FOREIGN KEY("countReservation_count") REFERENCES "count"("count_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY("countReservation_reservation") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE );

-- Basis for invoice creation
CREATE TABLE IF NOT EXISTS "count" (
	"count_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"count_invoice" INTEGER NULL,
	"count_date" DATETIME NOT NULL,
	"count_begin" DATETIME DEFAULT NULL,
	"count_end" DATETIME DEFAULT NULL,
	"count_total" FLOAT DEFAULT 0,
	"count_reference" TEXT DEFAULT NULL,
	"count_comment" TEXT,
	"count_printed" DATETIME DEFAULT NULL,
	"count_deleted" INTEGER DEFAULT NULL,
	"count_created" INTEGER DEFAULT NULL,
	"count_modified" INTEGER DEFAULT NULL,
	FOREIGN KEY("count_invoice") REFERENCES "invoice"("invoice_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE );

-- Entries for count
CREATE TABLE IF NOT EXISTS "centry" (
	"centry_id" INTEGER PRIMARY KEY AUTOINCREMENT,
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
		ON DELETE SET NULL );
-- Units ...
CREATE TABLE IF NOT EXISTS "unit" (
	"unit_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"unit_name" TEXT NOT NULL,
	"unit_names" TEXT DEFAULT NULL, -- plural of name
	"unit_collection" INTEGER DEFAULT NULL,
	"unit_symbol" VARCHAR(8) DEFAULT NULL,
	"unit_deleted" INTEGER DEFAULT NULL,
	"unit_created" INTEGER DEFAULT NULL,
	"unit_modified" INTEGER DEFAULT NULL,
	FOREIGN KEY ("unit_collection") REFERENCES "collection"("collection_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL
	);
-- Invoices
CREATE TABLE IF NOT EXISTS "invoice" (
	"invoice_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"invoice_winbiz" TEXT NULL, -- used to sync with an external invoicing software if any.
	"invoice_address" INTEGER NULL,
	"invoice_sent" DATETIME DEFAULT NULL,
	"invoice_paid" DATETIME DEFAULT NULL,
	"invoice_deleted" INTEGER DEFAULT NULL,
	"invoice_created" INTEGER DEFAULT NULL,
	"invoice_modified" INTEGER DEFAULT NULL,
	FOREIGN KEY("invoice_address") REFERENCES "contacts"("contacts_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL
	);
-- Generic group to group things under a name
CREATE TABLE IF NOT EXISTS "collection" (
	"collection_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"collection_name" TEXT NOT NULL,
	"collection_description" TEXT NULL,
	"collection_deleted" INTEGER DEFAULT NULL,
	"collection_created" INTEGER DEFAULT NULL,
	"collection_modified" INTEGER DEFAULT NULL
	);

-- Articles 
CREATE TABLE IF NOT EXISTS "article" (
	"article_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"article_name" TEXT NOT NULL,
	"article_names" TEXT DEFAULT NULL, -- plural of name
	"article_price" FLOAT DEFAULT 0.0, --- default price
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
	);
