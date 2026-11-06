# Phase 4 verification report

## Status

**ACCEPTED BY USER — manual verification reported complete.** The user confirmed that the remaining product-photo, stock-adjustment, and desktop/tablet checks all worked and explicitly approved proceeding to Phase 5. No desktop/tablet screenshots were attached to the session, so this report records those checks as user-reported rather than independently evidenced.

## Scope verified

- Business-scoped catalog, variants, stock locations, batches, and movement ledger.
- Products category creation now binds its submit handler in the workspace scope, preventing native GET navigation and sending category creation through the versioned API.
- Owner-authorized product/image and inventory writes; Staff reads remain restricted by backend permissions.
- Product-image validation and configurable media storage.
- Atomic, idempotent stock movements, nonnegative batch balances, and weighted-average valuation.
- Expo catalog/inventory screens wired to the versioned API.
- Mobile config now permits portrait/landscape rotation; login is scrollable and keyboard-aware. This adjustment was made after the listed baseline source revision and still requires device verification.
- Custom bottom tabs now reserve the Android/iOS bottom safe-area inset to avoid overlapping system navigation controls; physical-device verification remains pending.

## Automated verification

Phase: 4 | Commit: `efc69e4e4f2311a4902936473091251fc09ad820` | Date: 2026-11-04 | Environment: Windows, project virtualenv, Node/Expo dependencies already installed.

| Check | Result |
|---|---|
| `.\.venv\Scripts\python.exe manage.py test core.tests` | PASS — 32 tests, 0 failures, 88.234 seconds. Includes authorization, tenant scope, CSRF, uploads, validation, stock idempotency, weighted-average cost, and web rendering. |
| `.\.venv\Scripts\python.exe manage.py check` | PASS — no issues. |
| `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run` | PASS — no model changes pending. |
| `.\.venv\Scripts\python.exe manage.py migrate` | PASS — applied core migrations `0005`, `0006`, and `0007` to the local development database. SKU/barcode duplicate preflight returned no duplicates. |
| `.\.venv\Scripts\python.exe manage.py migrate --check` | PASS after applying the pending migrations. The initial check correctly returned nonzero because those three migrations were pending. |
| `cd mobile; npx tsc --noEmit` | PASS — no TypeScript diagnostics. |
| `cd mobile; npx expo export --platform android --output-dir $env:TEMP\norrisbeauty-expo-export` | PASS — Android Hermes bundle exported (2.62 MB) to a temporary directory outside the repository. |
| Mobile login/orientation update: `cd mobile; npx tsc --noEmit` | PASS — no TypeScript diagnostics. |
| Mobile login/orientation update: `cd mobile; npx expo export --platform android --output-dir $env:TEMP\norrisbeauty-rotation-export` | PASS — Android Hermes bundle exported (2.62 MB). |
| Bottom-tab safe-area update: `cd mobile; npx tsc --noEmit` | PASS — no TypeScript diagnostics. |
| Bottom-tab safe-area update: `cd mobile; npx expo export --platform android --output-dir $env:TEMP\norrisbeauty-footer-export` | PASS — Android Hermes bundle exported (2.62 MB). |
| Authorization/image security tests within `core.tests` | PASS — default Staff write denial, business isolation, CSRF, image type/size validation, and unauthorized image upload are covered. This is not a production security audit. |
| Products category form regression test within `core.tests` | PASS — verifies the category initializer remains available to page setup and uses POST for new categories. |

## Manual and visual verification

- Physical Android: user-provided screenshots confirm successful owner sign-in, live catalog display, and a receipt of 2 test units at `Mobile Test Store`. The stock screen showed 2 units and NGN 2.00 valuation. The custom tab bar is visually separated from Android's system navigation in the screenshots.
- User additionally confirmed product photo upload, stock adjustment, and desktop/tablet review worked. No screenshot artifacts for those checks were supplied; results are attributed to the user.
- The existing 390px web captures are available: [Products](products-390.png) and [Inventory](inventory-390.png). They were not recaptured in this verification pass.
- The prior report records a browser owner create-product/receive-stock workflow; it was not repeated in this pass.
- Landscape rotation was not specifically confirmed.
- A desktop Expo Web capture was attempted but could not start because `react-native-web` is not installed; no UI screenshot is claimed for the login layout change.
- Automated checks recorded above had no failures; initial `migrate --check` was blocked only by the expected pending migrations and passed after they were applied.

## Decision

**ACCEPTED by user confirmation on 2026-11-04.** Automated checks pass. The user reports the remaining manual and responsive checks passed; screenshot artifacts were not supplied. Proceed to Phase 5.

## Inventory location and category dropdown follow-up

The follow-up implementation adds Owner-managed stock locations to the Inventory workspace and replaces the web Add Product category text field with a business-scoped select. The location API now supports Owner-only edit/deactivation while Staff continue to receive active locations for permitted reads. Deactivation is non-destructive and preserves stock-movement history. Category creation refreshes the product select and selects the newly created category without clearing the product form.

Follow-up verification on 2026-11-06:

- `python manage.py check` — PASS.
- `python manage.py makemigrations --check --dry-run` — PASS; no changes detected.
- `python manage.py test core.tests.PhaseFourApiTests core.tests.FoundationTests` — PASS; 36 tests.
- `python manage.py test core.tests` — PASS; 64 tests.
- `cd mobile; npx tsc --noEmit` — PASS.
- `cd mobile; npm test -- --run` — PASS; 6 tests.
- `cd mobile; npx expo export --platform android --output-dir $env:TEMP\norrisbeauty-location-category-export` — PASS; Android Hermes bundle exported.

Browser verification completed on 2026-11-06 using the authenticated Owner session:

- Inventory displayed the existing `QA Main` stock line and `QA-LOT-001` receipt.
- **Manage locations** opened and listed existing locations with Edit and Deactivate controls.
- Created `Browser QA Location`; the list refreshed immediately and showed the success toast `Stock location created.`.
- Reopened Record stock movement; `Browser QA Location` and `QA Main` were immediately available in the Location selector.
- After restoring the pre-existing QA fixture product/variant to active status through the documented business-scoped API (the product had been inactive), the Variant selector displayed `QA-Serum-30 · QA-SERUM-30`.
- Duplicate `QA Main` submission was rejected in the UI with the specific message `name: A stock location with this name already exists.`.
- Products opened with a Category select containing `Choose a category` and `Serums`.
- Created `Browser QA Category`; the product form retained its state and automatically selected the new category.
- No stock movement was submitted during manual verification.

The browser reported unavailable external CDN/font resources because network access was unavailable; local application behavior remained testable. Physical Android verification remains unavailable.

## POS follow-up

The authenticated POS page exposed a JavaScript error because `/inventory/stock/` returns an object with a `results` array, while the initializer treated the whole response as an array. The initializer now normalizes `stockResponse.results` before stock lookups. Browser verification confirmed the POS page loads without the `stock.find is not a function` error, lists `QA-Serum-30`, and shows 10 available units when `QA Main` is selected. No sale was submitted.
