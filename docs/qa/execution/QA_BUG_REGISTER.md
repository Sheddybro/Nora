# NorrisBeauty QA bug register

## QA-001 — Mobile dependency audit vulnerabilities

- Severity: Medium
- Status: Open / accepted limitation
- Evidence: `npm audit --omit=dev --audit-level=high` reported 17 vulnerabilities, including 4 high.
- Impact: Production dependency tree includes known advisories.
- Resolution: `npm audit fix --force` requires a breaking Expo SDK change and was not applied during QA.
- Next action: Plan and test an Expo SDK upgrade separately.

## QA-002 — Physical Android acceptance unavailable

- Severity: High
- Status: Blocked by environment
- Evidence: `adb devices -l` is available but reports no connected physical device or emulator.
- Impact: Steps 11–12 and 81–93 cannot be accepted as device tests.
- Resolution: None applied; this is an execution-environment blocker, not a claimed application fix.

## QA-003 — Empty search leaves stale record count

- Severity: Low
- Status: Open
- Evidence: Products, Inventory, POS, and Sales searches returned no matching rows after an unknown query, but the footer/count remained at the previous record count.
- Impact: Users may believe filtered records still exist; this is a UI reporting inconsistency.
- Reproduction: Open Products, Sales, or POS; enter a known match, then replace it with an unmatched term.
- Resolution: Not fixed during this observation pass.

## QA-004 — Direct GET logout endpoint returns 405

- Severity: Low
- Status: Open
- Evidence: Navigating directly to `/logout/` produced HTTP 405; the in-app logout control correctly used the supported flow.
- Impact: Direct bookmarked/logout URL navigation is not graceful.
- Reproduction: While authenticated, navigate to `http://127.0.0.1:8000/logout/`.
- Resolution: Not fixed during this observation pass.

## QA-005 — Navigation overlay intercepts close control

- Severity: Low
- Status: Open
- Evidence: Opening the navigation overlay on Staff Inventory made the main close button fail normal pointer interaction because the sidebar intercepted the event; the overlay close control worked.
- Impact: Responsive navigation may be difficult to close at some viewport states.
- Reproduction: Open Inventory, click `Open navigation`, then click the visible sidebar close control.
- Resolution: Not fixed during this observation pass.

## QA-006 — Staff dashboard metrics remain empty

- Severity: Medium
- Status: Open
- Evidence: Staff Overview rendered Sales net of refunds, Orders, Average order, and Low-stock lines as `—`; Recent sales rendered “No sales recorded yet”, while Staff Sales History and Inventory showed existing business records.
- Impact: Staff cannot rely on the dashboard for current operational metrics or recent activity.
- Reproduction: Sign in as Staff for the QA business and open `/`; compare Overview with `/sales/` and `/inventory/`.
- Resolution: Not fixed during this observation pass.

## QA-007 — Staff “Add a product” shortcut leads to read-only page

- Severity: Low
- Status: Open
- Evidence: Staff Overview quick action labelled “Add a product” navigated to Products & categories, where Staff correctly had no Add product control.
- Impact: The shortcut promises an unavailable Staff action and may confuse users.
- Reproduction: Sign in as Staff, open Overview, select Quick actions > Add a product.
- Resolution: Not fixed during this observation pass.

## QA-008 — Rapid report-period changes can display stale results

- Severity: Medium
- Status: Resolved
- Evidence: Reproduced during the 2026-11-06 Expo Web Owner smoke test. Added latest-request sequencing to the mobile Overview refresh and regression tests. Retested with week/year/month responses deliberately delayed by 1400/800/100 ms; the dashboard displayed the final selected month range (`1 Nov 2026 – 30 Nov 2026`).
- Impact: The selected report period and displayed report data can disagree.
- Reproduction: Sign in as Owner, open Overview, and change the report period several times before the earlier requests finish.
- Resolution: Older Overview responses are ignored when a newer refresh has started or the screen loses focus. Verified by `mobile/tests/requestSequence.test.ts` and the delayed-response Expo Web retest.

## QA-009 — Expired mobile API session leaves Overview loading

