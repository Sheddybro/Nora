# NorrisBeauty — full foundation and Copilot visual kit

**Status: working-source starter, not a finished business application.** Contains Django/DRF foundations, login, owner/staff-aware dashboard shell, mobile Expo shell, tests, docs and web/mobile design references.

## Start here
1. Read `docs/PROJECT_STATUS.md`, `docs/10_SETUP_WINDOWS.md`, and `.github/copilot-instructions.md`.
2. Set up Django, migrate and run `python manage.py test`.
3. Create an admin account and an owner/staff Membership in `/admin/`.
4. Open the login and dashboard. Start Expo separately from `mobile/`.

## What's actually implemented
- Django project configuration; environment-based database settings; DRF health endpoint; business and membership model; owner/staff default permissions; secure shared JWT auth flow; password reset routes; branded responsive dashboard shell; CSS dark mode toggle; Django tests for login and permission boundaries.
- Phase 4 catalog/inventory foundation: business-scoped categories, products, variants, validated product-image uploads, locations, expiry batches and stock ledger; authenticated `/api/v1` endpoints; owner writes by default with server-validated explicit staff permissions; API-backed web forms and Expo catalog/stock reads and owner write flows.
- Phases 5–8 backend workflows: suppliers and purchase orders, atomic sales checkout/refunds, transfers/stocktakes/alerts, expenses/reports/audit events/notifications, all exposed through the shared versioned API and covered by Django regression tests.
- Phase 9 mobile progress: live barcode-aware catalog and stock screens, stock-aware mobile POS checkout with server-enforced idempotency, business-scoped customer listing/creation, owner supplier/purchase-order lifecycle flows with idempotent create/receive, and a business/user-scoped local stock-movement queue that retries on app start, connectivity restoration, and foregrounding.
- Expo React Native client with secure credential/session storage via Expo SecureStore and a real auth context that consumes the shared Django backend.
- Installable desktop PWA shell with a same-origin service worker. While online, authorized users can save a 24-hour, passphrase-protected encrypted catalog/stock snapshot for read-only access while offline. Business pages, API responses, prices, costs, and write actions are not cached or available offline.
- 15 reference crops + full visual collage; design system; acceptance matrix and prompts.

## What's not implemented
Full production tenant provisioning, granular permission configuration UI, background sync, multi-line purchasing order editing, OS/browser-specific PWA installation acceptance, and physical-device verification of Expo workflows. Customer creation is available in the mobile Customers screen. The mobile stock queue syncs only while the app is running and authenticated; POS sales remain online-only because queued checkout has not received device/E2E validation. Some dashboard and finance screens remain demo-only.

### Install NorrisBeauty on desktop

Open the HTTPS website in a PWA-capable desktop browser and choose **Install desktop app** when the browser offers the install prompt. If the in-page button is not offered yet, use the browser's install option in its address bar or app menu. The offline shell contains only the encrypted catalog/stock snapshot; reconnect for sales, payments, stock changes, and all other business actions. A saved snapshot can remain available until its 24-hour expiry if access is revoked while the device is offline. See `docs/07_DATA_AND_SECURITY.md` for the data boundary and limitations.

### Install NorrisBeauty on iPhone or iPad (free)

1. Open the HTTPS NorrisBeauty website in **Safari** on the device.
2. On the sign-in page, expand **Install on iPhone or iPad — free** for the current instructions.
3. In Safari's Share menu, choose **Add to Home Screen**. Enable **Open as Web App** if your iOS version offers it, then tap **Add**.
4. Launch the new NorrisBeauty icon from the Home Screen and sign in.

This Home Screen web app does **not** require an Apple Developer account or App Store listing. It uses the same Django web backend and permissions as the desktop website, not the Expo-native iOS build. Online access is still required for sales, payments, stock mutations, and other writes. The existing encrypted 24-hour catalog/stock snapshot is read-only; offline write/sync features have not been implemented for the iOS web app. Safari and iOS-version-specific behavior must be verified on a physical iPhone/iPad before claiming full acceptance.

## Visual samples
`design/references/` contains generated inspiration images. Some cropped collage samples are low-resolution and small text is illustrative only. `design/references/00_full_design_board.png` is the source image. Rebuild with real UI components.

## Official branding
The official Norris Beautyquest logo is preserved at `static/img/logo.jpeg` and bundled for Expo as `mobile/assets/norris-logo.jpeg`. These files are reused without redesign; the source JPEG has a white background.

## Verification
- `python manage.py check`
- `python manage.py makemigrations --check --dry-run` (after generating the initial migration)
- `python manage.py test`
- `python manage.py runserver` then `/health/`, `/api/v1/health/`, `/login/`, `/`
- `cd mobile && npm install && npx expo start` (requires Node/npm; verify on device)

## Production deployment readiness
- Use `DJANGO_SETTINGS_MODULE=config.production` and set a strong `DJANGO_SECRET_KEY`.
- Keep `DJANGO_DEBUG=false` and configure `DJANGO_ALLOWED_HOSTS` and `DJANGO_CSRF_TRUSTED_ORIGINS` for the deployed domain.
- Run PostgreSQL in production; SQLite is for local development only.
- Serve the app through HTTPS and enable secure cookies/redirects.
- Use `gunicorn` with the included `Procfile` and compile static assets with `collectstatic`.
- See `docs/14_DEPLOYMENT.md` for the production environment checklist.

Current QA evidence and remaining limitations are recorded in `docs/qa/execution/QA_FINAL_REPORT.md` and `docs/qa/execution/QA_BUG_REGISTER.md`.
