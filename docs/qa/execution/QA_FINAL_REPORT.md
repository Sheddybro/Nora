# NorrisBeauty QA final report

## Outcome

**BLOCKED — not production-ready for final acceptance.**

## Executed evidence

- Live `/health/` and `/api/v1/health/`: HTTP 200.
- Isolated SQLite migration and check: PASS.
- Django regression suite: PASS, 66 tests.
- Mobile Vitest: PASS, 14 tests across 5 files.
- Mobile TypeScript: PASS, no diagnostics.
- Production deployment check with strong temporary secret: PASS, no warnings.
- Real browser login as disposable Owner: PASS.
- Real browser POS cash sale: PASS; stock changed from 10 to 9 and basket cleared.

## Counts

- PASS: 51
- FAIL: 0
- BLOCKED: 49
- NOT APPLICABLE: 0

Counts are derived from `QA_RESULTS_001_TO_100.md`; automated coverage is not substituted for missing browser/device execution.

## Mobile-focused QA continuation — 2026-11-08

Used a new isolated SQLite database and disposable Owner, Staff, catalog, stock, and customer fixtures. Expo Web was tested at a 390×844 viewport through a temporary localhost-only CORS bridge; no project database data was used.

- Expo Web rendered and accepted Owner and Staff sign-in. Owner and Staff tab routes worked. All five routes had document width 390px at a 390px viewport.
- Expo Catalog loaded the QA product, found the exact barcode, reported an unknown barcode, and displayed the web-created QA product after refresh.
- Expo POS switched locations and showed 6 Main / 2 Secondary units at baseline; exact barcode lookup added a basket item, unknown lookup preserved the basket, the two-unit stock cap disabled the increment button, and removal worked.
- One card checkout created exactly one sale, payment, and stock deduction. Web Sales History showed the invoice and web Inventory reflected the balance.
- Owner Customers showed the active QA customer and omitted the inactive customer. Staff API access to Customers succeeded while Staff Reports returned 403; Staff More showed Customers/Sales and omitted Owner-only links.
- A stock adjustment created while browser networking was disabled was queued. Reconnection replayed it exactly once, cleared the queue, and the web/API ledger showed the same adjustment. Native background/foreground behavior remains untested.
- Web-created `QA100 Web Product` (`QA100-WEB`, ₦1,234.00) appeared in Expo Catalog after refresh.
- The earlier ₦48,000.00 versus ₦48,500.00 Expo comparison used an invalid directly seeded fixture with a stale variant average. A separate normal receipt/checkout/receipt service-flow probe produced 8 units at a weighted-average summary of ₦48,875.04 versus ₦48,500.00 in remaining batch costs. This leaves QA-015 open as an accounting-method question; the Expo Stock screen still needs a valid-fixture retest.
- Safe isolated API checks returned 401 without authentication, 404 for another tenant's product, 400 with a structured error for a malformed customer page limit, and 403 for Staff Reports.
- Twelve bounded invalid login attempts against the disposable QA account triggered 429 throttling. A valid attempt remained throttled during the window and succeeded after a 62-second wait.
- The complete Django suite passed 66/66; mobile tests passed 14/14; TypeScript, Android Expo export, Django check, migration check, and `git diff --check` passed.
- Automated checks were rerun on 2026-11-08: Django 66/66 (207.414 seconds), Vitest 14/14, TypeScript, Django check, migration check, and Android Expo export all passed. `adb devices -l` showed no connected device. The shared Expo Web session was disconnected from Metro; Django/API endpoints on the shared browser's ports refused connections. On the existing web Inventory page, the theme toggle changed mode and was restored; opening Notifications showed `Failed to fetch` due to the unavailable local API. These stale-session observations do not establish native or live-service acceptance.
- Added an accessible Show/Hide control to the mobile login password field. The default remains masked; the toggle changes only visibility. The user confirmed both states and preserved text on their Android phone. Mobile Vitest (14/14) and TypeScript checks pass; keyboard, rotation, screen-reader acceptance, and screenshots remain outstanding.
- The user verified a valid barcode lookup on Android but reported that an invalid barcode gave no visible feedback. Updated Catalog to show success, no-match, and request-error messages in the barcode lookup panel and clear stale matches when the input changes. Added a unit test for an empty barcode-search response. The user confirmed the corrected no-match message is visible on Android; search, refresh, empty-state, and network error/retry checks remain open.
- QA Step 84 remains BLOCKED for those uncompleted checks; current matrix totals are 51 PASS, 0 FAIL, 49 BLOCKED, 0 NOT APPLICABLE.
- The user confirmed Android POS basket/location behavior for Step 86 and a one-unit online checkout for Step 87. The checkout cleared the basket and reduced QA Main stock once. Alternate payment methods and uncertain-result retry were not confirmed on device.
- For Step 88, the user confirmed on Android that a disposable customer could be created and found by name, email, and phone; a no-match query showed no result; notes were absent from the list; and Staff could see the customer. Pagination, API stop/restart, and network-error behavior remain unverified, and no screenshot was saved.
- For Step 89, the user confirmed on Android that Owner More modules opened and the disposable supplier/order create, place, partial/final receipt, and cancellation flows worked; Staff More showed only its permitted links. No screenshot was saved; richer multi-line purchasing and remaining native checks are unverified.
- For Step 90, after the persistent queued/syncing/synced status change, the user confirmed the status appeared on Android, the adjustment synced after Wi-Fi returned, and Step 90 passed. The user had separately confirmed stock was restored. Native background/foreground and conflict paths remain unverified; no screenshot was saved.
- Queue visibility follow-up verification: focused offline queue tests passed 8/8; full mobile Vitest passed 17/17 across 5 files; TypeScript, Android Expo export, and `git diff --check` passed. The attached Expo browser remained on a stale login page, so no independent Inventory screenshot could be captured.