- Severity: High
- Status: Resolved
- Evidence: During the 2026-11-06 Expo Web smoke test, authenticated API requests began returning repeated HTTP 401 responses. Overview remained on “Loading live business data…” without a visible error. The in-app sign-out redirected to login, but its API request returned HTTP 403.
- Follow-up (2026-11-07): After a successful re-authentication, focusing API-backed mobile screens refreshed their data, and sign-out returned HTTP 204.
- Follow-up (2026-11-07, expired-access check): On the long-lived Owner Expo Web session, the browser logged HTTP 401 responses after the five-minute access-token lifetime. After returning to Sell, the screen refreshed through the shared API, showed the same two available units as Staff Inventory/POS, and displayed no visible error. Mobile auth tests also passed simultaneous-401 token rotation and late-401 reuse of the rotated token.
- Impact: The mobile client can stop refreshing business data after authentication errors, leaving users unable to determine whether their session is valid or retry safely.
- Reproduction: Sign in as the disposable mobile QA Owner, leave the session active until the access token/refresh lifecycle encounters an error, then return to Overview and inspect API responses.
- Resolution: Authenticated requests now reuse an in-flight refresh or an already-rotated session token and retry once. Logout compares token and user identifiers consistently. Verified by `mobile/tests/auth.test.ts`, successful logout (HTTP 204), and the expired-access Expo Web recovery check. Native-device token-lifecycle verification remains pending.

## QA-010 — Expo Web product photo upload fails after product creation

- Severity: Medium
- Status: Resolved for Expo Web
- Evidence: After the initial HTTP 400 reproduction, the web uploader was changed to send the selected blob as a multipart file. A valid-image save created product ID 8 with a primary image. A simulated HTTP 400 on the image request created product ID 9; the UI offered “Retry photo upload,” and retry saved its primary image without creating a duplicate product. `mobile/tests/catalog.test.ts` passed.
- Impact: Product creation and image upload are separate writes; an upload failure leaves a product saved even though the overall Save action reports failure.
- Reproduction: In Expo Web, select a valid image in Catalog, enter valid product/category/SKU/price fields, and select Save product.
- Resolution: Web uploads now fetch the selected URI as a Blob; failed uploads retain the created product ID so retry attaches the photo instead of recreating the product. Native image-upload verification remains pending.

## QA-011 — POS location changes show zero stock in Expo Web

- Severity: Medium
- Status: Resolved for Expo Web; native Picker retest pending
- Evidence: On 2026-11-07, changing the Owner POS location from Main Studio back to Button Test Location made every variant show `0 available`. The selected location was Button Test Location, and the database had two units of `MOB-BTN-001` there. Initial location display and inventory screens showed the expected stock; the mismatch appeared after changing the POS location.
- Impact: A location change can disable in-stock products and prevent checkout in Expo Web.
- Reproduction: In Expo Web POS, change Checkout location to another location and then select Button Test Location; compare the availability rows to current inventory.
- Follow-up (2026-11-07): POS now normalizes string Picker IDs before comparing them with numeric inventory IDs. The focused regression test passes as part of the 14-test mobile suite, and `npx tsc --noEmit` passes.
- Retest (2026-11-07, isolated QA business): Changed Checkout location from `QA Main` (4 units) to `QA Secondary` (2 units) and back; Expo Web showed the corresponding location balances each time. Exercised the 2-unit stock cap and cart controls at `QA Secondary`, then completed one checkout at `QA Main`. This resolves the observed Expo Web issue.
- Resolution: Resolved for Expo Web. Native Picker behavior remains unverified.

## QA-012 — Mobile login screen diverges from web and shows tabs while signed out

- Severity: Medium
- Status: Resolved for Expo Web
- Evidence: At a 390x844 viewport, the signed-out Expo login displayed the workspace tab bar and lacked the web login hero, visible field labels, and password-recovery action. After the change, the signed-out tab bar is hidden, the mobile login matches the web brand and control hierarchy, empty submit shows validation, and the recovery action opens the Django password-reset page.
- Impact: A signed-out user could see navigation into authenticated workspaces, and the mobile login lacked a web-supported recovery path.
- Reproduction: Open Expo Web while signed out and inspect the login screen at a phone-width viewport.
- Resolution: The tab bar now renders only for an authenticated session. The Expo login reuses the existing hero image and adds the labeled form and password-reset link. Verified on Expo Web at 390x844; native-device appearance and password-reset email completion remain pending.

## QA-013 — Web Owner dashboard does not initialize for its explicit page value

