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
| 19 | BLOCKED | The shared Owner Inventory page switched to dark mode and back, and the control label updated. Persistence across navigation/reload, contrast, and mobile color-scheme behavior were not checked. |
| 20 | BLOCKED | Empty-state/refresh comparison was not fully executed. |
| 21 | BLOCKED | Required 1440/768/390 responsive evidence set was not completed. |
| 22 | BLOCKED | Full keyboard/screen-reader review was not completed. |
| 23 | BLOCKED | The notifications panel opened; its API request failed with connection refused because the shared web/API services were stopped, and the UI showed “Failed to fetch.” This is an environment-blocked observation, not a confirmed application defect; validation/authorization error permutations remain untested. |
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
| 80 | BLOCKED | Reports exposed a Print / save PDF control, but the Expo Web print surface did not complete; export correctness remains unverified. |
| 81 | BLOCKED | Expo Web was cold-started and rendered against the isolated QA API; Android bundle export passed. No emulator/device is attached, so install, rotation, and native startup remain unverified. |
| 82 | BLOCKED | User confirmed on their Android phone that the password is masked by default, Show reveals it, Hide remasks it, and its text is preserved. Remaining keyboard, rotation, and screen-reader checks are unverified; screenshots were not attached. Vitest and TypeScript pass. |
| 83 | BLOCKED | Owner and Staff Expo Web tab routes loaded and had no document-level horizontal overflow at 390px. Android Back, native safe-area, and device touch acceptance remain blocked. |
| 84 | BLOCKED | User confirmed valid barcode lookup and the updated visible no-match feedback for an invalid barcode on Android. Remaining catalog search, refresh, empty-state, and network error/retry checks are not complete. |
| 85 | BLOCKED | Expo Stock showed location-specific quantities and low-stock state, but the ₦48,000.00 vs ₦48,500.00 comparison came from an invalid directly seeded fixture with a stale variant average. A valid transaction-flow probe later showed ₦48,875.04 weighted-average valuation vs ₦48,500.00 remaining batch cost; the Stock screen was not retested with that fixture and accounting treatment remains unconfirmed (QA-015). |
| 86 | PASS | Expo Web tests verified location switching, exact/unknown barcode behavior, quantity caps, and removal. User confirmed the corresponding Android QA basket/location checks passed without submitting checkout during this step. |
| 87 | PASS | Earlier Expo Web card checkout created one invoice/payment and one stock deduction; user also confirmed a one-unit Android QA checkout succeeded, cleared the basket, and reduced QA Main stock once. Other payment methods and interrupted/uncertain retry remain unverified on device. |
| 88 | PASS | Owner Expo Customers listed only the active in-business fixture; the inactive customer was absent, and the Staff API listing worked. User confirmed Android customer creation, name/email/phone searches, no-match behavior, hidden notes in the list, and Staff visibility. Pagination, API stop/restart, and network-error behavior remain unverified on device; no screenshot was saved. |
| 89 | PASS | User confirmed on Android that Owner More modules opened, a disposable supplier/order lifecycle (create, place, partial/final receipt, cancellation) worked, and Staff More showed only permitted links. Prior Expo Web evidence is also recorded. No screenshot was saved; richer multi-line purchasing and remaining native checks are unverified. |
| 90 | PASS | Browser network emulation queued and replayed one stock adjustment once. User confirmed the updated Android queue status appeared, the offline adjustment applied after Wi-Fi returned, and Step 90 passed. User earlier confirmed stock was restored to its original quantity. Native background/foreground lifecycle and conflict cases remain unverified; no screenshot was saved. |
| 91 | PASS | A uniquely named product/variant created in the web catalog appeared in Expo Catalog after refresh with the same SKU and price. |
| 92 | PASS | Expo checkout created one web-visible invoice/payment; web Sales History and Inventory reflected the sale, and the affected location decreased once. |
| 93 | PASS | A unique-key offline stock adjustment replayed once, cleared from the queue, and web/API/mobile quantities and ledger entries matched. The separate weighted-average versus batch-cost question is tracked under QA-015 and does not indicate a sync/idempotency failure. |
| 94 | PASS | Production checks passed with a strong temporary secret; automated auth/permission tests passed. |
| 95 | PASS | Twelve bounded invalid logins on the disposable account produced 401 responses followed by 429 throttles; valid login was still throttled during the window and succeeded after the 62-second wait. |
| 96 | PASS | `config.production check --deploy` passed with a strong QA secret and isolated SQLite database. |
| 97 | PASS | Rerun on 2026-11-08: Django 66/66; mobile Vitest 14/14; TypeScript, Django check, migration check, Android Expo export, and `git diff --check` passed. `adb devices -l` showed no connected device. |
| 98 | BLOCKED | Full accessibility/performance/reliability smoke matrix was not completed. |
| 99 | BLOCKED | Go-live/rollback rehearsal was not performed against a deployable staging target. |
| 100 | BLOCKED | Final acceptance remains blocked by the QA-015 accounting-method decision, remaining web/role permutations, and all native Android/iOS device cases. |

**Current totals:** 51 PASS, 0 FAIL, 49 BLOCKED, 0 NOT APPLICABLE. QA-015 remains an unresolved valuation/COGS policy question; QA-016 is resolved based on user-reported Android confirmation, while other native offline lifecycle/conflict checks remain open.
