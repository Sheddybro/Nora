# Phase 9 verification report

## Status

**IN PROGRESS — code-level mobile parity work is implemented and automated checks pass; device/E2E acceptance remains open.** No physical Android/iOS device or screenshot review was available for this pass.

## Scope implemented

- Exact case-insensitive barcode lookup through the business-scoped catalog API, exposed in catalog, inventory, and POS flows. A keyboard-wedge scanner can enter barcode text; camera/hardware integration is not claimed.
- Expo POS now reads live products, location stock, and locations; prevents adding more units than available; collects a payment method/amount; and posts through the shared checkout API.
- Checkout idempotency is persisted on Sale with a business-scoped unique constraint. Exact retries return the original sale; changed payload reuse is rejected without another stock or payment posting.
- Added a paginated, searchable, authenticated `customers.view` API and connected the mobile Customers tab to business-scoped live customer records. Customer notes are not exposed. Customer creation remains out of scope for this pass.
- Added an owner-only mobile purchasing workspace for supplier creation, single-line draft orders, order placement/cancellation, and idempotent partial/full batch receipt through the existing purchasing API. Order creation is also business-scoped and idempotent, including changed-payload conflict detection.
- Stock movement offline queue uses AsyncStorage, is scoped to the authenticated user and business, retries on authenticated app startup/connectivity restoration/foregrounding, preserves idempotency keys, and surfaces permanent conflicts for review. POS checkout remains online-only; background sync is not implemented.

## Automated verification

| Check | Result |
|---|---|
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty; .\.venv\Scripts\python.exe manage.py test core.tests.PhaseFivePurchasingApiTests core.tests.PhaseSixSalesApiTests core.tests.PhaseNineMobileCompletionApiTests` | PASS — 12 tests, 0 failures. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty; .\.venv\Scripts\python.exe manage.py test` | PASS — 49 tests, 0 failures. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty; .\.venv\Scripts\python.exe manage.py check` | PASS — no issues. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty; .\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run` | PASS — no changes detected. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty; .\.venv\Scripts\python.exe manage.py migrate` | PASS — applied pending migrations `0008` through `0013`, including sale and purchase-order idempotency. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty/mobile; npx tsc --noEmit` | PASS — no TypeScript diagnostics. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty/mobile; npx expo export --platform android --output-dir $env:TEMP\norrisbeauty-phase9-final` | PASS — Android bundle exported (2.69 MB). |

## Dependency audit

`npm audit --omit=dev --audit-level=high` reported 30 dependency-tree vulnerabilities (4 high). The suggested blanket fix requires a breaking upgrade to Expo 58 from the current SDK 54 baseline, so it was not applied. Review and plan an Expo SDK upgrade separately; do not treat dependency security as clean.

## Manual and visual verification

- No physical Android/iOS workflow, barcode hardware, airplane-mode recovery, or device screenshot was run. No device acceptance is claimed.
- The offline replay worker is foreground-only and has no dedicated automated mobile unit/E2E test yet.
- POS handles ambiguous network results by retaining the basket and reusing its checkout key; this needs device/network interruption verification.
- Expo Web successfully bundled and rendered the shell with in-memory-only auth; no responsive screenshot review was captured in this pass.

## Remaining Phase 9 work

- Verify barcode input, stock queue replay/conflicts, POS checkout/retry, and customer listing on a physical Android or iOS device; capture required screen screenshots.
- Add automated mobile tests for offline queue persistence, identity scoping, conflict retention/dismissal, and retry behavior.
- Complete customer creation and richer multi-line purchase-order editing only after their UI/API acceptance scope is defined; implement background synchronization only with explicit platform constraints and tests.

## Decision

Backend regressions, TypeScript checking, and Android bundling pass. Phase 9 remains **IN PROGRESS** until device/E2E and visual acceptance are completed.
