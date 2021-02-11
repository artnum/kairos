Prérequis
=========

Programme : apache2 php mysql php-ldap php-mysql php-curl php-mbstring php-gd imagemagick poppler-utils

Clone dépôts :

 git clone https://github.com/artnum/js.git
 git clone https://github.com/artnum/phplibs.git artnum # cloner dans le répetoire d'inclusion de PHP
 git clone git@github.com:artnum/location.git

PHP
===
 (si apache mpm_event : php-fpm)

Mettre post_max_size à 30M
Mettre upload_max_filesize à 30M

Apache
======

Activer le mod_rewrite
Activer le mod_headers


## PHP-FPM / Apache mpm_event

a2dismod php7.3
a2dismod mpm_prefork
a2enmod mpm_event
a2enmod proxy_fcgi 
a2enmod setenvif
a2enconf php7.3-fpm

restart apache

Location
========

Dane le répertoir cloner :

setfacl -m u:www-data:rwx ./private


créer cont/location.ini et conf/app.js
