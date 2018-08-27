PRAGMA "foreign_key" = ON;

-- Basis for invoice creation
CREATE TABLE IF NOT EXISTS "count" ( 
	"count_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"count_reservation" INTEGER NOT NULL,
	"count_date" DATETIME NOT NULL,
	"count_comment" TEXT,
	"count_deleted" TIMESTAMP DEFAULT NULL,
	"count_created" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"count_modified" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("count_reservation") REFERENCES "reservation"("reservation_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE );
-- Entries for count
CREATE TABLE IF NOT EXISTS "centry" (
	"centry_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"centry_count" INTEGER NOT NULL,
	"centry_description" TEXT,
	"centry_price" FLOAT,
	"centry_quantity" FLOAT,
	"centry_unit" INTEGER DEFAULT NULL,
	FOREIGN KEY("centry_count") REFERENCES "centry"("centry_id")
		ON UPDATE CASCADE
		ON DELETE CASCADE 
	FOREIGN KEY("centry_unit") REFERENCES "unit"("unit_id")
		ON UPDATE CASCADE
		ON DELETE SET NULL );
-- Units ...
CREATE TABLE IF NOT EXISTS "unit" (
	"unit_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"unit_name" TEXT,
	"unit_symbol" VARCHAR(8),
	"unit_price" FLOAT DEFAULT NULL)

