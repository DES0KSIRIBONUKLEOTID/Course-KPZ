#!/bin/sh
# Запуск на хостингу: міграції, за потреби демо-дані, потім сервер.
set -e

php artisan migrate --force

# Демонстраційні дані додаються лише якщо задано SEED_DEMO=true (сидер ігнорується, якщо працівники вже є)
if [ "$SEED_DEMO" = "true" ]; then
  php artisan db:seed --force
fi

php artisan config:cache
php artisan route:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
