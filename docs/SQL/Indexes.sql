-- Tri par date de fin arrivant souvent
CREATE INDEX idxCountEndDate ON count (count_end);

-- Un filtre venant souvent est de savoir l'état
CREATE INDEX idxCountState ON count (count_state);

-- Avec deleted toujours utile
CREATE INDEX idxReservationClosed ON reservation (reservation_closed);

-- Recherche par nom des contacts
CREATE INDEX idxContactsTarget ON contacts (contacts_target(32));

-- Recherche récurrentes par type (commentaire)
CREATE INDEX idxContactsComment ON contacts (contacts_comment(16));

-- Recherche récurrente par nom
CREATE INDEX idxEntryName ON entry (entry_name(32));
