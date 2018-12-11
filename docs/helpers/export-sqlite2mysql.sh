#!/bin/bash
DATABASE=$1
DBNAME=$2
IMPORT=`tempfile`
if [ -z "$DATABASE" ]; then 
	DATABASE="location.sqlite"
fi
if [ -z "$DBNAME" ]; then
	DBNAME="location";
fi

echo "SET sql_mode = 'ANSI';" > "$IMPORT"
echo "USE '$DBNAME';" >> "$IMPORT"
echo "SET FOREIGN_KEY_CHECKS=0;" >> "$IMPORT"
php sqlify.php "$DATABASE" >> "$IMPORT"
echo "SET FOREIGN_KEY_CHECKS=0;" >> "$IMPORT"

echo "$IMPORT"
