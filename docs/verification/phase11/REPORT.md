# Phase 11 desktop PWA verification

## Status

**Implementation, local browser verification, and PythonAnywhere deployment smoke checks: PASS. Native/OS-specific installation acceptance remains PENDING.** This report distinguishes automated and local browser evidence from live-host smoke checks.

## Scope

- Added a standalone desktop-installable PWA manifest and branded 192px/512px icons.
- Added a root-scoped service worker that precaches the public offline shell and same-origin static assets. It does not cache authenticated pages or API responses.
- Added a public offline fallback shell with an optional, read-only snapshot.
- Added an authenticated offline-access page requiring both catalog and inventory view permissions.
- Snapshot fields are restricted to active product/category/variant identity fields and stock quantity/location/reorder-point fields. Prices, costs, images, customer/sales/report/staff/supplier data, passwords, and raw API responses are excluded.
- The snapshot is AES-GCM encrypted using a PBKDF2-SHA-256-derived key (600,000 iterations) from a separate 12-character-minimum passphrase. IndexedDB stores salt, IV, ciphertext, version/expiry metadata, and iteration count; it does not store the passphrase or derived key.
- The snapshot expires after 24 hours, locks after five minutes idle or when the page is hidden, and is deleted on successful web logout. Offline write operations are not provided.

## Automated verification

Environment: Windows, project virtualenv, local SQLite test database, desktop Chromium via Playwright. Date: 2026-11-09.

| Check | Result |
|---|---|
| `.\.venv\Scripts\python.exe manage.py test` | PASS — 70 tests, 0 failures. |
| `.\.venv\Scripts\python.exe manage.py check` | PASS — no issues. |
| `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run` | PASS — no model changes detected. |
| `node --check static/js/offline-vault.js` and `node --check static/js/pwa.js` | PASS — both scripts parse. |
| `git diff --check` | PASS. |

## Desktop Chromium browser verification

Executed against a local Django server and an isolated, disposable verification account with one product and stock batch. No production data was used.

| Scenario | Result |
|---|---|
| Manifest `display: standalone`, root scope, and 192px/512px icons return HTTP 200 | PASS. |
| Service worker controls `/`; eight static assets were cached; Cache Storage contained no `/api/` paths | PASS. |
| Synthetic `beforeinstallprompt` event reveals the install button and is prevented for browser handling | PASS. This verifies handler behavior only, not OS-level installation or browser eligibility. |
| Snapshot saved to IndexedDB with only encrypted ciphertext and cryptographic metadata; plaintext product name absent | PASS. |
| Wrong offline passphrase rejected without displaying the snapshot | PASS. |
| Offline navigation from a protected inventory route rendered the public shell; correct passphrase unlocked catalog and on-hand/reorder-point stock; no write controls, prices, or costs were shown | PASS. |
| Lock after 301 simulated seconds | PASS. |
| Expiry after 24 simulated hours, including validation against tampered outer expiry metadata | PASS. |
| Logout cleared the active IndexedDB snapshot | PASS. |
| Narrow-screen offline shell at 390px viewport had document width 390px | PASS. |

Screenshots:
- [Offline desktop 1440px](./offline-shell-1440.png)
- [Offline narrow screen 390px](./offline-shell-390.png)

## PythonAnywhere deployment verification

Deployment completed 2026-11-09 from GitHub commit `d6c6faa` (`Add desktop PWA with encrypted offline snapshot`) to the existing PythonAnywhere SQLite demo at `https://norissbeautyquest.pythonanywhere.com/`.

The first live smoke check found HTTP 500 responses because the production static-files manifest did not contain `js/offline-vault.js`. PythonAnywhere Bash then ran `collectstatic` with production settings and the secret loaded only into the command environment. The command completed successfully: `0 static files copied, 163 unmodified, 722 post-processed`. Following the app reload, the live endpoints recovered.

| Live check | Result |
|---|---|
| `/health/` and `/` | PASS — HTTP 200. |
| `/login/` | PASS — HTTP 200; install button and APK download link are present. |
| `/manifest.webmanifest` | PASS — HTTP 200, standalone display, root start URL/scope; both versioned PNG icons return HTTP 200. |
| `/service-worker.js` | PASS — HTTP 200 and `Service-Worker-Allowed: /`; all six versioned same-origin static precache URLs return HTTP 200; no API path is cached. |
| `/offline-shell/` | PASS — HTTP 200. |

The PythonAnywhere deployment was smoke-checked through HTTP requests. An authenticated user account was not used for a live snapshot creation, and no browser OS-level installation or live-host offline restart was independently verified.

## Limitations and security notes

- Offline data may be stale. Membership revocation cannot be detected while disconnected; a snapshot remains usable until its 24-hour expiry if the user knows the passphrase.
- Auto-lock and expiry are client-side controls. They do not protect against a device owner who modifies browser storage or captures data while unlocked.
- The snapshot is available only in the same browser profile/device where it was created and requires a secure context (HTTPS or localhost) and Web Crypto/IndexedDB support.
- POS, payments, stock changes, authenticated business pages, and all other writes require a live connection.
- Browser install prompts and installed-app behavior vary by browser and OS. No actual OS installation or physical desktop offline restart was established by this local browser run.
- The app uses the temporary SQLite demo and remains unsuitable for real business records. PostgreSQL staging, backup/restore and rollback rehearsal, and private account provisioning remain outstanding per the Phase 10 release gates.

## Decision

**Phase 11 implementation and deployment smoke checks: PASS. Native/OS-specific install acceptance: PENDING.** Production readiness is not implied; the SQLite demo remains unsuitable for real business records.
