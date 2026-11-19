FROM composer:2 AS vendor

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY . .
RUN composer dump-autoload --no-dev --optimize --no-interaction --no-scripts

FROM node:22-alpine AS frontend

WORKDIR /var/www/html

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM php:8.4-fpm-bookworm AS app

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev libicu-dev libonig-dev libsqlite3-dev libxml2-dev libzip-dev sqlite3 \
    && docker-php-ext-install -j"$(nproc)" bcmath curl intl mbstring pdo_sqlite xml zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=vendor /var/www/html ./
COPY --from=frontend /var/www/html/public/build ./public/build
COPY docker/entrypoint.sh /usr/local/bin/room-reserve-entrypoint

RUN ln -sfn ../storage/app/public public/storage \
    && php artisan package:discover --ansi \
    && chmod +x /usr/local/bin/room-reserve-entrypoint \
    && chown -R www-data:www-data bootstrap/cache storage

ENTRYPOINT ["room-reserve-entrypoint"]
CMD ["php-fpm"]

FROM nginx:1.28-alpine AS web

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public /var/www/html/public
