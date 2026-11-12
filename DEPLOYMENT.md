# Room Booking production deployment manual

This guide deploys Room Booking to an Ubuntu EC2 instance with Nginx, PHP-FPM,
SQLite, Let's Encrypt HTTPS, and optional Microsoft Graph email delivery.

Never place secrets, private keys, DuckDNS tokens, client-secret values, or a
production `.env` file in Git, chat messages, or screenshots.

## 1. AWS and DNS prerequisites

Before configuring the server:

1. Allocate an **Elastic IP** in the same AWS Region as the EC2 instance.
2. Associate it with the instance.
3. Point the DuckDNS hostname at that Elastic IP.
4. Configure the instance security group:
   - SSH, TCP `22`: only your current public IP.
   - HTTP, TCP `80`: `0.0.0.0/0`.
   - HTTPS, TCP `443`: `0.0.0.0/0`.

An Elastic IP avoids the public address changing when the instance is stopped
and started. Do not expose SQLite or database ports.

## 2. Connect with Termius

Create a Termius SSH host using:

```text
Host: YOUR_DUCKDNS_SUBDOMAIN.duckdns.org
Port: 22
User: ubuntu
Identity: the EC2 .pem private-key file
```

On Windows, if OpenSSH rejects the key because it is accessible by other users,
restrict the local key file so that only your Windows account can read it.

## 3. Prepare Ubuntu

This deployment was verified on Ubuntu 26.04 ARM64. Run the following after
connecting as `ubuntu`:

```bash
sudo apt update
sudo apt upgrade -y

sudo apt install -y composer sqlite3 unzip certbot python3-certbot-nginx \
  nginx git nodejs npm php-fpm php-sqlite3 php-mbstring php-xml \
  php-curl php-zip php-intl php-bcmath php8.5-xml
```

Ubuntu 26.04 provides PHP 8.5 packages. This project declares PHP `^8.3`, so
PHP 8.5 is supported. Use the same version for the PHP CLI and PHP-FPM:

```bash
sudo update-alternatives --set php /usr/bin/php8.5
sudo systemctl enable --now nginx php8.5-fpm

php -v
php -m | grep -iE '^(bcmath|curl|dom|intl|mbstring|pdo_sqlite|sqlite3|xml|zip)$'
```

If an older PHP-FPM service exists and no site uses it, stop it:

```bash
sudo systemctl disable --now php8.3-fpm
```

Reboot after a kernel update, then reconnect with Termius:

```bash
sudo reboot
```

## 4. Get the application code

Use `/var/www/room-booking` as the production directory:

```bash
sudo mkdir -p /var/www
sudo git clone https://github.com/nazihasaji/room-booking.git /var/www/room-booking
sudo chown -R ubuntu:www-data /var/www/room-booking

cd /var/www/room-booking
git status
```

If the directory already exists, do not delete it. Inspect it first:

```bash
sudo git -C /var/www/room-booking status
sudo git -C /var/www/room-booking remote -v
```

Install the production PHP dependencies and build frontend assets as `ubuntu`,
not as `root`:

```bash
cd /var/www/room-booking
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

If `npm ci` reports that `package-lock.json` is out of sync, fix and commit the
lock file on a development machine with `npm install`, then push and pull the
commit on the server. Avoid leaving server-only lock-file changes.

## 5. Configure Laravel and SQLite

Create a separate production environment file. Never copy a local `.env` file
to the server.

```bash
cd /var/www/room-booking
cp .env.example .env
touch database/database.sqlite

sed -i 's/^APP_ENV=.*/APP_ENV=production/' .env
sed -i 's/^APP_DEBUG=.*/APP_DEBUG=false/' .env
sed -i 's|^APP_URL=.*|APP_URL=https://YOUR_DUCKDNS_SUBDOMAIN.duckdns.org|' .env
sed -i 's/^LOG_LEVEL=.*/LOG_LEVEL=warning/' .env

php artisan key:generate
```

Give the web-server group access only where Laravel and SQLite need to write:

```bash
sudo chown -R ubuntu:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache

