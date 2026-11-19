#!/bin/sh
set -e

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
touch database/database.sqlite
chown -R www-data:www-data bootstrap/cache storage database/database.sqlite

exec "$@"
