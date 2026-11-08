# Phase 10 deployment verification

**Status: BLOCKED for production release.** This report records a temporary PythonAnywhere demo deployment only; it is not production acceptance.

## Scope and environment

- Host: `https://norissbeautyquest.pythonanywhere.com/`
- Repository revision deployed: `621d6ac` (`Remove login hero copy from image panel`)
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
| Login hero-copy regression tests | PASS, 19 `FoundationTests`; includes assertion that the requested copy is absent |

The deployment setup also passed local dependency installation, Django system checks, migration drift checks, and `check --deploy` before it was pushed.

## Login image-panel copy update (2026-11-08)

- Removed the requested HTML overlay copy from the image panel. The login form, logo, and background image remain.
- Pulled commit `621d6ac` on PythonAnywhere with a fast-forward-only update, ran `collectstatic` successfully (`0` copied, `159` unchanged), and reloaded the web app.
- Public `/login/` verification passed: all four requested strings are absent, the login form is present, and the background image URL resolves under `/static/`.
- Screenshots: [1440px desktop](login-no-hero-copy-1440.png), [390px mobile](login-no-hero-copy-390.png). They document this copy change, not full responsive acceptance.
- The source artwork at `static/img/beauty-art.jpg` contains separate embedded lettering that is not part of the removed HTML copy and remains unchanged.

## Android APK download button (2026-11-08)

- Added a separate **Download Android APK** link below Sign in. It opens the user-provided Google Drive URL in a new tab with `noopener noreferrer`; the existing login flow is unchanged.
- Updated the Android/web tester guide to direct testers to the login-page button.
- Verification: `.\.venv\Scripts\python.exe manage.py test core.tests.FoundationTests` — PASS, 19 tests; `.\.venv\Scripts\python.exe manage.py check` — PASS; `git diff --check` — PASS.
- Local browser verification confirmed the button label, exact Drive URL, new-tab behavior, and link visibility at a 390px viewport. Screenshot captures are saved as `login-apk-download-1440.png` and `login-apk-download-390.png`.
- PythonAnywhere was updated from GitHub commit `af3e26c` using a fast-forward-only pull. `collectstatic` passed (1 copied, 158 unchanged, 710 post-processed), then the web app was reloaded.
- Live `/login/?v=af3e26c` verification confirmed the **Download Android APK** link points to the supplied Google Drive URL and opens in a new tab. No deployment secret was exposed.

## Outstanding release gates

- PostgreSQL staging is unavailable on the current free PythonAnywhere account. SQLite is not approved for real business records.
- No Owner/Staff membership or Django superuser has been provisioned. Create accounts privately; do not send passwords in chat or store them in this repository.
- A production backup and verified restore have not been performed.
- A rollback rehearsal and production acceptance walkthrough have not been performed.
- Production readiness, Phase 10 completion, and acceptance of any real business data are therefore **not approved**.
