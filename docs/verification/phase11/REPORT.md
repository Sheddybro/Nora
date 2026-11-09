# Phase 11 desktop PWA verification

## Status

**Implementation and local browser verification: PASS. Published-host and native install acceptance: PENDING.** This report distinguishes local evidence from deployment evidence; no live-host claim is made until PythonAnywhere is updated and checked.

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

## Limitations and security notes

- Offline data may be stale. Membership revocation cannot be detected while disconnected; a snapshot remains usable until its 24-hour expiry if the user knows the passphrase.
- Auto-lock and expiry are client-side controls. They do not protect against a device owner who modifies browser storage or captures data while unlocked.
- The snapshot is available only in the same browser profile/device where it was created and requires a secure context (HTTPS or localhost) and Web Crypto/IndexedDB support.
- POS, payments, stock changes, authenticated business pages, and all other writes require a live connection.
- Browser install prompts and installed-app behavior vary by browser and OS. No actual OS installation or physical desktop offline restart was established by this local browser run.
- PythonAnywhere deployment, HTTPS live-host worker behavior, static collection, public smoke checks, and reload remain pending until deployment is performed.

## Decision

**Local implementation verification: PASS. Release/deployment acceptance: BLOCKED pending PythonAnywhere deployment and public-host checks.** Production readiness is not implied; the SQLite demo remains unsuitable for real business records.
