# NorrisBeauty — full foundation and Copilot visual kit

**Status: working-source starter, not a finished business application.** Contains Django/DRF foundations, login, owner/staff-aware dashboard shell, mobile Expo shell, tests, docs and web/mobile design references.

## Start here
1. Read `docs/10_SETUP_WINDOWS.md` and `.github/copilot-instructions.md`.
2. Set up Django, migrate and run `python manage.py test`.
3. Create an admin account and an owner/staff Membership in `/admin/`.
4. Open the login and dashboard. Start Expo separately from `mobile/`.
5. Give Copilot `docs/09_COPILOT_MASTER_HANDOFF.md` and complete phases in order.

## What's actually implemented
- Django project configuration; environment-based database settings; DRF health endpoint; business and membership model; owner/staff default permissions; secure shared JWT auth flow; password reset routes; branded responsive dashboard shell; CSS dark mode toggle; Django tests for login and permission boundaries.
- Phase 4 catalog/inventory foundation: business-scoped categories, products, variants, validated product-image uploads, locations, expiry batches and stock ledger; authenticated `/api/v1` endpoints; owner writes by default with server-validated explicit staff permissions; API-backed web forms and Expo catalog/stock reads and owner write flows.
- Phases 5–8 backend workflows: suppliers and purchase orders, atomic sales checkout/refunds, transfers/stocktakes/alerts, expenses/reports/audit events/notifications, all exposed through the shared versioned API and covered by Django regression tests.
- Phase 9 mobile progress: live barcode-aware catalog and stock screens, stock-aware mobile POS checkout with server-enforced idempotency, business-scoped customer listing, owner supplier/purchase-order lifecycle flows with idempotent create/receive, and a business/user-scoped local stock-movement queue that retries on app start, connectivity restoration, and foregrounding.
- Expo React Native client with secure credential/session storage via Expo SecureStore and a real auth context that consumes the shared Django backend.
- 15 reference crops + full visual collage; design system; acceptance matrix and prompts.

## What's not implemented
Full production tenant provisioning, granular permission configuration UI, background sync, customer creation, purchasing order editing/multi-line composition, and physical-device verification of Expo workflows. The mobile stock queue syncs only while the app is running and authenticated; POS sales remain online-only because queued checkout has not received device/E2E validation. Some dashboard and finance screens remain demo-only.

## Visual samples
`design/references/` contains generated inspiration images. Some cropped collage samples are low-resolution and small text is illustrative only. `design/references/00_full_design_board.png` is the source image. Rebuild with real UI components.

## Verification
- `python manage.py check`
- `python manage.py makemigrations --check --dry-run` (after generating the initial migration)
- `python manage.py test`
- `python manage.py runserver` then `/health/`, `/api/v1/health/`, `/login/`, `/`
- `cd mobile && npm install && npx expo start` (requires Node/npm; verify on device)

Phase-specific verification evidence and remaining limitations are recorded in `docs/verification/phase4/REPORT.md`.
