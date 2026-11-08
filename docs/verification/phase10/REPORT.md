# Phase 10 deployment verification

**Status: BLOCKED for production release.** This report records a temporary PythonAnywhere demo deployment only; it is not production acceptance.

## Scope and environment

- Host: `https://norissbeautyquest.pythonanywhere.com/`
- Repository revision deployed: `e101424` (`Fix Django deployment dependencies`)
- Runtime: Python 3.12 with `/home/NorissBeautyquest/.virtualenvs/nora-venv`
- Application directory: `/home/NorissBeautyquest/Nora`
- Database: disposable SQLite at `/home/NorissBeautyquest/nora_demo.sqlite3`
- Static mapping: `/static/` to `/home/NorissBeautyquest/Nora/staticfiles`
- Django secret: held outside the repository in a private file; its value is not recorded here.

No real business records may be entered in this SQLite demo.

## Completed checks

| Check | Result |
|---|---|
| Install `requirements.txt` in the PythonAnywhere virtualenv | PASS |
| `python manage.py check --deploy` | PASS |
| `python manage.py makemigrations --check --dry-run` | PASS |
| WSGI configuration syntax check | PASS |
| Apply migrations to the fresh demo database | PASS, through `core.0013` and the JWT blacklist migrations |
| `collectstatic` | PASS, 159 files copied and 753 post-processed |
| PythonAnywhere `/static/` mapping and web-app reload | PASS |
| `GET /health/` | PASS, `{"status": "ok", "service": "norrisbeauty"}` |
| `GET /api/v1/health/` | PASS, HTTP 200 and `{"status": "ok", "api_version": "v1"}` |
| `GET /login/` and its deployed stylesheets | PASS; the branded login page and custom CSS rendered |
| Local Django test suite before deployment | PASS, 66 tests |

The deployment setup also passed local dependency installation, Django system checks, migration drift checks, and `check --deploy` before it was pushed.

## Outstanding release gates

- PostgreSQL staging is unavailable on the current free PythonAnywhere account. SQLite is not approved for real business records.
- No Owner/Staff membership or Django superuser has been provisioned. Create accounts privately; do not send passwords in chat or store them in this repository.
- A production backup and verified restore have not been performed.
- A rollback rehearsal and production acceptance walkthrough have not been performed.
- Production readiness, Phase 10 completion, and acceptance of any real business data are therefore **not approved**.
