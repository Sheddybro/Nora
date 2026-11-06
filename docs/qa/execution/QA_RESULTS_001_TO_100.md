# NorrisBeauty QA results 001–100

Status values are PASS, FAIL, BLOCKED, or NOT APPLICABLE. Evidence is intentionally conservative: automated coverage is not presented as physical-device acceptance.

| Step | Result | Actual result and evidence |
|---:|:---:|---|
| 01 | PASS | Live health endpoints returned 200; isolated SQLite migrations and `check` passed. |
| 02 | PASS | Owner context `Norris QA Business` and Owner role were visible in the authenticated browser. |
| 03 | PASS | QA product, variant, location, and opening stock were visible through the live POS/catalog API-backed UI. |
| 04 | BLOCKED | One live POS screenshot captured; required multi-width web and mobile baseline set was not fully captured. |
| 05 | PASS | Separate SQLite database migrated cleanly without touching the application database. |
| 06 | PASS | Logged out and signed back in as disposable `owner.qa`; redirected to Owner dashboard. |
| 07 | BLOCKED | Invalid credential permutations were not run in the browser run. |
| 08 | PASS | Real browser logout redirected to `/login/`; authenticated page was no longer shown. |
| 09 | BLOCKED | Reset pages exist, but disposable email/reset-link completion was not exercised. |
| 10 | BLOCKED | API health was verified; token/me/permissions calls were not separately captured in this run. |
| 11 | BLOCKED | No Android/Expo device or emulator is available. |
| 12 | BLOCKED | Device token lifecycle could not be exercised. |
| 13 | PASS | Permission behavior is covered by the Django regression suite. |
| 14 | BLOCKED | Full protected-route and CSRF permutation was not manually captured. |
| 15 | BLOCKED | Recovery permutations were not separately executed. |
| 16 | PASS | Owner dashboard loaded after real login with Owner account context. |
| 17 | BLOCKED | Staff browser session was not executed in this run. |
| 18 | PASS | Products and POS workspace navigation loaded through the real browser. |
| 19 | BLOCKED | Theme persistence was not captured. |
| 20 | BLOCKED | Empty-state/refresh comparison was not fully executed. |
| 21 | BLOCKED | Required 1440/768/390 responsive evidence set was not completed. |
| 22 | BLOCKED | Full keyboard/screen-reader review was not completed. |
| 23 | BLOCKED | Notification and error-presentation permutations were not completed. |
| 24 | PASS | Browser navigation and reload were exercised during Products/POS navigation. |
| 25 | PASS | Branded logo rendered in the live authenticated shell. |
| 26 | PASS | Products page listed QA-Serum-30, SKU, price, category, and active status. |
| 27 | BLOCKED | Category duplicate/invalid submissions were not run in the UI. |
| 28 | BLOCKED | Nested product creation was not run in the UI. |
| 29 | PASS | Validation and uniqueness behavior are covered by Django regression tests. |
| 30 | BLOCKED | Deactivation workflow was not run to preserve the reusable QA fixture. |
| 31 | BLOCKED | Image upload was not executed in this browser run. |
| 32 | PASS | Upload validation is covered by automated backend tests. |
| 33 | PASS | POS location selector displayed QA Main and other business locations in the live page. |
| 34 | PASS | Inventory receipt/weighted-average behavior is covered by the Django suite. |
| 35 | PASS | Negative-balance validation is covered by the Django suite. |
| 36 | PASS | Stock idempotency is covered by automated backend tests. |
| 37 | PASS | Batch/expiry invariants are covered by automated backend tests. |
| 38 | BLOCKED | Ledger visual inspection was not captured in this run. |
| 39 | PASS | Transfer/stocktake API behavior is covered by the Django suite. |
| 40 | PASS | Reorder alert behavior is covered by the Django suite. |
| 41 | PASS | Real POS basket accepted one QA unit after selecting QA Main. |
| 42 | BLOCKED | Search/barcode UI permutations were not executed. |
| 43 | PASS | Live basket showed one unit at ₦18,500.00 and subtotal matched. |
| 44 | PASS | Real cash checkout succeeded; basket cleared and stock displayed 9 available. |
| 45 | BLOCKED | Card, bank-transfer, and wallet browser submissions were not run. |
| 46 | BLOCKED | Partial-payment browser workflow was not run. |
| 47 | PASS | Invalid checkout validation is covered by the Django suite. |
| 48 | PASS | Checkout idempotency and changed-key conflict are covered by automated tests. |
| 49 | BLOCKED | Sales history/invoice visual inspection was not captured. |
| 50 | BLOCKED | Refund UI/API workflow was not executed in this run. |
| 51 | PASS | Business authorization/isolation behavior is covered by the Django suite. |
| 52 | PASS | Atomic/concurrent checkout behavior is covered by the Django suite. |
| 53 | BLOCKED | Unknown-result browser recovery was not simulated. |
| 54 | PASS | Monetary precision/date validation is covered by automated tests. |
| 55 | BLOCKED | Sale fixture was intentionally not restored after the real checkout. |
| 56 | BLOCKED | Supplier creation UI/API was not executed in this run. |
| 57 | BLOCKED | Draft purchase-order workflow was not executed. |
| 58 | PASS | Purchase idempotency is covered by automated backend tests. |
| 59 | BLOCKED | Place/cancel UI lifecycle was not executed. |
| 60 | BLOCKED | Partial receipt workflow was not executed. |
| 61 | BLOCKED | Remaining receipt/retry workflow was not executed. |
| 62 | PASS | Invalid purchasing input validation is covered by automated tests. |
| 63 | BLOCKED | Staff purchasing restriction was not manually exercised. |
| 64 | PASS | Purchase cost/inventory reconciliation is covered by automated tests. |
| 65 | BLOCKED | Interruption/recovery workflow was not simulated. |
| 66 | BLOCKED | Staff listing UI was not executed. |
| 67 | BLOCKED | Staff creation UI was not executed. |
| 68 | PASS | Explicit permission behavior is covered by automated tests. |
| 69 | BLOCKED | Deactivated Staff session was not executed. |
| 70 | PASS | Owner-only management authorization is covered by automated tests. |
| 71 | PASS | Tenant isolation is covered by automated tests. |
| 72 | BLOCKED | Admin boundary was not separately exercised. |
| 73 | PASS | Audit/revocation behavior is covered by automated tests. |
| 74 | BLOCKED | Expense creation UI/API was not executed. |
| 75 | PASS | Report arithmetic is covered by automated tests. |
| 76 | BLOCKED | Date-filter UI permutations were not executed. |
| 77 | BLOCKED | Staff report restriction was not manually exercised. |
| 78 | BLOCKED | Audit/notification visual inspection was not captured. |
| 79 | BLOCKED | Dashboard/report cross-screen reconciliation was not completed. |
| 80 | NOT APPLICABLE | No export acceptance surface was available to execute in this build. |
| 81 | BLOCKED | No Android target; Expo startup was not accepted from Expo Web alone. |
| 82 | BLOCKED | No Android target for keyboard/touch acceptance. |
| 83 | BLOCKED | No Android target for tabs/safe-area acceptance. |
| 84 | BLOCKED | No Android target for live mobile catalog acceptance. |
| 85 | BLOCKED | No Android target for mobile stock acceptance. |
| 86 | BLOCKED | No Android target for mobile POS/barcode acceptance. |
| 87 | BLOCKED | No Android target for mobile checkout acceptance. |
| 88 | BLOCKED | No Android target for mobile customer-list acceptance. |
| 89 | BLOCKED | No Android target for mobile purchasing acceptance. |
| 90 | BLOCKED | Offline queue unit tests pass, but device/network replay was not executed. |
| 91 | BLOCKED | Cross-client synchronization requires an available mobile client/device. |
| 92 | BLOCKED | Mobile-to-web sale synchronization requires an available mobile client/device. |
| 93 | BLOCKED | Mobile stock synchronization requires an available mobile client/device. |
| 94 | PASS | Production checks passed with a strong temporary secret; automated auth/permission tests passed. |
| 95 | BLOCKED | Repeated-login/rate-limit behavior was not executed. |
| 96 | PASS | `config.production check --deploy` passed with a strong QA secret and isolated SQLite database. |
| 97 | PASS | Django 65/65, mobile 6/6, and TypeScript checks passed. |
| 98 | BLOCKED | Full accessibility/performance/reliability smoke matrix was not completed. |
| 99 | BLOCKED | Go-live/rollback rehearsal was not performed against a deployable staging target. |
| 100 | BLOCKED | Final acceptance is blocked by the open browser permutations and all Android/device cases. |
