/* SQLite 3 schema */
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

CREATE TABLE IF NOT EXISTS reservation		( reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
						  reservation_begin DATETIME,
						  reservation_end DATETIME,
						  reservation_target TEXT,
						  reservation_status INTEGER,
						  reservation_address TEXT,
						  reservation_locality TEXT,
						  reservation_contact TEXT,
						  reservation_comment TEXT,
						  reservation_deliveryBegin DATETIME,
						  reservation_deliveryEnd DATETIME,
						  reservation_special INTEGER,
						  reservation_withWorker TEXT,
						  reservation_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
						  reservation_deleted TIMESTAMP DEFAULT NULL,
						  reservation_closed TIMESTAMP DEFAULT NULL,
						  reservation_reference TEXT DEFAULT NULL,
						  reservation_equipment TEXT DEFAULT NULL,
						  reservation_modification DATETIME
						);

CREATE TABLE IF NOT EXISTS user 		( user_id INTEGER PRIMARY KEY,
						  user_name TEXT,
						  user_password TEXT,
						  user_salt TEXT
						);

CREATE TABLE IF NOT EXISTS association		( association_id INTEGER PRIMARY KEY,
						  association_reservation INTEGER,
						  association_target TEXT,
						  association_begin DATETIME,
						  association_end DATETIME,
						  association_comment TEXT,
						  association_type TEXT
						);

CREATE TABLE IF NOT EXISTS tags 		( tags_value TEXT,
						  tags_target TEXT
						);
