begin transaction;

CREATE TABLE IF NOT EXISTS "reservation_new" ( 'reservation_id' INTEGER PRIMARY KEY AUTOINCREMENT, 'reservation_begin' DATETIME, 'reservation_end' DATETIME, 'reservation_target' VARCHAR (24), 'reservation_status' INTEGER, 'reservation_address' text, 'reservation_locality' text, 'reservation_contact' text, reservation_comment varchar(255), 'reservation_deliveryBegin' DATETIME, 'reservation_deliveryEnd' DATETIME, 'reservation_special' INTEGER, reservation_withWorker TEXT, reservation_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reservation_deleted TIMESTAMP DEFAULT NULL, reservation_closed TIMESTAMP DEFAULT NULL);

insert into reservation_new (reservation_id, reservation_begin, reservation_end, reservation_target, reservation_status, reservation_address, reservation_locality, reservation_contact, reservation_comment, reservation_deliveryBegin, reservation_deliveryEnd, reservation_special, reservation_withWorker) select * from reservation;

drop table reservation;
alter table reservation_new rename to reservation;


end transaction;