The full mobile execution record is in `QA_RESULTS_001_TO_100.md`. Android observations for Steps 82, 84, and 86–90 are user-reported; no ADB-connected device or emulator and no screenshots for Steps 88–90 were available for independent capture. Other native Android/iOS acceptance remains open.

## Open limitations

1. Android/physical-device testing is blocked because `adb devices -l` found no connected device or emulator.
2. The mobile dependency tree has 17 audit findings, including 4 high, and remediation requires a breaking Expo SDK upgrade.
3. Native button/visual coverage, remaining reference-image comparisons, native offline replay/conflict handling, token-expiry/recovery on device, PDF printing, and end-to-end password-reset email completion remain incomplete. Expo Web stock replay passed; that does not verify native lifecycle behavior. The mobile login recovery link opens the Django password-reset page.

## Interactive observation pass

The shared browser exercised page controls and safe form paths across every Owner workspace. It also created the documented disposable `QA Customer` and a `QA disposable expense` to verify successful writes and report reconciliation. New UI observations are tracked as QA-003 through QA-005 in the bug register; no application code was changed during this observation pass.

## Mobile UI smoke test — 2026-11-06

- Created and signed in with disposable `mobile-qa-owner` and `mobile-qa-staff` accounts in `Mobile UI QA Business`; seeded one product, one location, and eight stock units.
- `python manage.py check`: PASS.
- `cd mobile; npm test`: PASS — 8 tests.
- `cd mobile; npx tsc --noEmit`: PASS — no diagnostics.
- Expo Web rendered the login screen and accepted the Owner sign-in through a temporary localhost-only CORS bridge.
- Fixed QA-008 by ignoring stale Overview responses. A delayed-response retest (week/year/month delayed by 1400/800/100 ms) showed the date range for the final selected month.
- Owner smoke checks passed for catalog loading and barcode lookup, stock receipt (+2 units), POS quantity increment/decrement and card checkout (stock then showed 9 available), customer validation/create/search/cancel, and empty customer search.
- Testing stopped at QA-009 for that 2026-11-06 session: later authenticated API calls returned repeated HTTP 401 responses, Overview stayed on “Loading live business data…”, and sign-out returned HTTP 403. See the continuation below for later recovery checks.
- Expo Web emitted Expo Router warnings that `app/components/AuthContext.tsx` and `app/components/NativeWorkspaceScreen.tsx` are routes without default exports.
- No Android SDK, ADB, emulator, or physical device was available. Expo Web does not satisfy physical-device acceptance; the full Owner/Staff button matrix remains incomplete.