sudo chown ubuntu:www-data database
sudo chmod 775 database
sudo chown ubuntu:www-data database/database.sqlite
sudo chmod 664 database/database.sqlite

sudo chown ubuntu:www-data .env
sudo chmod 640 .env
```

Create the schema, public storage link, cached configuration, rooms, and the
initial administrator:

```bash
php artisan migrate --force
php artisan storage:link
php artisan db:seed --force
php artisan optimize
php artisan room-booking:create-super-admin
```

The room seeder is required. Without it, the booking page has no selectable
room and consequently marks all time slots unavailable.

## 6. Configure Nginx

Create the HTTP site configuration:

```bash
sudo nano /etc/nginx/sites-available/room-booking
```

Paste the following, replacing the hostname:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name YOUR_DUCKDNS_SUBDOMAIN.duckdns.org;
    root /var/www/room-booking/public;

    index index.php;
    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.5-fpm.sock;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Save Nano with `Ctrl+O`, Enter, then `Ctrl+X`. Enable and validate the site:

```bash
sudo ln -s /etc/nginx/sites-available/room-booking /etc/nginx/sites-enabled/room-booking
sudo nginx -t
sudo systemctl reload nginx
```

Never reload Nginx if `sudo nginx -t` fails. To inspect the site file later:

```bash
sudo nano /etc/nginx/sites-available/room-booking
```

To inspect the complete active Nginx configuration, use:

```bash
sudo nginx -T | less
```

Press `q` to exit.

## 7. Enable HTTPS

After the DuckDNS hostname resolves to the Elastic IP and port 80 is open in
the security group, obtain the certificate:

```bash
sudo certbot --nginx -d YOUR_DUCKDNS_SUBDOMAIN.duckdns.org
```

Agree to the terms, decline optional marketing if preferred, and choose the
HTTP-to-HTTPS redirect option. Certbot configures automatic renewal. Verify it:

```bash
sudo certbot renew --dry-run
```

## 8. Configure Microsoft Graph email (optional)

The app sends invitations, booking confirmations, and administrator notices
through Microsoft Graph when all of the following `.env` values are set:

```dotenv
GRAPH_TENANT_ID=YOUR_DIRECTORY_TENANT_ID
GRAPH_CLIENT_ID=YOUR_APPLICATION_CLIENT_ID
GRAPH_CLIENT_SECRET='YOUR_CLIENT_SECRET_VALUE'
GRAPH_FROM_NAME="Room Reserve"
GRAPH_FROM_ADDRESS=roomreserve@your-organisation.example
```

In Microsoft Entra, the app registration needs **Microsoft Graph → Application
permissions → Mail.Send**, followed by **Grant admin consent**. The sender
address must be a real Exchange Online mailbox.

After editing the production `.env`, reload Laravel configuration:

```bash
cd /var/www/room-booking
php artisan config:clear
php artisan config:cache
```

If Graph returns `AADSTS7000215`, the client secret is invalid. Create a new
secret in Entra and use its **Value**, not its Secret ID.

## 9. Verification checklist

- Open `https://YOUR_DUCKDNS_SUBDOMAIN.duckdns.org`.
- Confirm a room can be selected and an available time is shown.
- Sign in as the initial super administrator.
- Create a temporary account with **Send invitation email** enabled to test
  Microsoft Graph; delete the test account afterward.
- Confirm HTTPS renewal succeeds with `certbot renew --dry-run`.

Useful diagnostics:

```bash
sudo nginx -t
systemctl is-active nginx
systemctl is-active php8.5-fpm
tail -n 100 /var/www/room-booking/storage/logs/laravel.log
```

## 10. Deploy an update

After pushing a tested change to GitHub:

```bash
cd /var/www/room-booking
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize
sudo systemctl reload php8.5-fpm
sudo systemctl reload nginx
```

Run `git status` before updating. If it reports local production-only changes,
such as an uncommitted lock-file update, resolve that deliberately before
pulling.
