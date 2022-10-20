alter table reservation add column reservation_dend CHAR(10) NOT NULL DEFAULT '';
alter table reservation add column reservation_dbegin CHAR(10) NOT NULL DEFAULT '';
CREATE INDEX idxReservationDbegin ON reservation (reservation_dbegin);
CREATE INDEX idxReservationDend ON reservation (reservation_dend);
update reservation set reservation_dbegin=SUBSTRING_INDEX(reservation_begin, 'T', 1), reservation_dend=SUBSTRING_INDEX(reservation_end, 'T', 1);
