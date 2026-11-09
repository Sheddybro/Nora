# Production deployment guide

## Target stack

- Django 5.2
- PostgreSQL for production data
- Gunicorn as the WSGI server
- WhiteNoise for static-file serving
- HTTPS termination at the platform or reverse proxy layer

## Required environment variables

Set these in the production environment before starting the app:

```env
DJANGO_ENV=production
DJANGO_SECRET_KEY=<secure random secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=example.com,www.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
DATABASE_URL=postgres://user:password@host:5432/dbname
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true
```

## Start the app

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
DJANGO_SETTINGS_MODULE=config.production python manage.py check --deploy
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

## PythonAnywhere and demo environments

- Configure the WSGI file to use `config.production`, add the repository root to `sys.path`, and set a strong `DJANGO_SECRET_KEY`, the deployed host, and its HTTPS CSRF origin.
- Set the web app's virtualenv to the environment where `requirements.txt` was installed, and map `/static/` to the configured `STATIC_ROOT` after running `collectstatic`.
- PythonAnywhere accounts without PostgreSQL must not use SQLite for real business records. SQLite may be used for a disposable demo only; production requires a PostgreSQL-enabled plan or provider, plus a verified backup and rollback procedure.

## Notes

- Keep `DEBUG` off in production.
- Serve the app behind HTTPS and configure a trusted certificate.
- Use PostgreSQL instead of SQLite for deployment.
- Review secret, host, and cookie settings before every release.
- Do not commit local `.env` values to version control.
- For PWA releases, run `collectstatic` before reloading the app so versioned static assets and both manifest icons resolve. Verify `/manifest.webmanifest`, `/service-worker.js`, and `/offline-shell/` over HTTPS. The service worker caches static assets only; do not add authenticated routes or API paths to its precache.
