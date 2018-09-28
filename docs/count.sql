PRAGMA "foreign_keys" = ON;

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
	"count_comment" TEXT,
	"count_printed" DATETIME DEFAULT NULL,
	"count_deleted" TIMESTAMP DEFAULT NULL,
	"count_created" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"count_modified" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("count_invoice") REFERENCES "invoice"("invoice_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE );

-- Entries for count
CREATE TABLE IF NOT EXISTS "centry" (
	"centry_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"centry_count" INTEGER NOT NULL,
	"centry_description" TEXT,
	"centry_price" FLOAT DEFAULT NULL,
	"centry_quantity" FLOAT DEFAULT NULL,
	"centry_total" FLOAT DEFAULT NULL,
	"centry_unit" INTEGER DEFAULT NULL,
	"centry_reservation" INTEGER DEFAULT NULL,
	FOREIGN KEY("centry_count") REFERENCES "count"("count_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	FOREIGN KEY("centry_unit") REFERENCES "unit"("unit_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	FOREIGN KEY("centry_reservation") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL );
-- Units ...
CREATE TABLE IF NOT EXISTS "unit" (
	"unit_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"unit_name" TEXT,
	"unit_symbol" VARCHAR(8),
	"unit_price" FLOAT DEFAULT NULL);

-- Invoices
CREATE TABLE IF NOT EXISTS "invoice" (
	"invoice_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"invoice_winbiz" TEXT NULL, -- used to sync with an external invoicing software if any.
	"invoice_address" INTEGER NULL,
	"invoice_sent" DATETIME NULL,
	"invoice_paid" DATETIME NULL,
	"invoice_deleted" TIMESTAMP DEFAULT NULL,
	"invoice_created" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"invoice_modified" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("invoice_address") REFERENCES "contacts"("contacts_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL
	);
