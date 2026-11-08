# Phase 9 verification report

## Status

**IN PROGRESS — code-level mobile parity work is implemented and automated checks pass; device/E2E acceptance remains open.** Login has been approved. Owner Overview and broad Owner/Staff workflow smoke checks have been exercised in Expo Web; native-device verification and visual acceptance remain open.

Verification refresh: 2026-11-07. The checks below were rerun from the current worktree; no device-readiness claim is made.

## Scope implemented

- Exact case-insensitive barcode lookup through the business-scoped catalog API, exposed in catalog, inventory, and POS flows. A keyboard-wedge scanner can enter barcode text; camera/hardware integration is not claimed.
- Expo POS now reads live products, location stock, and locations; prevents adding more units than available; collects a payment method/amount; and posts through the shared checkout API.
- Checkout idempotency is persisted on Sale with a business-scoped unique constraint. Exact retries return the original sale; changed payload reuse is rejected without another stock or payment posting.
- Added a paginated, searchable, authenticated `customers.view` API and connected the mobile Customers screen to business-scoped live customer records. The screen also creates customers through the business-scoped endpoint for authenticated Owner/Staff flows. Customer notes are exposed on create/read responses.
- Added an owner-only mobile purchasing workspace for supplier creation, single-line draft orders, order placement/cancellation, and idempotent partial/full batch receipt through the existing purchasing API. Order creation is also business-scoped and idempotent, including changed-payload conflict detection.
- Stock movement offline queue uses AsyncStorage, is scoped to the authenticated user and business, retries on authenticated app startup/connectivity restoration/foregrounding, preserves idempotency keys, and surfaces permanent conflicts for review. POS checkout remains online-only; background sync is not implemented.

## Automated verification