## Mobile UI continuation — 2026-11-07

- `cd mobile; npm test -- --run`: PASS — 10 tests. npm emitted an unknown `--run` config warning; Vitest completed successfully.
- `cd mobile; npx tsc --noEmit`: PASS — no TypeScript diagnostics.
- `cd mobile; npx expo export --platform android --output-dir "$env:TEMP\norrisbeauty-phase9-20261107"`: PASS — Android bundle exported; no Android device was exercised.
- Owner Expo Web checks continued across catalog, inventory, POS, purchasing, sales/refunds, reports, staff, settings, customers, and logout. The mobile-created invoice and stock changes were visible in the web workspace after refresh.
- Staff Expo Web checks confirmed successful sign-in, populated Overview metrics/activity, role-limited More navigation, catalog/stock reads, customer listing, and Sales History. Staff POS quantity controls enforced the two-unit stock cap; the basket was emptied without recording a sale. The refunded QA invoice appeared with refunded status.
- Mobile Inventory and POS displayed two units for the QA product after the recorded purchase receipt and refund. After the five-minute access-token lifetime, the long-lived Owner Expo Web session recovered through refresh/retry, showed the same stock, and displayed no visible error. Concurrent/late-401 tests passed; logout returned HTTP 204. QA-009 is resolved for Expo Web; native lifecycle verification remains pending.
- Expo Web still emitted the missing-default-export warnings for `AuthContext.tsx` and `NativeWorkspaceScreen.tsx`.
- No valid Phase 2 reference-image screenshot comparison or native Android/iOS test was completed. Do not treat Expo Web as device acceptance or claim the entire button matrix is complete.
- The initial Playwright pointer/locator click did not trigger the Sell-tab route; invoking its registered click handler navigated successfully. Owner POS refreshed to the same two available units as Staff. The initial timeout was browser-interaction friction, not a confirmed app defect.
- QA-010 was fixed for Expo Web: a valid 100×100 PNG saved with product ID 8; a simulated upload failure then retried successfully for product ID 9 without duplicating the product. The malformed/failed attempts left products 6 and 7 without images.
- Post-fix checks: `cd mobile; npx vitest run` passed 12 tests, `cd mobile; npx tsc --noEmit` passed, and the Android bundle export passed. This does not constitute device acceptance.
- QA-011 remains open: changing the POS location caused Expo Web to show zero stock for every product while the selected location had two units of the QA product in the database. A Picker-ID normalization and regression test are now present; the 14-test suite and TypeScript check pass, but the live location-change retest and native Picker behavior remain unverified.

## Mobile login parity — 2026-11-07

- Reviewed the first mobile screen against the Phase 2 web login at a 390x844 viewport. The Expo login now uses the shared hero image and brand hierarchy, visible labels, a password-recovery action, and the sign-in button treatment; workspace tabs are hidden when signed out.
- Empty sign-in submission displayed validation. Password recovery opened the Django reset page. No reset email was submitted.
- Captured and reviewed a 390x844 Expo Web screenshot in the session. Native Android/iOS visual acceptance and the remaining screen-by-screen user approvals are still pending.
- `cd mobile; npx vitest run`: PASS — 14 tests. `cd mobile; npx tsc --noEmit`: PASS. Android bundle export: PASS and includes the hero image.
- QA-012 is resolved for Expo Web; it does not claim native-device acceptance or full mobile/web parity.

## Mobile Owner Overview parity — 2026-11-07