- Severity: Medium
- Status: Resolved for web
- Evidence: The workspace shell sets `data-page="dashboard"`, but `static/js/app.js` previously initialized the Owner dashboard only when the page value was empty. The page loaded without populating its report data.
- Impact: Owner Overview displayed blank metrics and activity even though its authenticated report APIs returned data.
- Reproduction: Sign in as Owner and open `/`; inspect the dashboard with `data-page="dashboard"` and compare its report requests/data to the rendered metrics.
- Resolution: The initializer now handles both `dashboard` and the empty-page fallback. The focused `core.tests.FoundationTests.test_owner_dashboard` regression test passes, and the live dashboard populated from the QA fixture. No unrelated page initialization was changed.

## QA-014 — Mobile Owner Overview lacks web action and activity parity

- Severity: Medium
- Status: Implemented in Expo Web; awaiting user visual approval
- Evidence: The initial mobile Overview lacked a Start a sale action, low-stock count/review link, recent-sales history access, and the web dashboard's POS/Catalog/Stock shortcuts.
- Impact: Owner mobile users had fewer visible paths to the same core workflows and less recent-activity context than web users.
- Reproduction: Sign in as Owner in Expo Web and compare Overview actions and activity access with the live web dashboard and Phase 2 reference.
- Resolution: Added the missing mobile actions and activity links, connected to the existing POS, Catalog, Inventory, and Sales History routes. The period selectors and navigation actions were exercised against a disposable live QA fixture. User approval, native Android/iOS behavior, and the web Month chart's narrow-screen wrapping remain pending.

## QA-015 — Confirm weighted-average valuation and sales cost treatment

- Severity: Medium
- Status: Open — accounting treatment and valid-fixture UI retest pending
- Evidence: The initial `₦43,000.02` weighted-average value versus `₦43,000.00` in batch costs is consistent with the documented two-decimal average (`7 × ₦6,142.86`). The later Expo comparison of `₦48,000.00` versus `₦48,500.00` used directly seeded batches while the variant average remained `₦6,000.00`, so it is not a valid reproduction. A separate normal service-flow probe (receipts of 6 at `₦6,000.00` and 2 at `₦6,500.00`, a one-unit checkout, then a receipt of 1 at `₦6,000.00`) produced 8 units at a rounded weighted average of `₦6,109.38` (`₦48,875.04`) while the remaining batch costs totaled `₦48,500.00`, a `₦375.04` difference.
- Cause: Inventory summaries follow the documented weighted-average-per-variant method, while batches retain their original lot costs. The sale service records the consumed batch's unit cost on the sale movement. It has not been established whether reporting/COGS is intended to follow weighted average or consumed-lot cost, so the two valuation figures cannot yet be classified as a defect.
- Impact: Until the accounting method is confirmed, inventory valuation, sale cost, and refund/report reconciliation cannot be accepted as financially correct. The invalid seeded Expo fixture also means the mobile Stock screen has not been verified using the valid transaction-flow case.
- Reproduction: In an isolated database, use the normal inventory receipt and POS checkout workflows for the transactions above. Compare `8 × ₦6,109.38 = ₦48,875.04` (weighted-average summary) with `SUM(Batch.quantity_on_hand × Batch.unit_cost) = ₦48,500.00` (remaining lot costs), then inspect the associated sale movement and reporting treatment against the business-approved cost method.
- Resolution: No application logic changed. Obtain accounting approval for the cost method, retest the Stock screen with transaction-created data, and add regression coverage for sales, refunds, and reporting before changing financial behavior.

## QA-016 — Pending offline movement is not visible beside the stock action

- Severity: Low
- Status: Resolved
- Evidence: After the persistent status change, the user confirmed Step 90 passed on Android and the movement synced after Wi-Fi returned. The user had separately confirmed restoring stock to its original quantity.
- Impact: A user may not be able to confirm an offline stock adjustment is waiting to sync while working in the adjustment form.
- Reproduction: In Inventory, disconnect from the API, submit a valid stock adjustment, and inspect the queue state before reconnecting.
- Resolution: Added an accessible queued/syncing/synced confirmation beside Record movement. The synced confirmation remains visible after the queue item is removed, until dismissed, and the full queue panel remains available. Offline queue regression tests, TypeScript, Android Expo export, and user-reported Android retest pass. Native background/foreground and conflict-path coverage remain unverified.
