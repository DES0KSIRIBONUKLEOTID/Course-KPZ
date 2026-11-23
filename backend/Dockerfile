# Образ серверної частини для хостингу (Railway, Render тощо).
FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev \
    && docker-php-ext-install pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --no-progress

COPY . .
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Кілька процесів вбудованого сервера PHP, щоб запити не чекали один одного
ENV PHP_CLI_SERVER_WORKERS=4
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "docker/start.sh"]
