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
- Phase 4 catalog/inventory foundation: business-scoped categories, products, variants, image metadata, locations, expiry batches and stock ledger; authenticated `/api/v1` endpoints; owner-only catalog and stock writes; API-backed web forms and Expo catalog/stock reads.
- Expo React Native client with secure credential/session storage via Expo SecureStore and a real auth context that consumes the shared Django backend.
- 15 reference crops + full visual collage; design system; acceptance matrix and prompts.

## What's not implemented
Full production tenant provisioning, granular permission configuration UI, supplier purchasing, sales/POS/payment APIs, transfers and stocktakes, offline sync, uploaded image storage, and fully device-tested Expo workflows on a physical Android handset. Dashboard and non-catalog/inventory screens still contain demo-only surfaces until their modules are implemented.

## Visual samples
`design/references/` contains generated inspiration images. Some cropped collage samples are low-resolution and small text is illustrative only. `design/references/00_full_design_board.png` is the source image. Rebuild with real UI components.

## Verification
- `python manage.py check`
- `python manage.py makemigrations --check --dry-run` (after generating the initial migration)
- `python manage.py test`
- `python manage.py runserver` then `/health/`, `/api/v1/health/`, `/login/`, `/`
- `cd mobile && npm install && npx expo start` (requires Node/npm; verify on device)

No Django/Expo execution is claimed by this package creation environment; run commands locally and record results.