| Check | Result |
|---|---|
| `cd C:\Users\DELL\Desktop\Developments\NorrisBeauty; .\.venv\Scripts\python.exe manage.py test` | PASS — 60 tests, 0 failures. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty; .\.venv\Scripts\python.exe manage.py check` | PASS — no issues. |
| `cd c:/Users/DELL/Desktop/Developments/NorrisBeauty; .\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run` | PASS — no changes detected. |
| `cd C:\Users\DELL\Desktop\Developments\NorrisBeauty\mobile; npx tsc --noEmit` | PASS — no TypeScript diagnostics. |
| `cd C:\Users\DELL\Desktop\Developments\NorrisBeauty\mobile; npm test -- --run` | PASS — 6 tests, 0 failures. |
| `cd C:\Users\DELL\Desktop\Developments\NorrisBeauty\mobile; npx expo export --platform android --output-dir $env:TEMP\norrisbeauty-current-export` | PASS — Android bundle exported and included the official logo asset. |
| `cd mobile; npx vitest run` | PASS — 14 tests, 0 failures. |
| `cd mobile; npx tsc --noEmit` | PASS — no TypeScript diagnostics. |
| `cd mobile; npx expo export --platform android --output-dir "$env:TEMP\norrisbeauty-login-parity-final-20261107"` | PASS — Android bundle exported with the login hero image and official logo. |
| `DJANGO_SETTINGS_MODULE=config.production ... manage.py check --deploy` | PASS with a strong verification secret; no warnings. |

## Dependency audit

`npm audit --omit=dev --audit-level=high` reported 17 dependency-tree vulnerabilities (4 high). The suggested blanket fix requires a breaking upgrade to Expo 58 from the current SDK 54 baseline, so it was not applied. Review and plan an Expo SDK upgrade separately; do not treat dependency security as clean.

## Manual and visual verification

- Earlier Expo Web checks did not include physical-device acceptance. The user subsequently reported successful Android checks for login password visibility, barcode no-match feedback, POS basket/location and one-unit checkout, and Step 88 customer creation/search/privacy/Staff visibility. No ADB-connected device or Step 88 screenshot was available for independent capture; barcode hardware, airplane-mode recovery, and remaining device checks are still unverified.
- The offline replay worker is foreground-only and has no dedicated automated mobile unit/E2E test yet.
- POS handles ambiguous network results by retaining the basket and reusing its checkout key; this needs device/network interruption verification.
- Expo Web successfully bundled and rendered the shell with in-memory-only auth. Login and Owner Overview screenshots are available for the parity review; remaining screens still need screenshots.
- The supplied official logo was inspected at 1254x1254 and remains byte-identical between `static/img/logo.jpeg` and `mobile/assets/norris-logo.jpeg`; it has a white JPEG background, so transparency is not claimed.

### 2026-11-06 Owner smoke test

- Created disposable Owner and Staff test accounts and a QA business fixture; Owner sign-in through Expo Web succeeded.
- Mobile unit tests (8) and TypeScript check passed.
- Fixed QA-008 with latest-request sequencing and verified a delayed week/year/month response order displayed the final month selection.
- Expo Web Owner smoke checks passed for barcode lookup, stock receipt, POS basket quantity controls and checkout, and customer validation/create/search/cancel.
- **UI test blocked at QA-009:** subsequent authenticated API calls returned repeated 401 responses, Overview remained loading, and logout returned 403. Per the stop-on-failure rule, no further controls were exercised after that failure.
- Expo Web reported missing-default-export warnings for `app/components/AuthContext.tsx` and `app/components/NativeWorkspaceScreen.tsx`.
- No Android SDK, ADB, emulator, or physical device was available. Expo Web is not a substitute for pending Android/iOS device and E2E verification.

### 2026-11-07 mobile continuation (Expo Web)

- `cd mobile; npm test -- --run`: PASS — 10 tests. npm emitted an unknown `--run` config warning; the configured Vitest run completed successfully.
- `cd mobile; npx tsc --noEmit`: PASS — no diagnostics.
- `cd mobile; npx expo export --platform android --output-dir "$env:TEMP\norrisbeauty-phase9-20261107"`: PASS — Android JavaScript bundle and assets exported. This is a bundle check, not a device test.
- Owner flows exercised catalog validation/search, inventory receipt/adjustment and refresh, POS stock limits and checkout, supplier/order/receipt/cancellation, sales/refund, report periods/expense, staff validation, settings validation/save, customers, and logout. The mobile-created sale and inventory changes were also observed in the web workspaces after refresh.
- Staff sign-in succeeded. The Staff Overview loaded business metrics and recent sales; More exposed Customers and Sales history but no owner-only sections. Catalog and stock were readable, and staff POS added/removed a basket item, capped quantity at the two available units, and returned to an empty basket without recording a sale. Staff Sales History displayed the refunded test invoice. No refund was submitted during this Staff check.
- Mobile Inventory and POS both displayed 2 available units for the QA product after the test purchase receipt and refund. No further sale was recorded.
- QA-009 was resolved for Expo Web: after the five-minute access-token lifetime, the long-lived Owner session recovered through refresh/retry, displayed the same two available stock units as Staff, and showed no visible error. Concurrent/late-401 refresh tests passed; logout after re-authentication returned HTTP 204. Native-device token-lifecycle verification remains pending.
- Expo Web emitted the existing Expo Router missing-default-export warnings for `app/components/AuthContext.tsx` and `app/components/NativeWorkspaceScreen.tsx`.
- No valid screenshot comparison against the Phase 2 references was captured during that earlier pass; a first-screen login comparison was captured in the follow-up below. No Android SDK, ADB, emulator, or physical device was available; Expo Web does not establish native UI parity or complete the full button matrix.
- The initial Playwright pointer/locator click did not trigger the Sell-tab route; triggering its registered click handler navigated successfully. Owner POS then refreshed to two available units, matching Staff. Treat the timeout as browser-interaction friction, not a confirmed application navigation defect.
- QA-010 resolved for Expo Web: a valid 100×100 PNG saved with product ID 8. A simulated upload failure followed by “Retry photo upload” saved an image to product ID 9 without duplicating the product. Products 6 and 7 from earlier failed-image attempts remain without images.
- Post-fix verification: `cd mobile; npx vitest run` passed 12 tests; `cd mobile; npx tsc --noEmit` passed; `cd mobile; npx expo export --platform android --output-dir "$env:TEMP\norrisbeauty-phase9-20261107-qa010"` passed. Export is a bundle check, not a device test.
- QA-011 is open: after changing the POS location, Expo Web showed zero available for every product although the selected location had two units of `MOB-BTN-001` in the database. Testing stopped at this finding; native Picker behavior is unverified.

### 2026-11-07 mobile login parity first screen (Expo Web)

- Compared the Expo login screen with the Phase 2 web login reference at a 390x844 CSS viewport. The mobile screen now uses the same hero image, brand treatment, sign-in hierarchy, labeled fields, password-recovery action, and primary button styling, adapted to the mobile layout.
- The workspace tab bar is hidden while signed out. Measured document width matched the 390px viewport, with no horizontal page overflow.
- Submitting empty fields displayed the expected validation message. Selecting “Forgot your password?” opened the Django password-reset page. The reset email submission and completion flow were not exercised.
- A 390x844 browser screenshot was captured and shown in the session review. The integrated browser's file-export path produced a cropped image, so no unverified screenshot file was added to the repository.
- `cd mobile; npx vitest run`: PASS — 14 tests. `cd mobile; npx tsc --noEmit`: PASS. Android bundle export: PASS, including `beauty-art.jpg`.
- QA-011's location-ID normalization has a passing regression test in the suite, but the live Expo Web location-change retest has not been run; the issue remains open. Expo Router missing-default-export warnings remain unchanged.
- Login has been approved. Owner Overview has been exercised in Expo Web and is awaiting user approval; remaining mobile screens and their button matrices still require page-by-page review. Expo Web does not replace Android/iOS device verification.

### 2026-11-07 Owner Overview parity review — pending user approval

- Compared Expo Owner Overview with the Phase 2 reference at `docs/verification/phase2/owner-dashboard-390-final.png` and the live web Owner dashboard.
- Updated the mobile Overview to provide the web-like header and description, a working Start a sale action, live metrics and period selectors, low-stock review, recent-sale history access, and POS/Catalog/Stock shortcuts.
- Exercised Week, Month, and Year selectors; Start a sale; low-stock Review; recent-sales View all; POS, Catalog, and Stock shortcuts; and the bottom navigation. Destinations matched their intended mobile workspaces.
- The disposable live QA fixture showed the same values in web and Expo Web: ₦18,500 sales, 1 order, ₦18,500 average order, 1 low-stock line, and ₦16,000 net after expenses.
- Fixed the web dashboard initializer in `static/js/app.js`: the workspace explicitly sets `data-page="dashboard"`, so the prior empty-page-only check skipped dashboard loading. The dashboard now initializes for either explicit `dashboard` or empty page values.
- Interim screenshots: [mobile Overview](./owner-overview-mobile-390.png) and [web Overview](./owner-overview-web-390.png). The integrated browser's image export/viewport scaling is cropped, so these captures are not final visual-acceptance evidence.
- Observed responsive difference remains: at phone widths, the web Month chart wraps daily columns into multiple rows while the mobile chart keeps one row. This was not changed in this screen pass.
- `cd mobile; npx vitest run`: PASS — 14 tests. `cd mobile; npx tsc --noEmit`: PASS. `.\.venv\Scripts\python.exe manage.py test core.tests.FoundationTests.test_owner_dashboard`: PASS — 1 test.
- `git diff --check`: PASS.
- Android/iOS device testing was not available. Owner Overview is awaiting user approval; no subsequent screen has been reviewed.

### 2026-11-07 isolated Expo Web feature smoke test

This continuation used a separate SQLite database at `%TEMP%\norrisbeauty-mobile-qa.sqlite3`, a disposable `Expo Mobile QA` business, and disposable Owner/Staff accounts. The project development database was not used. Django ran on localhost with a temporary localhost-only CORS bridge for Expo Web.

- Owner authentication and live Overview metrics/period controls loaded from the versioned API. Start a sale navigated to POS.
- Catalog loaded the seeded category/product; exact barcode lookup found the seeded variant and an unknown barcode displayed an error. Empty product submission showed validation. Product creation and image selection/upload both completed; database verification found the created product and image record.
- POS displayed the correct per-location balances when switching between `QA Main` (4 units) and `QA Secondary` (2 units). Add/remove controls worked, quantity was capped at available stock, all four supported payment choices were selectable, negative paid amount was rejected while retaining the basket, and one cash sale completed. The isolated database contained exactly one sale and its payment; stock was deducted once.
- Inventory showed live stock, accepted a receipt and a valid batch adjustment, and rejected an excessive negative adjustment without changing the balance. Barcode variant selection was exercised.
- Customers supported empty-name validation, search/no-match behavior, creating a disposable customer, and cancelling the form.
- Purchasing supported required-supplier validation, supplier creation, draft-order creation, placement, missing receipt-field validation, partial receipt, final receipt, cancellation-reason validation, and draft cancellation.
- Sales history displayed the created invoice. Missing refund reason was rejected; the valid refund completed and restored stock. Reports loaded Week/Month/Year, rejected an empty expense, accepted a disposable expense, and listed it. The PDF/print action was attempted in Expo Web but the browser print surface did not complete, so export is not marked passed.
- Staff sign-in showed the Staff Overview metrics, the Today/Catalog/Sell/Stock/More tabs, and only Customers/Sales history under More. Owner catalog and stock write controls were absent; Staff POS basket quantity controls were exercised and the basket was emptied without posting a sale. Staff direct deep-link permission checks were not completed because Expo Web uses volatile in-memory authentication and a full-page route reload signs the session out.
- ADB is installed, but `adb devices -l` returned no connected device or emulator. These are Expo Web observations, not native Android/iOS acceptance. Screen-reader, rotation, native keyboard/safe-area, physical barcode, offline replay, and full native button coverage remain blocked.
- QA-015 was opened after 7 units with original batch costs of `₦43,000.00` showed a weighted-average summary of `₦43,000.02`, consistent with the documented average rounded to two decimals. A separate `₦49,000.00` versus `₦48,816.32` observation lacked a preserved transaction composition. No valuation code was changed.
- The Expo Router warnings about missing default exports in `app/components/AuthContext.tsx` and `app/components/NativeWorkspaceScreen.tsx` appeared during the web run and were not changed.

### 2026-11-08 mobile-focused QA continuation

A fresh isolated SQLite database (`%TEMP%\norrisbeauty-qa100-followup.sqlite3`) and separate temporary media root were used. Expo Web was tested at 390×844 through a local-only CORS bridge; the project database was not used.

- Owner and Staff sign-in succeeded. Owner and Staff tab routes were checked; the five-tab shell stayed at 390px document width on a 390px viewport. Native touch, keyboard, Back, rotation, and safe-area behavior are still blocked because no emulator/device is attached.
- Owner Catalog found the exact barcode and reported an unknown barcode. A product created from the web Catalog appeared after Expo refresh with its matching SKU and price.
- POS switched between locations (6 Main / 2 Secondary initially), resolved the exact barcode, preserved the basket on an unknown code, capped quantity at the two available units, and allowed removal.
- One Expo Web card checkout produced one invoice, one payment, and one stock deduction; the invoice and updated stock were visible in web Sales History and Inventory.
- Customers showed the active QA customer and omitted the inactive customer. Staff More showed only Customers and Sales History, and Staff Reports API access returned 403.
- With browser networking disabled, Inventory queued one adjustment. On reconnection the foreground queue replayed the same unique key exactly once, cleared the queue, and updated the backend ledger/web balance. Device foreground/background sync remains unverified.
- The earlier Expo comparison of `₦48,000.00` to `₦48,500.00` was invalid because its directly seeded batches left the variant average stale. A separate normal receipt/checkout/receipt service-flow probe produced a weighted-average summary of `₦48,875.04` versus `₦48,500.00` in remaining batch costs. The cost/COGS method remains unconfirmed. Step 85 is BLOCKED pending a valid-fixture Stock-screen retest; step 93 passes because unique-key quantity synchronization and cross-client balances matched.
- Safe isolated API checks returned 401 unauthenticated, 404 for a product belonging to another tenant, 400 with a structured invalid-pagination response, and 403 for Staff Reports.
- Twelve bounded invalid logins triggered the configured 429 rate limit. A valid login succeeded after the 62-second throttle window.
- Complete Django suite: 66/66; mobile Vitest: 14/14; TypeScript, Android Expo export, Django check, migration check, and `git diff --check`: PASS.
- Automated rerun on 2026-11-08: `manage.py test` passed 66/66 (207.414 seconds), `npx vitest run` passed 14/14, `npx tsc --noEmit`, `manage.py check`, `makemigrations --check --dry-run`, Android Expo export, and `git diff --check` passed. `adb devices -l` listed no connected device.
- At this continuation, the shared Expo Web page was disconnected from Metro, and local API/web endpoints refused connections. The existing web Inventory page's theme toggle worked and was restored. Opening Notifications displayed `Failed to fetch` after the unavailable API request; this is an environment limitation, not a reproduced service-side defect. No data-mutating browser actions were attempted.
- Added a password visibility toggle to the Expo login: masked by default, with accessible Show/Hide labels and unchanged password text while toggling. The user confirmed on their Android phone that both states work and the text is preserved. `npx vitest run` passed 14/14, `npx tsc --noEmit` passed, and `git diff --check` was rerun. Native keyboard, rotation, screen-reader acceptance, and screenshot evidence remain pending; no device is connected over ADB.
- Android Catalog follow-up: the user confirmed valid barcode lookup but reported that an invalid barcode showed no feedback. The app now displays a local, accessible no-match message beneath the lookup button, clears stale matches when the query changes, and keeps request errors in the same panel. Added a unit test for empty API search results; mobile tests passed 15/15 and TypeScript passed. The user confirmed both valid lookup and corrected visible no-match feedback on device.
- Step 84 remains BLOCKED until catalog search, refresh, empty-state, and network error/retry checks are completed. Current overall totals are 51 PASS, 0 FAIL, 49 BLOCKED, and 0 NOT APPLICABLE.
- User-reported Android QA confirms the Step 86 location/basket behavior and a Step 87 one-unit online checkout. The checkout completed, cleared the basket, and reduced QA Main stock once. Alternate payment methods and interrupted/uncertain-result retry remain untested on device.
- For Step 88, the user confirmed Android customer creation, searches by name/email/phone, no-match behavior, hidden notes in the list, and Staff visibility. Pagination, API stop/restart, and network-error behavior remain unverified; no screenshot was saved.
- For Step 89, the user confirmed Android Owner More navigation, disposable supplier/order create/place/partial-and-final receipt/cancellation, and Staff More role filtering. No screenshot was saved; richer purchasing and remaining native checks remain unverified.
- For Step 90, after the persistent status update, the user confirmed the Android queue status appeared, the movement synced after Wi-Fi returned, and Step 90 passed. The user separately confirmed stock was restored. Native background/foreground and conflict cases remain unverified.
- QA results now record 51 PASS, 0 FAIL, 49 BLOCKED, and 0 NOT APPLICABLE. Native acceptance and final release approval remain BLOCKED.

### 2026-11-08 Android customer and purchasing QA — user-reported

- For Step 88, the user confirmed Android customer creation, searches by name/email/phone, no-match behavior, hidden notes in the list, and Staff visibility.
- For Step 89, the user confirmed Android Owner More navigation and the disposable supplier/order lifecycle, including placement, partial/final receipts, and cancellation; Staff More showed only permitted links.
- For Step 90, the user confirmed the updated queued/syncing/synced message appeared and the queued adjustment replayed after Wi-Fi returned. The user had confirmed stock restoration; native background/foreground and conflict checks remain open.
- Pagination, API stop/restart, and network-error behavior for Customers remain unverified. No screenshots were saved; these device outcomes are user-reported and were not independently captured.

### QA-016 offline queue visibility follow-up — 2026-11-08

- Added a persistent queued/syncing/synced status beside the stock Record movement control, retaining the existing full queue panel. The completion confirmation remains visible after successful replay until dismissed.
- Added a regression test confirming the status can resolve from pending to synced after the mutation is removed from the queue.
- `npx vitest run tests/offlineQueue.test.ts`: PASS — 8 tests; `npx vitest run`: PASS — 17 tests across 5 files; `npx tsc --noEmit`: PASS; Android Expo export: PASS; `git diff --check`: PASS. User-reported Android retest passed; no device screenshot was captured.

Verification after the smoke test:

| Check | Result |
|---|---|
| `cd mobile; npx vitest run` | PASS — 14 tests across 5 files. |
| `cd mobile; npx tsc --noEmit` | PASS — no diagnostics. |
| `.\.venv\Scripts\python.exe manage.py test core.tests.PhaseNineMobileCompletionApiTests` | PASS — 3 tests. |
| `.\.venv\Scripts\python.exe manage.py check` | PASS — no issues. |
| `git diff --check` | PASS. |
| `npx expo export --platform android --output-dir "$env:TEMP\norrisbeauty-mobile-qa-export"` | PASS — Android bundle exported; no device was connected. |

## Remaining Phase 9 work

- Complete the native Android/iOS device matrix: keyboard-wedge scanner, native queue replay/conflict handling, POS checkout/retry, rotation, keyboard/safe-area behavior, and remaining controls; capture required screen screenshots.
- Exercise the PDF/print action and test native network interruption, app foregrounding, and token/session recovery.
- Obtain accounting approval for the valuation/COGS method and test sales, refunds, and reporting against it. Retest the Expo Stock screen using valid transaction-created data before deciding whether code changes are required.
- Review the Expo dependency audit findings and router warnings separately.

### 2026-11-08 login hero copy removal and private APK preparation

- Removed the hero overlay text from the native Expo login image; preserved the background artwork, logo, and sign-in form.
- Expo Web verification at a 390px CSS viewport confirmed the requested copy is absent, both logos and the form remain, and document width is exactly 390px.
- Screenshot: [Expo login at 390px](./login-no-hero-copy-390.png). This is a viewport screenshot of the scrollable login page, not native-device acceptance.
- `npx vitest run`: PASS — 17 tests across 5 files. `npx tsc --noEmit`: PASS. Android Expo export: PASS — 2.73 MB Hermes bundle.
- The internal APK profile `privateDemo` was added with the demo HTTPS API URL; `eas config --platform android --profile privateDemo --json --non-interactive` resolved it successfully. Expo project linked as `@sheddybro/norrisbeauty`.
- No APK has been produced. `eas build --local --platform android --profile privateDemo` failed because local EAS Android builds require macOS or Linux. The Windows Android SDK installation lacks platform/build tools and command-line tools, Java 11 is installed, and `adb devices -l` shows no connected device.
- EAS cloud build was not submitted because it would upload repository source to Expo. Install a supported local Android toolchain to continue without a source upload.
- After restarting the relevant local terminals, Django `/health/` and Expo Web both returned HTTP 200 at ports 8000 and 8081. The hosted PythonAnywhere health and login pages also loaded; the removed copy is absent there.
- Native Android/iOS acceptance and production release remain blocked. The demo SQLite API must not receive real business records.

## Decision

Backend/mobile regressions, TypeScript checking, and Android bundling pass. Expo Web Owner and Staff workflows received broad disposable-fixture smoke coverage, but Phase 9 remains **IN PROGRESS** until device/E2E and visual acceptance are completed and QA-015 is dispositioned.
