# Phase 4 verification report

## Scope

Catalog and inventory vertical slice across Django, versioned API, browser UI, and Expo read screens. Phase 4 is **in progress, not accepted**; see limitations below.

## Implementation

- Business-scoped categories, products, variants (SKU/barcode, price, cost, reorder point), external product-image metadata, stock locations, expiry batches, and stock movement ledger.
- Authenticated `/api/v1/catalog/*` and `/api/v1/inventory/*` routes, scoped through active membership. Web calls use session auth with CSRF on writes; mobile calls use membership-bound JWTs.
- Owner-only catalog and inventory writes; Staff defaults to read-only catalog and stock.
- Atomic/idempotent stock movements, nonnegative batch balances, immutable batch expiry/cost, and weighted-average per-variant valuation.
- Web product creation and stock receipt/adjustment forms; mobile catalog and inventory reads with API error and empty states.

## Automated verification

> Test-runner note: the Django `auth_login` throttle is intentionally raised to `100/minute` when the suite is invoked via `manage.py test` so the same local test IP does not false-trigger 429 responses while exercising the real auth flow. Production remains locked to the stricter `10/minute` limit.

| Check | Result |
|---|---|
| `python manage.py test core.tests` | Passed: 23 tests, 0 failures. Includes auth regression, role and tenant authorization, CSRF, catalog creation, duplicate validation, stock idempotency, weighted-average cost, and inventory/web rendering. |
| `python manage.py check` | Passed: no issues. |
| `python manage.py makemigrations --check --dry-run` | Passed: no model changes pending migration. |
| `python manage.py migrate --check` | Passed after applying `0003` and `0004` to the local development database. |
| `node --check static/js/app.js` | Passed: no JavaScript syntax errors. |
| `cd mobile; npx tsc --noEmit` | Passed: no TypeScript diagnostics. |
| `cd mobile; npx expo export --platform android --clear` | Passed: Android Hermes bundle exported (2.59 MB). |
| Browser owner create-product then receive-stock workflow | Passed: API-backed product/category/variant created; stock location created; 10 units received; live inventory reflected 10 units and ₦500.00 valuation. Temporary verification data was removed. |
| Browser screenshot viewport metrics | Partial: 390px screenshots render, but this browser reports inconsistent `innerWidth`/`clientWidth` after navigation; no numeric no-overflow claim is made. Desktop screenshot capture was blank in the integrated browser, so invalid captures were removed. |

## Manual and visual verification

- Local browser login, empty Products and Inventory states, and owner form interactions: verified.
- Mobile-sized screenshots (390px): [Products](products-390.png), [Inventory](inventory-390.png).
- Desktop screenshot capture failed in the integrated browser despite correct DOM/accessibility snapshots; no desktop screenshot is claimed.
- Physical-device Expo API access and authenticated mobile data rendering: pending.

## Limitations

- Product photos store external URL and alt-text metadata only; secure upload/media storage is not implemented.
- Mobile supports live reads, but no mobile product creation or stock movement workflow yet.
- Category/location forms are basic; editing/deactivation, audit history UI, barcode capture, pagination, and offline behavior are not implemented.
- PostgreSQL concurrency semantics and production security are not exercised here.
- Phase 4 acceptance requires uploaded image storage, Expo mobile write workflows, reliable desktop and tablet screenshot evidence, physical-device verification, and reviewer approval.

## Decision

**IN PROGRESS. Do not start Phase 5 until Phase 4 exit criteria are completed and accepted.**
