#!/bin/bash

wget https://www.bfs.admin.ch/bfsstatic/dam/assets/275785/master -O raw/post-codes.xls
ssconvert -S raw/post-codes.xls raw/post-codes.csv
php simplify.php raw/post-codes.csv.1 post-codes.csv