- Compared Expo Owner Overview with the Phase 2 reference and the live web Owner dashboard. Added a working Start a sale action, low-stock review, recent-sales history access, and POS/Catalog/Stock shortcuts while preserving live metrics and period selectors.
- Tested Week, Month, and Year, Start a sale, low-stock Review, recent-sales View all, the three shortcuts, and bottom navigation. The disposable QA business showed matching web/mobile values: ₦18,500 sales, 1 order, ₦18,500 average order, 1 low-stock line, and ₦16,000 net.
- Fixed web dashboard initialization for both `data-page="dashboard"` and the empty-page fallback. The focused dashboard test passes.
- Interim screenshots: `docs/verification/phase9/owner-overview-mobile-390.png` and `owner-overview-web-390.png`. Integrated-browser screenshot export is cropped, so these are not final visual-acceptance evidence. The web Month chart still wraps daily columns into multiple rows at phone widths while the mobile chart keeps one row.
- `cd mobile; npx vitest run`: PASS — 14 tests. `cd mobile; npx tsc --noEmit`: PASS. `.\.venv\Scripts\python.exe manage.py test core.tests.FoundationTests.test_owner_dashboard`: PASS — 1 test.
- `git diff --check`: PASS.
- Owner Overview awaits user approval before the next screen. Android/iOS device verification and the narrow-screen chart difference remain open.

## Isolated Expo Web feature smoke test — 2026-11-07

- Used a temporary SQLite database under `%TEMP%` and disposable `Expo Mobile QA` Owner/Staff accounts. The project database was not changed by test fixture creation.
- Expo Web Owner verified sign-in, Overview period buttons and Start a sale; Catalog barcode success/failure, empty form validation, product creation and product photo upload; Inventory receipt, batch adjustment and invalid overdraw; POS location switching, add/remove and stock cap, payment choices, negative-amount validation and one checkout; customer search/empty state/create/cancel; supplier creation, draft/place/partial receive/full receive/cancel; Sales History and a valid refund after reason validation; and report periods/expense creation.
- Staff sign-in showed only Today/Catalog/Sell/Stock/More tabs and Customers/Sales History under More. Catalog/inventory write controls were absent; POS quantity cap and basket removal were checked. Full-page direct deep-link authorization tests were not completed because Expo Web uses volatile in-memory sessions and reloads sign out.
- The temporary database verification found one sale and one checkout payment; the extra payment record is the separately recorded refund. Stock movement and batch balances were inspected. No production or real customer data were used.
- POS displayed 4 units at `QA Main` and 2 at `QA Secondary` when switching locations. This retest resolves the Expo Web behavior in QA-011; native Picker behavior remains pending.
- QA-015 was filed after an initial normal-receipt observation of `₦43,000.02` for 7 units versus `₦43,000.00` in original batch costs; the two-cent difference is consistent with the documented average rounded to two decimals. A later `₦49,000.00` versus `₦48,816.32` observation lacked transaction details. Its supposed larger reproduction (`₦48,000.00` versus `₦48,500.00`) used a directly seeded fixture with a stale variant average and is invalid. No application code was changed.
- The PDF/print action was attempted but no browser print surface completed. It is not marked passed. ADB was present, but `adb devices -l` returned an empty device list; Expo Web is not native acceptance.
- Current checks: `npx vitest run` — 14/14; `npx tsc --noEmit` — PASS; `python manage.py test core.tests.PhaseNineMobileCompletionApiTests` — 3/3; `python manage.py check` — PASS; Android bundle export — PASS; `git diff --check` — PASS.
- Per-step device results 81–93 remain BLOCKED in `QA_RESULTS_001_TO_100.md`; this web smoke test does not change those device acceptance statuses.

## Production-readiness assessment

Backend regression and representative authenticated browser/mobile-web workflows are healthy, but QA-015 remains open pending accounting-method confirmation and valid-fixture UI retest. Final release acceptance is not granted until the full browser matrix, native Android/device evidence, and mobile dependency audit findings are dispositioned.
