# NorrisBeauty Complete 100-Step QA Testing Manual

**Document status:** execution workbook. A blank result is not a pass. Record the observed result, evidence, and defect reference for every step.  
**Scope:** Django website, shared `/api/v1/` API, and Expo client.  
**Important limitations:** mobile purchase orders are single-line; POS is online-only; stock queue replay is foreground-only; barcode camera hardware and background sync are not implemented; and physical-device acceptance remains unverified. Customer listing and creation are available in the mobile Customers screen. Do not mark unimplemented/device-only limitations as passed.

## How to use this manual

Run against a disposable local database or staging business. Use an Owner and a Staff member in the same business, plus a second business for isolation checks. Capture screenshots at each visible failure and record the request/response (with tokens and passwords redacted). API/database checks confirm implementation state; they are not substitutes for browser or device execution.

## Environment and account preparation

- From PowerShell, create/activate `.venv`, install `requirements.txt`, copy `.env.example` to `.env`, then run `python manage.py migrate`, `python manage.py check`, and `python manage.py runserver`.
- In a second terminal run `cd mobile`, `npm ci`, copy `mobile/.env.example` to `mobile/.env`, set `EXPO_PUBLIC_API_URL` to `http://<LAN-IP>:8000/api/v1`, and run `npx expo start --lan`.
- Create a superuser only for `/admin/` setup. Create memberships for `owner.qa` (Owner) and `staff.qa` (Staff) in `Norris QA Business`; create `Other QA Business` for isolation tests.
- Use `QA-Serum-30`, SKU `QA-SERUM-30`, barcode `890000000001`, price `18500.00`, cost `6000.00`, reorder point `3`, location `QA Main`, batch `QA-LOT-001`, quantity `10`, and expiry `2027-12-31`.
- Use supplier `QA Beauty Supply`, customer `QA Customer`, payment methods `cash`, `card`, `bank_transfer`, and `wallet`, and unique idempotency keys per test.
- Reset by deleting only the disposable businesses and their records in admin or by recreating the test database; never use live records. Preserve evidence before reset.

## Result legend

Use **PASS**, **FAIL**, **BLOCKED**, or **NOT APPLICABLE**. A code-inspection limitation or a missing device is **BLOCKED**, not PASS.

## Phase 1 — environment and preparation (Steps 01–05)

### STEP 01 — Prepare a clean test environment
**Platform:** Both  
**User Role:** Owner  
**Testing Objective:** Confirm the documented local setup is reproducible before functional testing.  
**Prerequisites:** Windows PowerShell, repository checkout, disposable database.  
**Exact Navigation:** Open PowerShell in the repository root.  
**Actions to Perform:** Run the setup commands above; run `python manage.py check`; confirm the server opens `/health/` and `/api/v1/health/`.  
**Test Data:** No business data.  
**Expected Result:** Dependencies install, migrations apply, both health endpoints return an OK status, and no secrets are printed.  
**Database/API Verification:** Confirm `python manage.py makemigrations --check --dry-run` reports no changes.  
**Cross-Platform Verification:** Open the API health URL from the same LAN used by Expo.  
**Failure Indicators:** Import errors, migration errors, 404/500 health responses, or exposed `.env` values.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 02 — Create isolated accounts and memberships
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Establish the Owner, Staff, and second-business boundaries used by later tests.  
**Prerequisites:** Superuser access to `/admin/`.  
**Exact Navigation:** Open `/admin/`; create users, businesses, and Membership records.  
**Actions to Perform:** Set `owner.qa` and `staff.qa` active; assign each to `Norris QA Business`; assign `other.qa` to `Other QA Business`; leave Staff permissions at defaults.  
**Test Data:** Strong disposable passwords; no production email addresses.  
**Expected Result:** Each user has the intended active membership and role.  
**Database/API Verification:** Call `/api/v1/auth/me/` after each login and confirm business and role.  
**Cross-Platform Verification:** Use the same credentials in Expo only after web identity is confirmed.  
**Failure Indicators:** Missing membership, wrong role, or a user seeing another business.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 03 — Seed the reusable catalog fixture
**Platform:** Both  
**User Role:** Owner  
**Testing Objective:** Create the product, category, variant, location, and opening stock used for repeatable calculations.  
**Prerequisites:** Step 02 complete; Owner signed in.  
**Exact Navigation:** Web `/products/`, then `/inventory/`; or use documented API endpoints.  
**Actions to Perform:** Create category `Serums`; create the product and variant from the test-data reference; create `QA Main`; record a receipt of 10 units.  
**Test Data:** SKU/barcode/price/cost/reorder point and batch from the reference above.  
**Expected Result:** Product and stock appear without duplicate records.  
**Database/API Verification:** Confirm one category, product, variant, location, batch, and ledger receipt belong to the QA business.  
**Cross-Platform Verification:** Refresh Expo Catalog and Stock screens.  
**Failure Indicators:** Wrong business scope, negative/incorrect quantity, missing ledger event, or stale mobile data.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 04 — Establish baseline evidence and restore point
**Platform:** Both  
**User Role:** Owner  
**Testing Objective:** Make later comparisons and recovery reproducible.  
**Prerequisites:** Seed fixture exists.  
**Exact Navigation:** Capture web dashboard, Products, Inventory, and mobile Overview/Catalog/Stock.  
**Actions to Perform:** Save screenshots at 1440px, 768px, and 390px web widths; save mobile screenshots; export or record baseline API JSON.  
**Test Data:** Baseline product and stock only.  
**Expected Result:** Evidence identifies date, environment, user, and test fixture.  
**Database/API Verification:** Record product, balance, movement, and migration counts.  
**Cross-Platform Verification:** Baseline values match between web API-backed views and Expo.  
**Failure Indicators:** Unexplained demo data, missing logo, or inconsistent baseline values.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 05 — Verify database recovery procedure
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Confirm test data can be removed and recreated without damaging unrelated records.  
**Prerequisites:** Baseline evidence; database backup or disposable copy.  
**Exact Navigation:** Use the approved database/admin reset procedure, never a production database.  
**Actions to Perform:** Export or copy the database; remove only the QA business; run migrations/checks; recreate the fixture.  
**Test Data:** QA business records.  
**Expected Result:** Reset completes and a fresh fixture behaves like Step 03.  
**Database/API Verification:** Verify no QA rows remain before recreation and no other-business rows were removed.  
**Cross-Platform Verification:** Expo signs in again and shows the recreated fixture.  
**Failure Indicators:** Orphan records, migration drift, or cross-business deletion.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

## Phase 2 — authentication and account security (Steps 06–15)

### STEP 06 — Sign in to the website as Owner
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Verify valid session authentication and Owner dashboard routing.  
**Prerequisites:** Owner account and membership.  
**Exact Navigation:** Open `/login/`; enter credentials; select **Sign in**.  
**Actions to Perform:** Submit valid credentials, refresh `/`, open a second protected page, then close and reopen the browser.  
**Test Data:** `owner.qa` and its disposable password.  
**Expected Result:** Login redirects to the dashboard, protected pages load, and the session remains valid until logout/expiry policy applies.  
**Database/API Verification:** Confirm no password is exposed in HTML or logs.  
**Cross-Platform Verification:** Use the same identity in Step 11.  
**Failure Indicators:** Login loop, wrong dashboard, plaintext credential exposure, or unauthorized page access.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 07 — Reject invalid website credentials
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Verify the invalid-login message and protected-route behavior.  
**Prerequisites:** Logged out.  
**Exact Navigation:** Open `/login/`; submit an unknown username and a wrong password separately.  
**Actions to Perform:** Try blank fields, unknown user, wrong password, and valid username with wrong password.  
**Test Data:** `unknown.qa`, wrong password, and empty values.  
**Expected Result:** The form remains on login with a clear error; no session is created and protected `/` redirects to login.  
**Database/API Verification:** Confirm no membership or audit write is created by failed login.  
**Cross-Platform Verification:** Repeat invalid credentials in Expo and compare safe error handling.  
**Failure Indicators:** Stack trace, account enumeration, dashboard access, or password echo.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 08 — Log out and test session invalidation
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Confirm logout removes access to protected pages.  
**Prerequisites:** Successful Owner session.  
**Exact Navigation:** Use the app logout control or open `/logout/`.  
**Actions to Perform:** Log out; press Back; refresh `/`, `/products/`, and `/settings/`; inspect cookies for secure/appropriate flags in the target environment.  
**Test Data:** None.  
**Expected Result:** Protected pages redirect to login and no authenticated content is shown.  
**Database/API Verification:** Check server logs contain no token or password.  
**Cross-Platform Verification:** Perform mobile logout in Step 12 and compare.  
**Failure Indicators:** Cached dashboard remains usable, logout errors, or secrets appear in URLs.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 09 — Use password reset safely
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Verify the built-in password reset pages and non-disclosure behavior.  
**Prerequisites:** Disposable email delivery or captured development email backend.  
**Exact Navigation:** `/login/` → **Forgot your password?** → `/password-reset/`.  
**Actions to Perform:** Submit the registered address and an unknown address; follow the generated reset link; set a strong new password; attempt the old password.  
**Test Data:** Owner email, new unique password, invalid address.  
**Expected Result:** Reset pages render, messages do not reveal whether an address exists, new password works, old password fails.  
**Database/API Verification:** Confirm only the password hash changes; no plaintext password is stored.  
**Cross-Platform Verification:** Sign in to Expo with the new password.  
**Failure Indicators:** Reset token reuse, leaked account existence, or old password still valid.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 10 — Sign in to the API and inspect membership context
**Platform:** API  
**User Role:** Owner  
**Testing Objective:** Verify JWT login returns the correct membership-bound context.  
**Prerequisites:** API client such as PowerShell `Invoke-RestMethod`; Owner credentials.  
**Exact Navigation:** `POST /api/v1/auth/login/`.  
**Actions to Perform:** Submit valid JSON; store access/refresh tokens only in memory; call `/auth/me/` and `/auth/permissions/`.  
**Test Data:** Owner credentials.  
**Expected Result:** Access and refresh tokens are returned; `me` reports Owner and the QA business; permissions are server-derived.  
**Database/API Verification:** Confirm tokens contain no password and permission output includes Owner capabilities.  
**Cross-Platform Verification:** Expo must use this same contract, not a client-only role switch.  
**Failure Indicators:** Missing membership, wrong business, client-provided business accepted, or token leakage.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 11 — Sign in to Expo as Owner
**Platform:** Mobile  
**User Role:** Owner  
**Testing Objective:** Verify the real mobile auth context and authenticated shell.  
**Prerequisites:** Expo running; phone/emulator and API reachable; Owner credentials.  
**Exact Navigation:** Launch Expo app → login screen → **Sign in**.  
**Actions to Perform:** Enter credentials; submit; background and reopen the app; inspect only approved device storage tooling.  
**Test Data:** Owner credentials.  
**Expected Result:** Authenticated tabs appear and Owner modules are available; SecureStore is used on native; Expo Web requires reauthentication after reload.  
**Database/API Verification:** Observe login, `me`, and permission requests with redacted logs.  
**Cross-Platform Verification:** Name, business, role, and catalog context match web.  
**Failure Indicators:** Preview-role bypass, token in AsyncStorage/plain text, wrong role, or API host failure.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 12 — Refresh and revoke mobile tokens
**Platform:** Mobile/API  
**User Role:** Owner  
**Testing Objective:** Verify token rotation, refresh, and logout revocation.  
**Prerequisites:** Mobile session with access and refresh tokens.  
**Exact Navigation:** Use the app session lifecycle; inspect API calls through a development proxy/log.  
**Actions to Perform:** Allow access token expiry or simulate it; confirm refresh; log out; replay the old refresh token.  
**Test Data:** Current and old refresh tokens, never recorded in evidence.  
**Expected Result:** Refresh returns rotated tokens; logout revokes the refresh token; replay returns unauthorized.  
**Database/API Verification:** Confirm refresh token membership/user mismatch is rejected.  
**Cross-Platform Verification:** Web session remains independent and must not inherit mobile tokens.  
**Failure Indicators:** Reusable revoked token, token mismatch accepted, or refresh under another business.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 13 — Verify Owner and Staff permission lists
**Platform:** Both/API  
**User Role:** Owner and Staff  
**Testing Objective:** Confirm permissions come from the backend role/membership.  
**Prerequisites:** Both accounts.  
**Exact Navigation:** Call `/auth/permissions/` and open each mobile/web shell.  
**Actions to Perform:** Compare Owner and default Staff output; grant an explicit Staff operational permission in admin only if testing a grant.  
**Test Data:** Default Staff permissions, then one documented grant.  
**Expected Result:** Owner has broad access; Staff has dashboard/catalog/inventory view/POS/sales/customers but not management/report/settings by default.  
**Database/API Verification:** Compare response to `docs/12_PERMISSION_MATRIX.md`.  
**Cross-Platform Verification:** Navigation visibility and API authorization agree.  
**Failure Indicators:** UI-only permission, Staff receiving Owner rights, or stale permission cache.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 14 — Test protected routes and CSRF
**Platform:** Website/API  
**User Role:** Staff  
**Testing Objective:** Verify server-side authorization cannot be bypassed by direct URLs or browser writes without CSRF.  
**Prerequisites:** Staff session; API client.  
**Exact Navigation:** Directly open `/purchases/`, `/reports/`, `/staff/`, `/settings/`; attempt a browser POST without a valid CSRF token.  
**Actions to Perform:** Repeat with altered hidden fields and guessed URLs; send unauthenticated API requests.  
**Test Data:** Valid-looking but unauthorized payloads.  
**Expected Result:** Restricted web pages return 403; missing/invalid CSRF is rejected; API requests require auth and permission.  
**Database/API Verification:** Confirm no unauthorized row is created.  
**Cross-Platform Verification:** Mobile bearer auth must not weaken the same permission checks.  
**Failure Indicators:** 200 response with protected data, write without CSRF, or created unauthorized record.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 15 — Test authentication failure and recovery
**Platform:** Both  
**User Role:** Owner and Staff  
**Testing Objective:** Verify safe recovery after expired sessions, network loss, and server restart.  
**Prerequisites:** Authenticated web and mobile sessions.  
**Exact Navigation:** Dashboard and mobile active screen.  
**Actions to Perform:** Stop Django; trigger a request; restart it; expire/revoke tokens; sign in again.  
**Test Data:** None.  
**Expected Result:** Clear error or login prompt appears; no partial write is reported as successful; retry works after service recovery.  
**Database/API Verification:** Check no duplicate/partial transaction exists.  
**Cross-Platform Verification:** Both clients recover using the same API.  
**Failure Indicators:** Infinite spinner, false success, duplicated write, or unhandled stack trace.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

## Phase 3 — dashboard and navigation (Steps 16–25)

### STEP 16 — Inspect Owner dashboard shell
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Verify dashboard layout, role label, navigation, and empty/live states.  
**Prerequisites:** Owner session and baseline fixture.  
**Exact Navigation:** Login → `/`.  
**Actions to Perform:** Inspect header, sidebar, metric cards, charts/summary areas, notifications, theme switch, and skip link; follow every visible nav item.  
**Test Data:** Baseline fixture and an empty second business if available.  
**Expected Result:** Owner dashboard identifies the role, renders consistently, and does not display fabricated demo data.  
**Database/API Verification:** Compare displayed values with API/source records; note intentionally blank metrics.  
**Cross-Platform Verification:** Mobile Overview reflects only implemented live values.  
**Failure Indicators:** Broken links, demo fixture names, missing role gating, or misleading totals.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 17 — Inspect Staff dashboard shell
**Platform:** Website  
**User Role:** Staff  
**Testing Objective:** Verify Staff sees operational navigation and no Owner-only controls.  
**Prerequisites:** Staff session.  
**Exact Navigation:** Login → `/`.  
**Actions to Perform:** Inspect dashboard; compare sidebar/topbar to Owner; select every visible allowed item.  
**Test Data:** Same business fixture.  
**Expected Result:** Staff dashboard renders `STAFF DASHBOARD`; restricted links are absent or forbidden.  
**Database/API Verification:** Confirm permissions response matches visible controls.  
**Cross-Platform Verification:** Mobile Staff tabs do not expose Owner management modules.  
**Failure Indicators:** Reports/staff/settings/purchases available without permission or hidden data leaks.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 18 — Navigate every web workspace
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Confirm the implemented page routes render and preserve navigation state.  
**Prerequisites:** Owner session.  
**Exact Navigation:** Open `/products/`, `/inventory/`, `/pos/`, `/sales/`, `/purchases/`, `/customers/`, `/reports/`, `/staff/`, `/settings/`.  
**Actions to Perform:** Use sidebar links, browser Back/Forward, refresh each page, and test direct URL entry.  
**Test Data:** Baseline fixture.  
**Expected Result:** Each page has its intended title and no demo placeholder content.  
**Database/API Verification:** Inspect network calls and response status for each page.  
**Cross-Platform Verification:** Map each available workspace to mobile More modules.  
**Failure Indicators:** 404/500, lost session, wrong page title, or navigation dead end.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 19 — Test theme toggle and persistence
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Verify light/dark styling and readability.  
**Prerequisites:** Any authenticated page.  
**Exact Navigation:** Use the visible theme toggle in the topbar.  
**Actions to Perform:** Toggle light/dark; navigate and refresh; inspect tables, charts, focus outlines, alerts, and logo.  
**Test Data:** Product and error states from later tests if available.  
**Expected Result:** Semantic colors retain WCAG-readable contrast and the choice persists according to implementation.  
**Database/API Verification:** No theme action changes business data.  
**Cross-Platform Verification:** Mobile follows its system color scheme without changing authorization.  
**Failure Indicators:** Invisible text, unreadable controls, layout shift, or persisted secrets.  
**Test Result:** BLOCKED
**Actual Result:** On the shared Owner Inventory page, the theme control switched to dark mode and back and its accessible label changed accordingly. Persistence after navigation/reload, contrast, and mobile color-scheme behavior were not checked.
**Screenshot/Evidence:** Shared browser interaction on the authenticated Inventory page; no screenshot saved.
**Bug Reference:** None confirmed.
**Additional Notes:** Theme toggle interaction passed; full persistence and visual/accessibility checks remain outstanding.

### STEP 20 — Test dashboard refresh and empty state
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Verify no stale or invented metrics appear after data changes.  
**Prerequisites:** Baseline and ability to create one sale/expense later.  
**Exact Navigation:** Dashboard before and after a source-record change.  
**Actions to Perform:** Record baseline; create a permitted source event; refresh dashboard; switch to an empty business if available.  
**Test Data:** One known receipt or expense.  
**Expected Result:** Implemented summaries update or clearly indicate unavailable data; empty state is explicit.  
**Database/API Verification:** Independently sum source rows and compare displayed values.  
**Cross-Platform Verification:** Mobile Overview refresh follows the same source.  
**Failure Indicators:** Cached incorrect values, fabricated zeros, or mismatch without explanation.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 21 — Test responsive web layout
**Platform:** Website  
**User Role:** Owner and Staff  
**Testing Objective:** Verify the documented 1440px, 1024px, 768px, and 390px layouts.  
**Prerequisites:** Browser responsive tools.  
**Exact Navigation:** Repeat dashboard, Products, Inventory, POS, and a table page at each width.  
**Actions to Perform:** Resize; scroll horizontally and vertically; open menus/forms; check touch target size and table behavior.  
**Test Data:** Baseline fixture.  
**Expected Result:** No unintended horizontal overflow; intentional tables remain usable; controls stay reachable.  
**Database/API Verification:** Resize must not duplicate requests or writes.  
**Cross-Platform Verification:** Compare 390px web with native mobile navigation.  
**Failure Indicators:** Clipped controls, overlapping footer/system UI, inaccessible modal, or double request.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 22 — Test keyboard and screen-reader basics
**Platform:** Website  
**User Role:** Owner and Staff  
**Testing Objective:** Verify accessible focus order, labels, skip navigation, and errors.  
**Prerequisites:** Keyboard and browser accessibility inspection.  
**Exact Navigation:** Login, dashboard, product form, POS, and a modal/table.  
**Actions to Perform:** Use Tab/Shift+Tab/Enter/Escape only; activate skip link; inspect accessible names and live alerts.  
**Test Data:** Missing and invalid form values.  
**Expected Result:** Every actionable control is reachable, focus is visible, labels/errors are associated, and modal focus is managed.  
**Database/API Verification:** Keyboard submission creates at most one record.  
**Cross-Platform Verification:** Compare accessibility labels in Expo controls.  
**Failure Indicators:** Focus trap, unlabeled input, keyboard-only dead end, or silent validation error.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 23 — Test notifications and error presentation
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify success, validation, authorization, and server errors are distinct and actionable.  
**Prerequisites:** Ability to submit one valid and one invalid write.  
**Exact Navigation:** Product, inventory, expense, and API forms.  
**Actions to Perform:** Submit valid data, missing data, duplicate data, and unauthorized data; observe toast/inline/server response.  
**Test Data:** Duplicate SKU/category, blank required fields, negative price.  
**Expected Result:** User sees a clear result; failed writes do not look successful.  
**Database/API Verification:** Verify HTTP status and row counts.  
**Cross-Platform Verification:** Mobile shows an alert/error without losing safe form state.  
**Failure Indicators:** Silent failure, generic success, stack trace, or lost unsaved input.  
**Test Result:** BLOCKED
**Actual Result:** The notifications panel opened, but `GET /api/v1/notifications/` was refused because the shared local web/API services were stopped. The UI displayed “Failed to fetch”; this does not establish an application API failure. Valid, validation, and authorization error permutations remain untested.
**Screenshot/Evidence:** Shared browser interaction on the authenticated Inventory page; no screenshot saved.
**Bug Reference:** None confirmed; backend availability is an environment blocker.
**Additional Notes:** Retest notification data and form/API errors with a running isolated backend.

### STEP 24 — Test browser reload and back-button behavior
**Platform:** Website  
**User Role:** Owner  
**Testing Objective:** Ensure navigation does not accidentally repeat a mutation.  
**Prerequisites:** A valid form and a completed write.  
**Exact Navigation:** Submit a product/stock form, then refresh and press Back/Forward.  
**Actions to Perform:** Repeat after validation error and after a slow response; inspect browser confirmation behavior.  
**Test Data:** Unique idempotency key and unique SKU.  
**Expected Result:** GET refresh is safe; POST is not replayed; completed state remains accurate.  
**Database/API Verification:** Count created rows and movements.  
**Cross-Platform Verification:** Mobile retry uses keys rather than blind duplicate submission.  
**Failure Indicators:** Duplicate product, duplicate movement, or stale success page.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 25 — Validate logo, asset, and image rendering
**Platform:** Both  
**User Role:** Owner  
**Testing Objective:** Confirm official branding renders without broken or unowned assets.  
**Prerequisites:** Web and Expo builds.  
**Exact Navigation:** Login, dashboard, product image view, mobile login/catalog.  
**Actions to Perform:** Inspect logo dimensions/background, product images, alt text, broken URL behavior, and dark mode.  
**Test Data:** Official logo and one valid/one invalid image URL.  
**Expected Result:** Official logo loads; image failures are handled; descriptive alt/accessibility text exists.  
**Database/API Verification:** External URLs remain metadata and are not silently fetched as uploads.  
**Cross-Platform Verification:** Web and mobile use the byte-identical official logo assets.  
**Failure Indicators:** Broken image icon without fallback, unsafe upload, missing alt text, or altered official asset.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

## Phase 4 — catalog and inventory (Steps 26–40)

### STEP 26 — List and search catalog products
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify business-scoped catalog reads and search/filter behavior where exposed.  
**Prerequisites:** Products `QA-Serum-30` and a second product.  
**Exact Navigation:** Web `/products/`; mobile **Catalog**; `GET /api/v1/catalog/products/`.  
**Actions to Perform:** Search name, SKU, barcode, and a no-match term; refresh and paginate if present.  
**Test Data:** `QA`, `QA-SERUM-30`, `890000000001`, `none`.  
**Expected Result:** Matching active products appear, no-match state is clear, and only the active business is returned.  
**Database/API Verification:** Compare result IDs to database and response pagination.  
**Cross-Platform Verification:** Web and mobile show the same product/variant metadata.  
**Failure Indicators:** Cross-business product, inactive item incorrectly shown, or stale result.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 27 — Create a category and reject duplicates
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify owner-only category creation and case-insensitive uniqueness.  
**Prerequisites:** Owner session and `Serums` absent/present as appropriate.  
**Exact Navigation:** Product/category control or `POST /catalog/categories/`.  
**Actions to Perform:** Create `Hair Care`; submit `hair care`; submit blank and overlong names.  
**Test Data:** Valid, case-only duplicate, blank, 121-character name.  
**Expected Result:** First valid category succeeds; duplicate/invalid values are rejected with no extra row.  
**Database/API Verification:** Count categories scoped to the business.  
**Cross-Platform Verification:** Mobile catalog reflects the category if displayed.  
**Failure Indicators:** Duplicate category, 500 error, or Staff write accepted.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 28 — Create a product with nested variant and metadata
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify atomic product, variant, and external image metadata creation.  
**Prerequisites:** Owner and valid category.  
**Exact Navigation:** Product create form or `POST /catalog/products/`.  
**Actions to Perform:** Submit one product with name, description, category, variant, price, cost, reorder point, and image URL metadata.  
**Test Data:** `QA Cleanser`, SKU `QA-CLEAN-100`, price `12000.00`, cost `4000.00`, image URL `https://assets.example.test/qa.jpg`.  
**Expected Result:** All nested records are created together and appear in catalog.  
**Database/API Verification:** Confirm all rows share the Owner’s business and decimal values retain two places.  
**Cross-Platform Verification:** Mobile catalog reads the new product after refresh.  
**Failure Indicators:** Partial nested write, float rounding, foreign-business category, or fabricated image fetch.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 29 — Validate SKU, barcode, price, and cost rules
**Platform:** API/Website  
**User Role:** Owner  
**Testing Objective:** Verify duplicate and negative variant constraints.  
**Prerequisites:** Existing QA variant.  
**Exact Navigation:** Product edit/create form or API.  
**Actions to Perform:** Submit duplicate SKU/barcode with case changes; negative price/cost; zero price; blank barcode.  
**Test Data:** `qa-serum-30`, `890000000001`, `-1.00`, `0.00`, blank.  
**Expected Result:** Duplicate and negative values are rejected; zero price and blank barcode follow documented model rules.  
**Database/API Verification:** Confirm no invalid variant row is saved.  
**Cross-Platform Verification:** Mobile cannot bypass server validation.  
**Failure Indicators:** Case-sensitive duplicate accepted, negative money saved, or client-only validation.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 30 — Edit and deactivate a product
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify product/variant update and deactivation behavior.  
**Prerequisites:** QA product with stock and no live sale in progress.  
**Exact Navigation:** Product detail/edit; `PATCH /catalog/products/{id}/`.  
**Actions to Perform:** Change description and price; deactivate product/variant; refresh catalog and attempt selection.  
**Test Data:** New description, price `19000.00`.  
**Expected Result:** Edits persist; inactive items are not offered as active catalog/POS choices while historical records remain.  
**Database/API Verification:** Confirm `is_active` and audit/source records.  
**Cross-Platform Verification:** Mobile refresh removes inactive item from active choices.  
**Failure Indicators:** Historical sale deleted, inactive item sellable, or unauthorized Staff edit.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 31 — Upload a valid product image
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify secure JPEG/PNG/WebP upload and primary-image metadata.  
**Prerequisites:** Valid small image file.  
**Exact Navigation:** Product detail → image upload; multipart image endpoint.  
**Actions to Perform:** Upload a valid image with alt text, position, and primary flag; view product.  
**Test Data:** Valid image under 5 MiB and accepted dimensions.  
**Expected Result:** Image stores under business/product path and renders with alt text.  
**Database/API Verification:** Confirm one ProductImage and no path traversal.  
**Cross-Platform Verification:** Mobile reads image metadata if image display is implemented.  
**Failure Indicators:** Upload accepted without owner permission, unsafe filename/path, or missing alt text.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 32 — Reject unsafe product images
**Platform:** API/Website  
**User Role:** Owner and Staff  
**Testing Objective:** Verify image type, size, dimension, and authorization validation.  
**Prerequisites:** Invalid files and Staff account.  
**Exact Navigation:** Product image upload endpoint/form.  
**Actions to Perform:** Try text file, oversized image, invalid dimensions, both image and URL, missing image, and Staff upload.  
**Test Data:** `.txt`, >5 MiB file, malformed image, duplicate primary.  
**Expected Result:** Each invalid or unauthorized submission is rejected without a stored file/row.  
**Database/API Verification:** Confirm media directory and ProductImage count are unchanged.  
**Cross-Platform Verification:** Mobile cannot call upload as Staff.  
**Failure Indicators:** Executable accepted, partial row, or generic 500 response.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 33 — Create and list stock locations
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify active locations, uniqueness, and Staff read access.  
**Prerequisites:** Owner and Staff sessions.  
**Exact Navigation:** Inventory workspace; `GET/POST /inventory/locations/`.  
**Actions to Perform:** Owner creates `QA Secondary`; repeat with case-only duplicate; Staff lists locations and attempts creation.  
**Test Data:** `QA Secondary`, `qa secondary`, blank.  
**Expected Result:** Valid location is created; duplicate/blank rejected; Staff can read but cannot write by default.  
**Database/API Verification:** Confirm business-scoped unique location.  
**Cross-Platform Verification:** Mobile POS location picker includes active locations.  
**Failure Indicators:** Duplicate location or Staff write accepted.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 34 — Receive stock and calculate weighted average
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify atomic receipt, batch creation, ledger event, and valuation.  
**Prerequisites:** Variant with 10 units at `6000.00`.  
**Exact Navigation:** Inventory adjustment/receipt control or `POST /inventory/movements/`.  
**Actions to Perform:** Receive 10 units at `8000.00` in batch `QA-LOT-002`; refresh stock.  
**Test Data:** Positive quantity/cost, expiry `2028-01-31`, unique idempotency key.  
**Expected Result:** Quantity becomes 20; weighted average cost is `7000.00`; valuation is `140000.00`.  
**Database/API Verification:** Confirm one Batch and one immutable movement with actor/reason/key.  
**Cross-Platform Verification:** Expo Stock shows quantity and valuation after refresh.  
**Failure Indicators:** Float arithmetic, missing ledger, wrong batch balance, or partial write.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 35 — Adjust stock and prevent negative balances
**Platform:** Website/API  
**User Role:** Owner and Staff  
**Testing Objective:** Verify positive/negative adjustments and nonnegative batch invariant.  
**Prerequisites:** Existing batch and Owner; Staff for denial.  
**Exact Navigation:** Inventory adjustment or `POST /inventory/movements/`.  
**Actions to Perform:** Add 2; subtract 3; attempt subtract greater than available; have Staff repeat.  
**Test Data:** `quantity_delta` 2, -3, and a value exceeding balance.  
**Expected Result:** Valid adjustments update stock and ledger; overdraw and unauthorized writes are rejected atomically.  
**Database/API Verification:** Batch never falls below zero; failed requests add no movement.  
**Cross-Platform Verification:** Mobile queue/online error explains denial or invalid balance.  
**Failure Indicators:** Negative stock, movement without balance update, or Staff bypass.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 36 — Test stock idempotency
**Platform:** API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify exact retries do not duplicate stock.  
**Prerequisites:** A unique movement payload and idempotency key.  
**Exact Navigation:** `POST /inventory/movements/` twice; repeat from mobile queue if available.  
**Actions to Perform:** Send exact request twice; then reuse the key with a changed quantity/reason.  
**Test Data:** Receipt 4 at `7000.00`, key `qa-stock-retry-001`.  
**Expected Result:** Exact retry returns original movement; changed payload is rejected; stock changes once.  
**Database/API Verification:** Count movement rows and compare batch quantity.  
**Cross-Platform Verification:** Mobile replay preserves the same key.  
**Failure Indicators:** Duplicate ledger, second stock change, or changed payload accepted.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 37 — Test expiry and immutable batch fields
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify expiry and original batch cost cannot be silently changed.  
**Prerequisites:** Batch from Step 34.  
**Exact Navigation:** Batch/stock detail or API update attempt.  
**Actions to Perform:** Attempt to change batch number, expiry, original cost, and location directly; use a new receipt for legitimate new values.  
**Test Data:** Altered expiry/cost and valid new batch.  
**Expected Result:** Immutable fields are rejected or remain unchanged; new receipt creates a separate valid batch.  
**Database/API Verification:** Compare batch history and movement ledger.  
**Cross-Platform Verification:** Mobile displays the server value, not edited local data.  
**Failure Indicators:** Historical cost mutation or batch identity collision.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 38 — Inspect stock history and ledger
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify append-only movement visibility and actor/reason/timestamp fields.  
**Prerequisites:** Receipt and adjustment events.  
**Exact Navigation:** Product stock history, `/inventory/movements/`, and mobile Stock.  
**Actions to Perform:** Filter/scroll latest events; compare receipt, adjustment, sale, transfer, and count events as created.  
**Test Data:** Events from Steps 34–37.  
**Expected Result:** Latest 100 events are ordered and traceable; ordinary users cannot edit/delete them.  
**Database/API Verification:** Match each event to actor, source, quantity, batch, and key.  
**Cross-Platform Verification:** Web/API/mobile agree on current balance and event direction.  
**Failure Indicators:** Editable ledger, missing actor/reason, or unexplained balance.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 39 — Test inventory transfers and stocktakes
**Platform:** API/Website  
**User Role:** Owner  
**Testing Objective:** Verify transfer and counted-stock reconciliation create offsetting ledger events.  
**Prerequisites:** Two active locations and stock in source.  
**Exact Navigation:** Inventory transfer/stocktake controls or documented API endpoints.  
**Actions to Perform:** Transfer 2 units from `QA Main` to `QA Secondary`; perform a count one unit below expected; inspect balances.  
**Test Data:** Valid source/destination, variant, count, reason, idempotency keys.  
**Expected Result:** Source decreases, destination increases, and stocktake variance is recorded atomically.  
**Database/API Verification:** Ledger offsets reconcile to both location balances.  
**Cross-Platform Verification:** Mobile Stock reflects both locations after refresh.  
**Failure Indicators:** Duplicate movement, negative source, or count silently overwrites history.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 40 — Test reorder alerts
**Platform:** API/Website/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify alerts appear at or below reorder point and do not cross businesses.  
**Prerequisites:** Variant reorder point 3; reduce stock to 3 or below.  
**Exact Navigation:** Inventory alerts endpoint and visible alert surfaces.  
**Actions to Perform:** Adjust stock to 3; query `/inventory/alerts/`; raise stock above threshold; query again.  
**Test Data:** Counts 3, 2, and 4.  
**Expected Result:** Alert exists at/below threshold and clears or changes according to implementation above it.  
**Database/API Verification:** Confirm alert variant/business and source quantity.  
**Cross-Platform Verification:** Mobile Stock communicates low stock consistently.  
**Failure Indicators:** Alert at wrong threshold, stale alert, or another business’s alert.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

## Phase 5 — sales, checkout, and transactions (Steps 41–55)

### STEP 41 — Build a web POS basket
**Platform:** Website  
**User Role:** Owner and Staff  
**Testing Objective:** Verify product selection, quantity controls, removal, and empty state.  
**Prerequisites:** In-stock active variant and POS permission.  
**Exact Navigation:** `/pos/`.  
**Actions to Perform:** Select location; add product; increase/decrease quantity; remove item; add it again; inspect empty basket text.  
**Test Data:** QA product, quantity 1 then 2.  
**Expected Result:** Basket reflects exact items and available quantity; empty state says basket is empty.  
**Database/API Verification:** No write occurs before checkout.  
**Cross-Platform Verification:** Repeat equivalent controls in mobile POS.  
**Failure Indicators:** Quantity exceeds stock, wrong price, or premature database sale.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 42 — Search POS products and barcode text
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify exact case-insensitive barcode lookup without claiming camera support.  
**Prerequisites:** Variant barcode `890000000001`.  
**Exact Navigation:** POS search/barcode field; `GET /catalog/products/?barcode=`.  
**Actions to Perform:** Enter exact, mixed-case, blank, and unknown barcode; use a keyboard-wedge scanner if available.  
**Test Data:** `890000000001`, case variant, blank, `000`.  
**Expected Result:** Exact match is found; blank/unknown values show clear errors; no camera permission is requested because camera integration is not implemented.  
**Database/API Verification:** Results are business-scoped and exact.  
**Cross-Platform Verification:** Web and mobile add the same available variant.  
**Failure Indicators:** Partial barcode match, cross-business result, or false camera claim.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 43 — Verify POS total with an independent calculation
**Platform:** Website/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify Decimal total calculation and payment display.  
**Prerequisites:** Product price `18500.00`; quantities 1 and 2.  
**Exact Navigation:** POS basket → payment controls.  
**Actions to Perform:** Add 2 units; calculate `18,500.00 × 2 = 37,000.00`; compare subtotal/total and displayed currency.  
**Test Data:** Quantity 2, payment amount `37000.00`.  
**Expected Result:** Total equals independent calculation with two decimals; no invented discount/tax appears.  
**Database/API Verification:** Checkout payload contains server-validated lines and amount.  
**Cross-Platform Verification:** Mobile displays same total.  
**Failure Indicators:** Float rounding, client-controlled final total, or mismatched currency.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 44 — Complete a cash sale
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify successful online checkout, payment method, invoice, and stock deduction.  
**Prerequisites:** Basket with one available unit, selected location.  
**Exact Navigation:** POS → payment method **Cash** → **Complete sale**.  
**Actions to Perform:** Pay exact total; submit once; capture receipt/invoice.  
**Test Data:** One QA unit at `18500.00`, paid `18500.00`.  
**Expected Result:** Sale is recorded, invoice number shown, stock decreases by one, and receipt result is clear.  
**Database/API Verification:** One Sale, SaleLine, Payment, stock deduction, and audit/source event exist.  
**Cross-Platform Verification:** Web sales list and mobile stock reflect the sale.  
**Failure Indicators:** Sale without stock deduction/payment, duplicate sale, or false receipt.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 45 — Test each supported payment method
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify `cash`, `card`, `bank_transfer`, and `wallet` are accepted as recorded methods.  
**Prerequisites:** Separate disposable stock or reset between attempts.  
**Exact Navigation:** POS payment method selector.  
**Actions to Perform:** Complete one exact-total sale for each method; inspect receipt/list.  
**Test Data:** One unit per method.  
**Expected Result:** Each valid method is stored exactly once; no live payment gateway/card data is requested.  
**Database/API Verification:** Payment method and amount match each Sale.  
**Cross-Platform Verification:** Mobile selector sends same allowed values.  
**Failure Indicators:** Card number storage, unsupported value accepted, or method changed silently.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 46 — Test partial payment and credit behavior
**Platform:** Website/API  
**User Role:** Owner and Staff  
**Testing Objective:** Verify behavior for paid amount below total is explicit and consistent with implemented scope.  
**Prerequisites:** Disposable stock and POS permission.  
**Exact Navigation:** POS payment amount.  
**Actions to Perform:** Submit paid amount `10000.00` against total `18500.00`; inspect response and resulting sale/payment status.  
**Test Data:** Underpayment, exact payment, zero payment.  
**Expected Result:** The application either records its documented partial-payment/credit state or rejects the input clearly; it never silently treats underpayment as paid.  
**Database/API Verification:** Payment and outstanding amount reconcile.  
**Cross-Platform Verification:** Web/mobile state agrees; do not infer unsupported credit UI.  
**Failure Indicators:** Incorrect paid status, negative balance, or partial write.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 47 — Reject invalid POS submissions
**Platform:** Website/API/Mobile  
**User Role:** Staff  
**Testing Objective:** Verify missing location/items, negative amount, inactive variant, and insufficient stock are rejected.  
**Prerequisites:** Staff POS access and controlled stock.  
**Exact Navigation:** POS form or `POST /pos/checkout/`.  
**Actions to Perform:** Submit each invalid payload; double-click/rapidly submit; inspect error and basket preservation.  
**Test Data:** No location, empty items, quantity 0/-1, paid `-1.00`, quantity above balance.  
**Expected Result:** Clear validation/permission error; no Sale, Payment, or stock change.  
**Database/API Verification:** Verify atomic rollback and unchanged row counts.  
**Cross-Platform Verification:** Mobile retains safe basket after a failed request.  
**Failure Indicators:** 500, partial sale, negative payment, or stock loss.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 48 — Test checkout idempotency and changed-key conflict
**Platform:** API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify network retry cannot duplicate a sale.  
**Prerequisites:** One controlled basket and unique checkout key.  
**Exact Navigation:** `POST /api/v1/pos/checkout/` or mobile POS retry.  
**Actions to Perform:** Send exact payload twice; reuse key with changed quantity/payment/location.  
**Test Data:** Key `qa-sale-retry-001`, one unit, exact payment.  
**Expected Result:** First response is 201; exact retry returns original sale (200); changed payload is rejected.  
**Database/API Verification:** One Sale/Payment and one stock deduction only.  
**Cross-Platform Verification:** Mobile error instructs retry without changing basket.  
**Failure Indicators:** Duplicate invoice, second deduction, or changed-key overwrite.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 49 — Inspect sales history and invoice data
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify sale listing, search/pagination where present, and immutable snapshots.  
**Prerequisites:** Completed sales with different methods/dates.  
**Exact Navigation:** `/sales/` and `GET /api/v1/sales/`.  
**Actions to Perform:** Search invoice, inspect lines, totals, payment status, dates, and empty state.  
**Test Data:** Invoices from Steps 44–46.  
**Expected Result:** History lists correct business sales and line price/cost snapshots.  
**Database/API Verification:** Recalculate totals from SaleLines and compare.  
**Cross-Platform Verification:** Mobile Sales module matches API where available.  
**Failure Indicators:** Cross-business sale, mutable historical price, or missing invoice.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 50 — Refund a completed sale
**Platform:** API/Website  
**User Role:** Owner and Staff  
**Testing Objective:** Verify refund reversal restores stock and marks the sale correctly.  
**Prerequisites:** Completed sale with stock deducted.  
**Exact Navigation:** Sale detail/refund control or `POST /sales/{id}/refund/`.  
**Actions to Perform:** Submit valid refund reason once; repeat the refund; inspect sale, payment, stock, and ledger.  
**Test Data:** Reason `QA refund test`.  
**Expected Result:** Stock is restored once, sale becomes refunded, and duplicate refund is rejected.  
**Database/API Verification:** Refund/audit/stock reversal records reconcile atomically.  
**Cross-Platform Verification:** Refreshed mobile stock reflects restoration.  
**Failure Indicators:** Double restoration, sale still paid, or refund another business’s sale.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 51 — Test sale isolation and authorization
**Platform:** API/Website  
**User Role:** Staff and Owner  
**Testing Objective:** Verify Staff can use allowed POS/sales functions but cannot access unauthorized management/refund behavior if restricted.  
**Prerequisites:** Two businesses and sales.  
**Exact Navigation:** Direct sale IDs, POS, and sales endpoint under each user.  
**Actions to Perform:** Staff accesses own-business sales; attempts another business sale/refund; Owner repeats.  
**Test Data:** IDs from both businesses.  
**Expected Result:** Own permitted reads/workflows succeed; cross-business and restricted actions return 403/404 without side effects.  
**Database/API Verification:** No foreign-business query or write leaks.  
**Cross-Platform Verification:** Mobile role follows same API result.  
**Failure Indicators:** IDOR, hidden data in counts, or UI-only authorization.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 52 — Test concurrent checkout and atomicity
**Platform:** API  
**User Role:** Owner and Staff  
**Testing Objective:** Verify two checkouts cannot oversell the same last unit.  
**Prerequisites:** One unit remaining; two authenticated clients.  
**Exact Navigation:** Submit two checkout requests concurrently.  
**Actions to Perform:** Use distinct keys and identical one-unit item; compare responses and stock.  
**Test Data:** Last available unit, exact payments.  
**Expected Result:** At most one succeeds; the other receives a validation/conflict response; stock never becomes negative.  
**Database/API Verification:** Sale, payment, and ledger counts reconcile to one successful transaction.  
**Cross-Platform Verification:** Losing mobile basket remains retryable/visible.  
**Failure Indicators:** Two successful sales for one unit, negative stock, or partial transaction.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 53 — Test receipt and error recovery
**Platform:** Website/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify receipt feedback and recovery from an ambiguous network result.  
**Prerequisites:** POS basket, controllable network/proxy.  
**Exact Navigation:** POS → submit while interrupting response.  
**Actions to Perform:** Drop connection after request transmission; reopen app/page; retry unchanged basket/key; inspect result.  
**Test Data:** One valid sale.  
**Expected Result:** Client does not claim failure as fact; unchanged retry resolves to original sale without duplicate posting.  
**Database/API Verification:** Confirm one sale by key.  
**Cross-Platform Verification:** Web and mobile preserve/recover the same server outcome.  
**Failure Indicators:** Basket cleared before confirmation, duplicate invoice, or lost sale.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 54 — Test sale date and monetary precision
**Platform:** API  
**User Role:** Owner  
**Testing Objective:** Verify Decimal precision and timestamp consistency.  
**Prerequisites:** Sale with price values including cents.  
**Exact Navigation:** API checkout and sales response.  
**Actions to Perform:** Use price/paid values `123.45`, `246.90`, and inspect serialized totals, timestamps, and currency.  
**Test Data:** Disposable variant with two-decimal values.  
**Expected Result:** API returns two-decimal strings; totals do not use binary floating-point artifacts.  
**Database/API Verification:** Compare Decimal database values and UTC/local display policy.  
**Cross-Platform Verification:** Mobile formatting preserves the same value.  
**Failure Indicators:** `246.899999`, currency ambiguity, or timezone drift.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 55 — Restore sale fixture after transaction tests
**Platform:** Both  
**User Role:** Owner  
**Testing Objective:** Return stock and records to a known state before purchasing/report tests.  
**Prerequisites:** Transaction evidence saved.  
**Exact Navigation:** Approved reset or refund/cleanup process.  
**Actions to Perform:** Reconcile sales/refunds and recreate stock; do not delete immutable audit/ledger evidence except by disposable reset.  
**Test Data:** QA fixture.  
**Expected Result:** Baseline quantity and product state are restored and documented.  
**Database/API Verification:** Reconcile ledger to balance.  
**Cross-Platform Verification:** Both clients show the restored baseline.  
**Failure Indicators:** Silent deletion, unmatched ledger, or stale mobile cache.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

## Phase 6 — purchasing and stock replenishment (Steps 56–65)

### STEP 56 — Create a supplier
**Platform:** Website/API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify supplier creation, validation, uniqueness, and business scope.  
**Prerequisites:** Owner with purchasing permission.  
**Exact Navigation:** `/purchases/` or mobile **More → Purchases**; supplier API.  
**Actions to Perform:** Create supplier with contact fields; repeat same name; submit invalid email and blank name.  
**Test Data:** `QA Beauty Supply`, contact, email, phone, address.  
**Expected Result:** Valid supplier is created; duplicate/invalid values are rejected; no cross-business access.  
**Database/API Verification:** Confirm Supplier row and active state.  
**Cross-Platform Verification:** Mobile purchasing workspace lists/uses the supplier.  
**Failure Indicators:** Duplicate supplier or Staff creation without permission.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 57 — Create a draft purchase order
**Platform:** Website/API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify supplier, location, line quantity, unit cost, and draft lifecycle.  
**Prerequisites:** Supplier, location, variant.  
**Exact Navigation:** Purchases → new order; `POST /purchasing/orders/`.  
**Actions to Perform:** Create a single-line order; inspect status and total.  
**Test Data:** 5 units of `QA-SERUM-30` at `6000.00`, unique key.  
**Expected Result:** Draft order contains correct supplier/location/line and calculated amount.  
**Database/API Verification:** Confirm order and line share business and decimal cost.  
**Cross-Platform Verification:** Mobile creates the same single-line order; richer multi-line editing is not claimed.  
**Failure Indicators:** Missing line, wrong cost, or order in wrong business.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 58 — Test purchase-order idempotency
**Platform:** API/Mobile  
**User Role:** Owner  
**Testing Objective:** Prevent duplicate supplier orders during retry.  
**Prerequisites:** Draft payload and unique idempotency key.  
**Exact Navigation:** `POST /purchasing/orders/` twice.  
**Actions to Perform:** Retry exact payload; reuse key with changed line/supplier/location.  
**Test Data:** Key `qa-order-retry-001`.  
**Expected Result:** Exact retry returns original order; changed payload conflicts; one order exists.  
**Database/API Verification:** Count orders/lines and inspect response status 201 then 200.  
**Cross-Platform Verification:** Mobile uses same persisted key.  
**Failure Indicators:** Duplicate order or changed payload overwrite.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 59 — Place and cancel a purchase order
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify valid lifecycle transitions and cancellation guards.  
**Prerequisites:** Draft order.  
**Exact Navigation:** Order detail → **Place** or **Cancel**.  
**Actions to Perform:** Place one order; attempt to place again; create another draft and cancel it; attempt to cancel placed/received order.  
**Test Data:** Orders from Step 57.  
**Expected Result:** Status transitions are valid; invalid repeated/late transitions are rejected without stock change.  
**Database/API Verification:** Status and audit events match.  
**Cross-Platform Verification:** Mobile lifecycle buttons show only valid actions.  
**Failure Indicators:** Cancelled order received, stock changed on placement, or invalid transition accepted.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 60 — Receive a purchase order partially
**Platform:** Website/API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify partial receipt updates stock and order status atomically.  
**Prerequisites:** Ordered order for 5 units.  
**Exact Navigation:** Order → **Receive**; mobile purchasing receive action.  
**Actions to Perform:** Receive 2 units with batch/expiry/cost; inspect order and inventory.  
**Test Data:** Batch `QA-PO-001`, quantity 2, cost `6000.00`, expiry.  
**Expected Result:** Status becomes partially received; stock and ledger increase by 2.  
**Database/API Verification:** Purchase line received quantity and movement link reconcile.  
**Cross-Platform Verification:** Mobile Stock and web Inventory agree.  
**Failure Indicators:** Full receipt status, missing batch, or stock without order reconciliation.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 61 — Receive remaining quantity and retry
**Platform:** API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify full receipt and idempotent receipt replay.  
**Prerequisites:** Partially received order.  
**Exact Navigation:** Receive remaining line quantity.  
**Actions to Perform:** Receive 3; retry exact request; attempt 1 extra and altered replay.  
**Test Data:** Remaining 3, same or new valid batch as supported, unique receipt key.  
**Expected Result:** Order becomes received; exact retry adds no stock; over-receipt/changed-key request is rejected.  
**Database/API Verification:** Total received equals ordered and ledger totals match.  
**Cross-Platform Verification:** Mobile shows received status and stock.  
**Failure Indicators:** Over-receipt, duplicate movement, or wrong status.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 62 — Reject invalid purchase input
**Platform:** Website/API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify negative/zero quantities, invalid cost, foreign supplier/location, and missing fields.  
**Prerequisites:** Owner and second business fixtures.  
**Exact Navigation:** Purchase form/API.  
**Actions to Perform:** Submit each invalid payload and inspect errors/row counts.  
**Test Data:** Quantity 0/-1, cost -1, foreign IDs, blank supplier/location.  
**Expected Result:** Validation rejects every invalid payload atomically.  
**Database/API Verification:** No order, line, batch, or movement is created.  
**Cross-Platform Verification:** Mobile displays actionable errors.  
**Failure Indicators:** Cross-business foreign key accepted or partial order.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 63 — Verify Staff purchasing restriction
**Platform:** Website/API/Mobile  
**User Role:** Staff  
**Testing Objective:** Confirm default Staff cannot manage suppliers/orders.  
**Prerequisites:** Staff default permissions.  
**Exact Navigation:** `/purchases/`, mobile **More**, purchasing endpoints.  
**Actions to Perform:** Open page, list suppliers, create supplier/order, place/receive/cancel.  
**Test Data:** Valid-looking purchase payload.  
**Expected Result:** Page/API is denied; no hidden control or write bypass exists.  
**Database/API Verification:** No purchasing row changes.  
**Cross-Platform Verification:** Mobile redirects Staff away from Owner purchase workspace.  
**Failure Indicators:** Staff can place/receive or sees protected supplier data.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 64 — Reconcile purchase cost and inventory valuation
**Platform:** API/Website  
**User Role:** Owner  
**Testing Objective:** Verify received cost feeds weighted-average inventory correctly.  
**Prerequisites:** Known pre-receipt quantity/cost and purchase receipt.  
**Exact Navigation:** Inventory stock and purchase detail.  
**Actions to Perform:** Independently calculate `(old_qty*old_cost + received_qty*new_cost)/(total_qty)`; compare stock valuation.  
**Test Data:** 10×6000 plus 5×8000 = average `6666.67` rounded to two decimals.  
**Expected Result:** Quantity, average cost, and valuation match documented rounding.  
**Database/API Verification:** Compare Batch costs, variant valuation, ledger.  
**Cross-Platform Verification:** Mobile stock displays same two-decimal values.  
**Failure Indicators:** FIFO/average mismatch, unrounded totals, or unlinked receipt.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 65 — Test purchasing recovery after interruption
**Platform:** API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify interrupted create/receive operations are safely retried.  
**Prerequisites:** Network proxy or ability to stop server after request.  
**Exact Navigation:** Mobile/web purchasing action.  
**Actions to Perform:** Interrupt response; reopen order; retry unchanged request/key; inspect final status.  
**Test Data:** Valid order/receipt payload.  
**Expected Result:** One order/receipt outcome is recoverable; no duplicate stock.  
**Database/API Verification:** Idempotency and received totals reconcile.  
**Cross-Platform Verification:** Both clients recover the same server result.  
**Failure Indicators:** Duplicate order, duplicate receipt, or false cancellation.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

## Phase 7 — staff and access management (Steps 66–73)

### STEP 66 — List staff members
**Platform:** Website/API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify owner-only staff listing and business scope.  
**Prerequisites:** Owner, Staff, second business users.  
**Exact Navigation:** `/staff/`, staff API, mobile **More → Staff**.  
**Actions to Perform:** List members; inspect names, roles, active state, and business.  
**Test Data:** QA members.  
**Expected Result:** Only current-business members appear; sensitive credentials are absent.  
**Database/API Verification:** Compare membership rows.  
**Cross-Platform Verification:** Mobile staff view matches API or is correctly marked unavailable.  
**Failure Indicators:** Password/token exposure or cross-business member.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 67 — Add a staff member
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify owner-only staff creation and default least privilege.  
**Prerequisites:** Owner and a unique username/email.  
**Exact Navigation:** Staff management → add member; staff API.  
**Actions to Perform:** Create `newstaff.qa`; assign Staff; submit duplicate and invalid credentials.  
**Test Data:** Strong disposable password; no real email.  
**Expected Result:** Member is created with Staff role and default permissions; invalid/duplicate input is rejected.  
**Database/API Verification:** Membership belongs to QA business; password is hashed.  
**Cross-Platform Verification:** New Staff can sign into both clients with restricted shell.  
**Failure Indicators:** Owner role by default, plaintext password, or cross-business membership.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 68 — Edit role/permissions explicitly
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify explicit permission grants are server-validated and visible.  
**Prerequisites:** Staff member and documented permission to grant.  
**Exact Navigation:** Admin/staff management permission editor if implemented; otherwise record as unavailable.  
**Actions to Perform:** Grant one allowed permission; sign out/in; inspect permissions and target endpoint; remove it and repeat.  
**Test Data:** One permission such as `inventory.adjust`.  
**Expected Result:** Grant changes effective access only after server state changes; removal revokes access.  
**Database/API Verification:** Membership permissions JSON and API output match.  
**Cross-Platform Verification:** Both clients update after reauthentication/refresh.  
**Failure Indicators:** Client-only grant, stale access after removal, or arbitrary permission injection.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 69 — Test Staff access after deactivation
**Platform:** Website/API/Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify inactive user/membership cannot continue protected operations.  
**Prerequisites:** Staff session active on web/mobile.  
**Exact Navigation:** Deactivate in admin/staff control; then use existing sessions.  
**Actions to Perform:** Deactivate; call API, refresh web, submit POS, reopen mobile.  
**Test Data:** Existing Staff tokens/session.  
**Expected Result:** Access is denied or requires reauthentication according to implementation; no write succeeds.  
**Database/API Verification:** Membership active state is authoritative.  
**Cross-Platform Verification:** Both clients show a safe signed-out/forbidden state.  
**Failure Indicators:** Existing token retains unauthorized access or data.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 70 — Verify Owner-only management routes
**Platform:** Website/API/Mobile  
**User Role:** Staff  
**Testing Objective:** Test every Owner-only surface, not only hidden navigation.  
**Prerequisites:** Staff session.  
**Exact Navigation:** Direct `/purchases/`, `/reports/`, `/staff/`, `/settings/`, business profile, catalog/inventory writes.  
**Actions to Perform:** GET and POST/PATCH each route with valid-looking data.  
**Test Data:** Valid QA payloads.  
**Expected Result:** Denied routes/writes produce 403/redirect and no state change.  
**Database/API Verification:** Row counts and audit events unchanged.  
**Cross-Platform Verification:** Mobile More route redirects Staff from Owner modules.  
**Failure Indicators:** IDOR, hidden API endpoint, or mutation despite UI denial.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 71 — Verify cross-business membership isolation
**Platform:** API/Website/Mobile  
**User Role:** Owner  
**Testing Objective:** Confirm all queries derive business from server membership, not client input.  
**Prerequisites:** Two businesses with same SKU/product names.  
**Exact Navigation:** Use APIs and direct URLs while authenticated to business A.  
**Actions to Perform:** Add foreign `business_id` fields to payloads; request foreign IDs; search shared names/barcodes.  
**Test Data:** Same SKU/barcode in separate businesses where allowed.  
**Expected Result:** Client business fields are ignored/rejected; only active business data is returned or mutated.  
**Database/API Verification:** Verify every created row has membership business.  
**Cross-Platform Verification:** Mobile cannot switch tenant by editing request JSON.  
**Failure Indicators:** Foreign record disclosure or write.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 72 — Test admin boundary
**Platform:** Website  
**User Role:** Owner and Staff  
**Testing Objective:** Confirm business Owner/Staff accounts do not gain Django admin merely from role.  
**Prerequisites:** Owner and Staff credentials; separate superuser.  
**Exact Navigation:** Open `/admin/` as each account.  
**Actions to Perform:** Attempt login and direct admin URLs; verify superuser access only for setup account.  
**Test Data:** None.  
**Expected Result:** Owner/Staff are redirected to admin login/denied; setup superuser works.  
**Database/API Verification:** No admin mutation by business users.  
**Cross-Platform Verification:** Mobile has no admin route.  
**Failure Indicators:** Business Owner accesses unrestricted admin.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 73 — Verify permission audit trail and revocation
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Confirm sensitive membership changes are traceable and immediately effective.  
**Prerequisites:** Audit events enabled and a test permission change.  
**Exact Navigation:** Staff/settings/audit event surfaces.  
**Actions to Perform:** Grant/revoke permission; inspect audit list and try old access token/session.  
**Test Data:** One grant and revoke.  
**Expected Result:** Audit actor/business/time/event are recorded without credentials; revoked access fails.  
**Database/API Verification:** Audit before/after values are redacted and immutable to ordinary users.  
**Cross-Platform Verification:** Both clients reflect revocation.  
**Failure Indicators:** Missing actor, secret in audit, or continued access.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

## Phase 8 — reports, expenses, audit, and analytics (Steps 74–80)

### STEP 74 — Create an expense
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify expense validation, Decimal amount, actor, and notification/audit side effects.  
**Prerequisites:** Owner with settings/report permissions.  
**Exact Navigation:** `/reports/` or `POST /expenses/`.  
**Actions to Perform:** Create an expense with title/category/vendor/note/date/amount; submit invalid negative/blank values.  
**Test Data:** `QA Packaging`, vendor, amount `2500.50`, today’s date.  
**Expected Result:** Valid expense saves; invalid input is rejected without partial rows.  
**Database/API Verification:** One Expense, AuditEvent, and Notification with correct business/actor.  
**Cross-Platform Verification:** Mobile reports/notification module reflects only implemented data.  
**Failure Indicators:** Float amount, missing audit, or Staff write accepted.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 75 — Verify report summary arithmetic
**Platform:** API/Website  
**User Role:** Owner  
**Testing Objective:** Reconcile revenue/expense/net figures independently.  
**Prerequisites:** Known sales and expense rows.  
**Exact Navigation:** `/reports/` and `GET /reports/summary/`.  
**Actions to Perform:** Sum sales and expenses independently; compare API two-decimal strings and displayed summary.  
**Test Data:** Known totals from Steps 44–46 and Step 74.  
**Expected Result:** API totals equal source rows and documented net formula; no hidden demo values.  
**Database/API Verification:** Query source rows and calculate with Decimal.  
**Cross-Platform Verification:** Mobile report, if available, matches API.  
**Failure Indicators:** Wrong period, float rounding, or unexplained discrepancy.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 76 — Test date filters and empty periods
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify period boundaries and no-data behavior.  
**Prerequisites:** Source records on known dates or controlled fixtures.  
**Exact Navigation:** Reports date controls/API query parameters.  
**Actions to Perform:** Test today, start/end boundary, future-only, invalid date, and empty period.  
**Test Data:** ISO dates and invalid `not-a-date`.  
**Expected Result:** Inclusive/exclusive behavior is consistent and documented; empty period is explicit.  
**Database/API Verification:** Compare filtered source query.  
**Cross-Platform Verification:** Any mobile period selector sends same dates.  
**Failure Indicators:** Timezone off-by-one, future data included, or 500 on invalid date.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 77 — Verify Staff report restriction
**Platform:** Website/API/Mobile  
**User Role:** Staff  
**Testing Objective:** Confirm profit/finance summaries are not exposed by default.  
**Prerequisites:** Default Staff account.  
**Exact Navigation:** `/reports/`, report endpoint, mobile More → Reports.  
**Actions to Perform:** Open, query, and attempt alternate IDs/parameters.  
**Test Data:** Valid report requests.  
**Expected Result:** Access is forbidden/hidden; no totals leak in dashboard or API error payload.  
**Database/API Verification:** No report-side mutation.  
**Cross-Platform Verification:** Mobile redirects/omits Reports.  
**Failure Indicators:** Staff sees revenue, expense, profit, or raw financial rows.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 78 — Inspect audit events and notifications
**Platform:** Website/API/Mobile  
**User Role:** Owner  
**Testing Objective:** Verify financial and operational events create safe, business-scoped notifications/audit records.  
**Prerequisites:** Expense, stock, sale, and purchase events.  
**Exact Navigation:** Notifications/audit endpoint or visible workspace surfaces.  
**Actions to Perform:** List, mark/read if implemented, inspect actor/event/time/redaction, and attempt edit/delete.  
**Test Data:** Events from prior steps.  
**Expected Result:** Events are traceable and ordinary users cannot rewrite history.  
**Database/API Verification:** No credential/token/password fields.  
**Cross-Platform Verification:** Mobile notifications do not expose another business’s event.  
**Failure Indicators:** Missing side effect, editable audit, or sensitive data exposure.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 79 — Verify dashboard/report consistency
**Platform:** Website/Mobile/API  
**User Role:** Owner  
**Testing Objective:** Ensure the same source records produce consistent summaries across surfaces.  
**Prerequisites:** Completed sale, receipt, expense, and report data.  
**Exact Navigation:** Dashboard, Reports, mobile Overview, API summaries.  
**Actions to Perform:** Record values side-by-side after refresh; compare date/role scope and rounding.  
**Test Data:** Known QA totals.  
**Expected Result:** Matching implemented metrics; intentionally unavailable metrics are labeled, not invented.  
**Database/API Verification:** Source-row reconciliation.  
**Cross-Platform Verification:** Web/API/mobile values agree.  
**Failure Indicators:** Dashboard and report disagree without period explanation.  
**Test Result:** —  
**Actual Result:** ____________________  
**Screenshot/Evidence:** ____________________  
**Bug Reference:** ____________________  
**Additional Notes:** ____________________

### STEP 80 — Test report export expectation
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Determine whether export is implemented and record a truthful result.  
**Prerequisites:** Report data.  
**Exact Navigation:** Inspect Reports for export/download controls and route definitions.  
**Actions to Perform:** Activate any export control; if absent, record NOT APPLICABLE rather than inventing a test.  
**Test Data:** Known report period.  
**Expected Result:** Implemented export downloads accurate, non-sensitive data; absent export is documented as not implemented.  
**Database/API Verification:** Export rows match summary/source rows.  
**Cross-Platform Verification:** Mobile export is not claimed unless a control exists.  
**Failure Indicators:** Truncated/incorrect export or misleading export button.  
**Test Result:** BLOCKED
**Actual Result:** A Print / save PDF control was present, but the Expo Web print surface did not complete; export output and accuracy could not be verified.
**Screenshot/Evidence:** No successful print surface or export file captured; see `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** Export verification remains open.
**Additional Notes:** Do not interpret the existing control as a verified export.

## Phase 9 — Expo mobile UI and functionality (Steps 81–90)

### STEP 81 — Install, start, and orient the Expo app
**Platform:** Mobile  
**User Role:** Owner  
**Testing Objective:** Verify startup, splash/loading behavior, portrait and landscape layout.  
**Prerequisites:** Android emulator/device, Expo Go or development build, LAN API.  
**Exact Navigation:** `cd mobile` → `npx expo start --lan` → scan QR/open app.  
**Actions to Perform:** Cold start, rotate portrait/landscape, background/reopen, inspect loading state.  
**Test Data:** Valid API URL.  
**Expected Result:** App starts without crash, supports configured orientations, and does not expose a false authenticated state.  
**Database/API Verification:** Only expected auth/health calls occur.  
**Cross-Platform Verification:** Device reaches `/api/v1/health/`; localhost is not used from phone.  
**Failure Indicators:** Blank/crash, orientation clipping, or wrong host.  
**Test Result:** BLOCKED
**Actual Result:** Expo Web launched against the isolated local API and rendered the shell; Android export passed. No emulator/device was attached, so install, orientation, background/reopen, and device health checks were not verified.
**Screenshot/Evidence:** No screenshot saved for this step; latest execution details are in `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** Native-device acceptance remains open.
**Additional Notes:** Expo Web is not a substitute for native startup acceptance.

### STEP 82 — Test mobile login form and keyboard
**Platform:** Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify touch inputs, scrolling, keyboard avoidance, errors, and sign-in routing.  
**Prerequisites:** Device and both accounts.  
**Exact Navigation:** Mobile launch → login.  
**Actions to Perform:** Tap fields; type valid/invalid values; confirm the password is masked initially; tap Show and Hide and confirm the same value remains; open keyboard; scroll; submit; rotate while keyboard is open.
**Test Data:** Valid and invalid credentials.  
**Expected Result:** Labels/keyboard do not cover controls; password is masked by default and can be revealed or hidden with an accessible control without losing text; errors are visible; successful login routes to shell.
**Database/API Verification:** Request payload contains only intended fields.  
**Cross-Platform Verification:** Error semantics match web/API.  
**Failure Indicators:** Keyboard traps form, password is visible by default, visibility toggle loses/changes the password, or preview-role bypass.
**Test Result:** BLOCKED
**Actual Result:** Added a Show/Hide password control. The user confirmed on their Android phone that the password starts masked, Show reveals it, Hide masks it again, and the text remains unchanged. Keyboard, rotation, and screen-reader behavior have not been confirmed.
**Screenshot/Evidence:** User confirmed both visibility states; screenshots were not attached.
**Bug Reference:** Native-device acceptance remains open.
**Additional Notes:** Login validation and browser/API sign-in were exercised. `npx vitest run` and `npx tsc --noEmit` pass. Step remains BLOCKED until remaining native keyboard/rotation/accessibility checks are completed.

### STEP 83 — Test mobile tab navigation and safe areas
**Platform:** Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify Overview/Catalog/Sell/Stock/More tabs, touch targets, and Android system inset.  
**Prerequisites:** Authenticated mobile session.  
**Exact Navigation:** Bottom tab bar.  
**Actions to Perform:** Tap every tab; rotate; use Android Back; inspect selected state and bottom navigation separation.  
**Test Data:** Baseline fixture.  
**Expected Result:** Tabs route correctly, selected state is accessible, and system navigation does not overlap controls.  
**Database/API Verification:** Navigation does not mutate data.  
**Cross-Platform Verification:** Role-specific modules match permission output.  
**Failure Indicators:** Dead tab, overlap, lost session, or unauthorized tab.  
**Test Result:** BLOCKED
**Actual Result:** Owner and Staff Expo Web tabs navigated across their allowed routes with no horizontal document overflow at 390px. Android Back, native safe-area, and device touch behavior remain unverified.
**Screenshot/Evidence:** No screenshot saved for this step; see `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** Native-device acceptance remains open.
**Additional Notes:** Expo Web results only.

### STEP 84 — Test live mobile Catalog
**Platform:** Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify Expo Catalog reads live shared API data and handles loading/error/empty states.  
**Prerequisites:** Product fixture and controllable network.  
**Exact Navigation:** **Catalog** tab.  
**Actions to Perform:** Refresh; search visible fields; stop server; reopen; restore server and retry.  
**Test Data:** QA product, unknown search.  
**Expected Result:** Live product/variant data appears; an unknown barcode displays an explicit no-match message directly in the lookup panel; network errors are visible; no demo data is inserted.
**Database/API Verification:** Inspect authenticated GET and business scope.  
**Cross-Platform Verification:** Match web/API product values and active flags.  
**Failure Indicators:** Hardcoded catalog, stale error, or cross-business item.  
**Test Result:** BLOCKED
**Actual Result:** The Owner confirmed on Android that the valid barcode resolves and that, after the update, an invalid barcode displays the no-match message directly under the lookup button. The app clears stale matches when the query changes. Full catalog search, server-stop/recovery, and empty-state checks have not been completed.
**Screenshot/Evidence:** User confirmed both valid and invalid barcode outcomes; screenshots not provided.
**Bug Reference:** Native-device acceptance remains open.
**Additional Notes:** Barcode success/no-match behavior passed on Android. Step remains BLOCKED until remaining refresh, search, and network error/retry checks are completed.

### STEP 85 — Test mobile Stock and location display
**Platform:** Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify stock quantities, locations, valuation, and low-stock information.  
**Prerequisites:** Stock in two locations and one low-stock variant.  
**Exact Navigation:** **Stock** tab.  
**Actions to Perform:** Refresh; switch/inspect locations; compare quantity and valuation; trigger server error and retry.  
**Test Data:** Known balances from inventory steps.  
**Expected Result:** Values match API; loading, empty, and error states are clear.  
**Database/API Verification:** Compare `GET /inventory/stock/` response.  
**Cross-Platform Verification:** Web Inventory and mobile Stock agree.  
**Failure Indicators:** Wrong location aggregation, stale balance, or unauthorized write control.  
**Test Result:** BLOCKED
**Actual Result:** Expo Stock showed location-specific quantities and low-stock information, but the ₦48,000.00 summary versus ₦48,500.00 batch-cost comparison came from an invalid directly seeded fixture whose variant average remained stale. A valid receipt/checkout/receipt service-flow probe later produced a weighted-average summary of ₦48,875.04 versus ₦48,500.00 in remaining batch costs. The Stock screen was not retested with that valid fixture, and the accounting treatment remains unconfirmed.
**Screenshot/Evidence:** No screenshot saved for this step; fixture and follow-up details are recorded in QA-015 and `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** QA-015
**Additional Notes:** Retest with valid transaction-created stock after the weighted-average/COGS treatment is confirmed. Native presentation remains unverified.

### STEP 86 — Test mobile POS basket and barcode input
**Platform:** Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify touch basket, stock cap, search, and keyboard-wedge barcode workflow.  
**Prerequisites:** Live stock and location.  
**Exact Navigation:** **Sell** tab.  
**Actions to Perform:** Choose location; search product; add/increase/decrease/remove; enter barcode and tap **Find**; try beyond stock.  
**Test Data:** QA SKU/barcode and unknown barcode.  
**Expected Result:** Basket cannot exceed available stock; barcode exact match adds one; errors preserve safe state.  
**Database/API Verification:** No sale before checkout.  
**Cross-Platform Verification:** Same variant and available quantity as web.  
**Failure Indicators:** Camera support implied, over-sale allowed, or wrong location stock.  
**Test Result:** PASS
**Actual Result:** Earlier Expo Web testing verified location switching, exact/unknown barcode handling, stock cap, and basket removal. The user subsequently confirmed the equivalent Owner Android POS basket checks passed using the Android QA locations and product; no checkout was submitted during Step 86.
**Screenshot/Evidence:** User confirmation; no screenshot saved. Earlier web/API evidence is summarized in `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** Native-device acceptance remains open.
**Additional Notes:** Android touch/basket flow confirmed. Do not claim camera scanning; keyboard-wedge remains the supported scanner input.

### STEP 87 — Complete mobile POS checkout
**Platform:** Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify online mobile checkout, payment input, confirmation, and refresh.  
**Prerequisites:** Live network, basket, selected location.  
**Exact Navigation:** Sell → payment method/amount → submit.  
**Actions to Perform:** Use each method as practical; submit exact payment; capture alert/invoice; refresh stock.  
**Test Data:** One in-stock unit and exact amount.  
**Expected Result:** Sale confirmation is shown; basket clears only after confirmed result; stock decreases once.  
**Database/API Verification:** One Sale/Payment and idempotency key.  
**Cross-Platform Verification:** Web sales history and inventory update.  
**Failure Indicators:** POS works offline, duplicate sale, or basket clears on unknown result.  
**Test Result:** PASS
**Actual Result:** Earlier Expo Web card checkout produced one invoice/payment and one stock deduction. The user additionally confirmed a one-unit Android QA checkout completed successfully, cleared the basket, and reduced QA Main stock once.
**Screenshot/Evidence:** User confirmation; no screenshot saved. Earlier isolated DB and cross-client evidence is recorded in `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** Native-device acceptance remains open.
**Additional Notes:** Basic online Android checkout is confirmed by the user. Other payment methods and interrupted/uncertain-result retry remain unverified on device.

### STEP 88 — Test mobile Customers listing and privacy
**Platform:** Mobile  
**User Role:** Owner and Staff  
**Testing Objective:** Verify searchable paginated active customer listing and safe fields.  
**Prerequisites:** Active/inactive customers in QA business.  
**Exact Navigation:** Customers tab or **More → Customers** as exposed for the role.  
**Actions to Perform:** Search name/email/phone; paginate; inspect inactive and notes fields; stop/restart API.  
**Test Data:** `QA Customer`, an inactive customer, no-match query.  
**Expected Result:** Active, current-business customers appear with documented fields; no unrelated notes/secrets leak.  
**Database/API Verification:** Compare endpoint query and pagination.  
**Cross-Platform Verification:** Web Customers page and API agree.  
**Failure Indicators:** Inactive/cross-business customer, unbounded list, or crash offline.  
**Test Result:** PASS
**Actual Result:** Expo Customers displayed the active current-business QA customer and omitted the inactive customer; the Staff customer-list API returned only the active record. The user also confirmed on Android that a disposable customer could be created and found by name, email, and phone; a no-match search returned no customer; notes were not displayed in the list; and Staff could see the customer.
**Screenshot/Evidence:** User-reported Android confirmation; no screenshot saved. Earlier isolated DB and cross-client evidence is recorded in `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** None reported for the checks completed.
**Additional Notes:** Pagination, API stop/restart, and network-error behavior remain unverified on device.

### STEP 89 — Test mobile purchasing and More modules
**Platform:** Mobile  
**User Role:** Owner  
**Testing Objective:** Verify implemented Owner purchasing lifecycle and navigation to sales/reports/staff/settings.  
**Prerequisites:** Owner session, supplier/order fixture.  
**Exact Navigation:** **More** → Purchases, Sales, Reports, Staff, Settings.  
**Actions to Perform:** Open each module; create/place/cancel/receive a single-line order; inspect loading/error states.  
**Test Data:** QA supplier, product, location, unique keys.  
**Expected Result:** Implemented modules route and call shared API; unsupported richer editing/customer creation is visibly absent, not falsely presented.  
**Database/API Verification:** Compare mutations to API records.  
**Cross-Platform Verification:** Web reflects mobile changes.  
**Failure Indicators:** Staff sees Owner modules, duplicate order, or demo-only success.  
**Test Result:** PASS
**Actual Result:** The user confirmed the Android Owner More modules opened successfully; a disposable supplier and purchase orders were created, placed, partially and fully received, and cancelled; and Staff More showed the expected limited links. Earlier Expo Web evidence for the same flows is summarized in `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Screenshot/Evidence:** User-reported Android confirmation; no screenshot saved.
**Bug Reference:** None reported for the checks completed.
**Additional Notes:** Rich multi-line purchasing and remaining native-device checks are unverified.

### STEP 90 — Test mobile offline queue and foreground replay
**Platform:** Mobile/API  
**User Role:** Owner  
**Testing Objective:** Verify only stock movements queue, scope to user/business, and replay in foreground.  
**Prerequisites:** Physical/device or emulator network controls; stock movement write permission.  
**Exact Navigation:** Mobile Stock adjustment flow if exposed; otherwise exercise documented queue API/test harness.  
**Actions to Perform:** Disconnect network; queue a valid movement; background/foreground or restore connectivity; inspect replay; repeat under another user/business and with invalid/permission-conflict data.  
**Test Data:** Unique movement key, valid and invalid payloads.  
**Expected Result:** Queue persists in AsyncStorage operational data. A pending movement is visible in the Offline Queue panel and beside Record movement; after replay, a visible synced confirmation remains until dismissed. Conflicts remain visible for review. Replay on app start/connectivity/foreground preserves the idempotency key. POS does not queue.
**Database/API Verification:** One movement after replay; no cross-user/business replay.  
**Cross-Platform Verification:** Web stock reflects replay.  
**Failure Indicators:** Background-sync claim, duplicate replay, secret in queue, or silent conflict.  
**Test Result:** PASS
**Actual Result:** Browser network emulation queued and replayed one adjustment once. On Android, the user confirmed the updated offline-queue status appeared, the adjustment synced after Wi-Fi returned, and Step 90 passed. Earlier the user confirmed restoring Android QA Main stock to its original quantity. Background/foreground lifecycle and conflict cases remain unverified.
**Screenshot/Evidence:** Isolated DB ledger and balance evidence is summarized in `docs/qa/execution/QA_RESULTS_001_TO_100.md`; Android outcome is user-reported and no screenshot was saved.
**Bug Reference:** QA-016 resolved; remaining native background/foreground behavior is unverified.
**Additional Notes:** Browser network emulation is not device offline acceptance; Android confirmation covers the prompted queue status and replay flow only.

## Phase 10 — cross-platform, security, reliability, and release (Steps 91–100)

### STEP 91 — Verify product synchronization web to mobile
**Platform:** Both  
**User Role:** Owner  
**Testing Objective:** Confirm a web-created product is retrieved by Expo through the shared API.  
**Prerequisites:** Owner and live mobile connection.  
**Exact Navigation:** Web Products create → mobile Catalog refresh.  
**Actions to Perform:** Create unique product/variant/category on web; refresh mobile; search SKU/barcode.  
**Test Data:** `QA SYNC PRODUCT`, unique SKU/barcode.  
**Expected Result:** Same product, variant, price, active state, and image metadata appear.  
**Database/API Verification:** Compare response IDs/fields.  
**Cross-Platform Verification:** This is the required web-to-mobile proof.  
**Failure Indicators:** Mobile fixture, stale cache, or different business scope.  
**Test Result:** PASS
**Actual Result:** A uniquely named product created in web Catalog appeared after Expo refresh with matching SKU and price.
**Screenshot/Evidence:** API/web/Expo observations are in `docs/qa/execution/QA_RESULTS_001_TO_100.md`; no screenshot saved for this step.
**Bug Reference:** None observed in this flow.
**Additional Notes:** Verified against isolated QA business.

### STEP 92 — Verify sale synchronization mobile to web
**Platform:** Both  
**User Role:** Owner and Staff  
**Testing Objective:** Confirm mobile POS sale updates web sales, stock, and reports.  
**Prerequisites:** Live stock and Owner/Staff POS permission.  
**Exact Navigation:** Mobile Sell checkout → web `/sales/`, `/inventory/`, dashboard.  
**Actions to Perform:** Record one mobile sale; refresh web pages and API; reconcile invoice and quantity.  
**Test Data:** Unique sale/basket.  
**Expected Result:** One invoice, one stock deduction, and consistent totals appear across surfaces.  
**Database/API Verification:** Count sale/payment/ledger records.  
**Cross-Platform Verification:** This is the required mobile-to-web proof.  
**Failure Indicators:** Delayed/duplicate sale, stale balance, or report mismatch.  
**Test Result:** PASS
**Actual Result:** Expo checkout produced one invoice and payment; web Sales History showed the invoice and web/API inventory reflected one stock deduction.
**Screenshot/Evidence:** Isolated DB and cross-client evidence is in `docs/qa/execution/QA_RESULTS_001_TO_100.md`; no screenshot saved for this step.
**Bug Reference:** None observed for synchronization; valuation is tracked separately as QA-015.
**Additional Notes:** Verified against isolated QA business.

### STEP 93 — Verify stock synchronization and idempotency across clients
**Platform:** Both/API  
**User Role:** Owner  
**Testing Objective:** Ensure web and mobile movements with retries preserve one authoritative balance.  
**Prerequisites:** Same variant/location and unique keys.  
**Exact Navigation:** Perform web receipt, mobile queued/replayed adjustment, then inspect both.  
**Actions to Perform:** Retry one operation from each client; refresh web/mobile; compare ledger.  
**Test Data:** Known deltas and keys.  
**Expected Result:** Each unique key changes stock once; both clients show same balance/valuation.  
**Database/API Verification:** Ledger sum equals batch balances.  
**Cross-Platform Verification:** Explicitly compare API, web, and mobile values.  
**Failure Indicators:** Duplicate key, divergent cache, or negative balance.  
**Test Result:** PASS
**Actual Result:** Offline adjustment replayed once and cleared from the queue; web/API/Expo quantities and movement ledger matched. The batch-cost versus weighted-average question is tracked separately under QA-015 and did not indicate a synchronization or idempotency failure.
**Screenshot/Evidence:** Exact batch quantities/costs and API response are summarized in QA-015 and `docs/qa/execution/QA_RESULTS_001_TO_100.md`; no screenshot saved for this step.
**Bug Reference:** QA-015 (separate accounting-method question)
**Additional Notes:** Unique-key quantity synchronization passed. Native offline lifecycle remains unverified.

### STEP 94 — Test API input and output security
**Platform:** API  
**User Role:** Owner and Staff  
**Testing Objective:** Check validation, authorization, redaction, and safe error responses on critical endpoints.  
**Prerequisites:** API client and two businesses.  
**Exact Navigation:** Auth, catalog, inventory, POS, purchasing, reports, staff endpoints.  
**Actions to Perform:** Send missing/extra/foreign fields, malformed JSON, expired token, invalid IDs, and oversized input; inspect responses.  
**Test Data:** Fuzz-like bounded strings, negative values, foreign IDs.  
**Expected Result:** 400/401/403/404 responses are structured; no traceback, SQL, token, password, or cross-tenant data leaks.  
**Database/API Verification:** No invalid writes or unexpected query scope.  
**Cross-Platform Verification:** Clients render safe errors rather than raw internals.  
**Failure Indicators:** Stack trace, secret disclosure, mass assignment, or IDOR.  
**Test Result:** PASS
**Actual Result:** Isolated probes returned 401 without auth, 404 for another tenant's product, 400 with a structured error for invalid pagination, and 403 for Staff Reports.
**Screenshot/Evidence:** Responses were captured in the isolated QA run and summarized in `docs/qa/execution/QA_RESULTS_001_TO_100.md`; credentials and tokens were not recorded.
**Bug Reference:** None observed in these probes.
**Additional Notes:** This bounded set is not a full endpoint fuzz or penetration test.

### STEP 95 — Test rate limiting and repeated login failures
**Platform:** Website/API  
**User Role:** Unauthenticated  
**Testing Objective:** Verify the configured anonymous auth throttle behaves safely without locking out valid QA recovery.  
**Prerequisites:** Disposable account and test IP; do not attack production.  
**Exact Navigation:** Website login and `POST /auth/login/`.  
**Actions to Perform:** Make bounded repeated invalid attempts; observe status/message; wait for throttle window; submit valid login.  
**Test Data:** Wrong password and then correct password.  
**Expected Result:** Throttle responds safely; no account enumeration; valid recovery works after policy window.  
**Database/API Verification:** No password/token in logs.  
**Cross-Platform Verification:** Mobile shows a retry-safe message.  
**Failure Indicators:** No throttle, permanent lockout without recovery, or sensitive rate-limit detail.  
**Test Result:** PASS
**Actual Result:** Twelve invalid attempts against the disposable QA account triggered 429 throttles after initial 401 responses. A valid attempt was throttled within the window and succeeded after a 62-second wait.
**Screenshot/Evidence:** HTTP status sequence and recovery status summarized in `docs/qa/execution/QA_RESULTS_001_TO_100.md`; no password/token was logged as evidence.
**Bug Reference:** None observed.
**Additional Notes:** Executed only against the isolated local API and disposable user.

### STEP 96 — Test HTTPS/production configuration gates
**Platform:** Website/API  
**User Role:** Owner  
**Testing Objective:** Verify production settings are safe before deployment.  
**Prerequisites:** Staging-like environment; strong temporary secret; PostgreSQL target if available.  
**Exact Navigation:** Run `DJANGO_SETTINGS_MODULE=config.production python manage.py check --deploy`; inspect environment config.  
**Actions to Perform:** Confirm DEBUG false, allowed hosts/CSRF origins, secure cookies/redirect, PostgreSQL URL, static collection, and no `.env` in git.  
**Test Data:** Staging-only values, never real secrets in evidence.  
**Expected Result:** Deploy check passes without warnings after correct configuration.  
**Database/API Verification:** Migrations apply on target database; backups exist.  
**Cross-Platform Verification:** Mobile API URL uses HTTPS and trusted certificate.  
**Failure Indicators:** Debug on, insecure cookies, wildcard hosts, SQLite production, or secret committed.  
**Test Result:** PASS
**Actual Result:** The prior isolated production deploy-check using a strong temporary QA secret passed without warnings. This did not verify a PostgreSQL deployment, TLS certificate, or staging backup.
**Screenshot/Evidence:** Prior command result recorded in QA execution history.
**Bug Reference:** Production staging/database proof remains outstanding.
**Additional Notes:** Do not infer release readiness from the deploy-check alone.

### STEP 97 — Run automated regression checks
**Platform:** Backend/Mobile  
**User Role:** QA  
**Testing Objective:** Verify the repository’s automated baseline before acceptance.  
**Prerequisites:** Dependencies installed; clean test database.  
**Exact Navigation:** Repository root and `mobile/`.  
**Actions to Perform:** Run `python manage.py test`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `npx tsc --noEmit`, `npm test -- --run`, and Android Expo export.  
**Test Data:** Test fixtures only.  
**Expected Result:** All commands pass; record exact output/date and do not fabricate results.  
**Database/API Verification:** Tests cover auth, permissions, tenant scope, stock, purchasing, sales, reports.  
**Cross-Platform Verification:** Mobile unit tests and bundle export are not physical-device acceptance.  
**Failure Indicators:** Any failing command, pending migration, TypeScript diagnostic, or dependency error.  
**Test Result:** PASS
**Actual Result:** Rerun on 2026-11-08: `python manage.py test` passed 66/66; `npx vitest run` passed 14/14; `npx tsc --noEmit`, `manage.py check`, `makemigrations --check --dry-run`, Android Expo export, and `git diff --check` passed. `adb devices -l` reported no connected device.
**Screenshot/Evidence:** Exact commands/results recorded in `docs/qa/execution/QA_RESULTS_001_TO_100.md` and `docs/verification/phase9/REPORT.md`.
**Bug Reference:** QA-015 remains open despite passing automated regression checks.
**Additional Notes:** Bundle export is not physical-device acceptance. The shared Expo Web session was disconnected from Metro.

### STEP 98 — Perform accessibility, performance, and reliability smoke checks
**Platform:** Both  
**User Role:** QA  
**Testing Objective:** Identify release-blocking usability and response failures under normal QA load.  
**Prerequisites:** Browser/device tooling and seeded moderate dataset.  
**Exact Navigation:** Login, dashboard, catalog, inventory, POS, reports, mobile shell.  
**Actions to Perform:** Test keyboard/focus/contrast; measure normal page/API response; scroll long lists; repeat refresh and background/reopen; observe memory/crashes.  
**Test Data:** At least 20 products and representative transactions in staging only.  
**Expected Result:** No critical accessibility violation, runaway spinner, crash, duplicate request/write, or unusable latency.  
**Database/API Verification:** Server logs contain no unhandled exceptions; writes remain idempotent.  
**Cross-Platform Verification:** Both clients remain responsive and consistent.  
**Failure Indicators:** Critical WCAG issue, timeout, crash, memory growth, or data corruption.  
**Test Result:** BLOCKED
**Actual Result:** Expo Web Owner/Staff routes were exercised at 390px and had no document-level horizontal overflow. The required 20-product dataset, full accessibility, performance, long-list, device lifecycle, and reliability matrix was not completed.
**Screenshot/Evidence:** Viewport measurements and limitations are summarized in `docs/qa/execution/QA_RESULTS_001_TO_100.md`; no dedicated screenshots saved.
**Bug Reference:** Full QA-98 matrix remains open.
**Additional Notes:** A zero-overflow check alone is not a complete accessibility or performance audit.

### STEP 99 — Execute go-live and rollback rehearsal
**Platform:** Both/Operations  
**User Role:** Owner/Release operator  
**Testing Objective:** Confirm deployment, backup, migration, smoke test, and rollback steps are executable.  
**Prerequisites:** Staging environment, backup, deployment checklist, approved release artifact.  
**Exact Navigation:** Follow `docs/14_DEPLOYMENT.md`; run deploy commands; execute health/login/catalog/POS smoke tests.  
**Actions to Perform:** Take backup; deploy; migrate; collect static; run checks; test; restore backup/previous release in staging; retest.  
**Test Data:** Disposable staging business and fixture.  
**Expected Result:** Release and rollback are reproducible without data loss or secret exposure.  
**Database/API Verification:** Backup restore and migration state are verified.  
**Cross-Platform Verification:** Mobile production URL and versioned API remain compatible.  
**Failure Indicators:** Irreversible migration, failed restore, broken static assets, or incompatible API.  
**Test Result:** BLOCKED
**Actual Result:** No deployable staging target, backup, rollback, restore, or migration rehearsal was available in this run.
**Screenshot/Evidence:** None; see `docs/qa/execution/QA_RESULTS_001_TO_100.md`.
**Bug Reference:** Staging/operations acceptance remains open.
**Additional Notes:** Do not run destructive reset/rollback steps against the project database.

### STEP 100 — Make the final acceptance decision
**Platform:** Both  
**User Role:** QA reviewer and Owner  
**Testing Objective:** Decide whether release criteria are met using evidence, not assumptions.  
**Prerequisites:** Steps 01–99 completed or explicitly blocked; defect log and screenshots available.  
**Exact Navigation:** Review this manual, coverage matrix, automated reports, and phase reports.  
**Actions to Perform:** Confirm every step has a result; rank open defects; separately list unverified physical-device/background-sync/camera items; obtain Owner/reviewer sign-off.  
**Test Data:** Final QA fixture and evidence index.  
**Expected Result:** Release is PASS only when critical paths and security checks pass; otherwise BLOCKED with owners and retest steps.  
**Database/API Verification:** Final migration/check/test outputs are attached; no test data remains in production.  
**Cross-Platform Verification:** Auth, catalog, stock, purchase, POS, and reporting parity is evidenced where implemented.  
**Failure Indicators:** Blank results, unowned defects, claimed passes without execution, or unsupported features presented as complete.  
**Test Result:** BLOCKED
**Actual Result:** 51 PASS, 0 FAIL, 49 BLOCKED, 0 NOT APPLICABLE. QA-015 remains open pending accounting-method confirmation and a valid-fixture Stock-screen retest; remaining native Android/iOS acceptance and staging release checks remain incomplete.
**Screenshot/Evidence:** Final matrix: `docs/qa/execution/QA_RESULTS_001_TO_100.md`; open defect: `docs/qa/execution/QA_BUG_REGISTER.md`.
**Bug Reference:** QA-015; native device and release checklist blockers.
**Additional Notes:** Not accepted for production release.

## Supporting execution guidance

### Feature inventory and known limitations

- **Implemented web foundation:** login/logout, password reset, health endpoints, owner/staff dashboard shells, responsive Bootstrap workspaces, theme toggle, products, inventory, POS, sales, purchases, customers, reports, staff, and settings routes.
- **Implemented API:** versioned auth/token lifecycle, business profile, staff members, catalog/categories/products/images/stock history, locations/stock/movements/transfers/adjustments/stocktakes/alerts, sales/checkout/refund, customers, suppliers/purchase orders/place/cancel/receive, expenses, report summary, audit events, and notifications.
- **Implemented mobile:** SecureStore auth, role-aware tabs, live catalog/stock, online POS with idempotency, customer listing, Owner purchasing lifecycle, and foreground stock queue.
- **Not complete or not accepted:** tenant provisioning/subscriptions, user-configurable permission UI, full background sync, camera barcode integration, richer multi-line mobile purchasing, payment gateway integration, physical-device/E2E acceptance, and some demo-only dashboard/finance surfaces.

### Browser/mobile checklist

- Browser: 1440px, 1024px, 768px, 390px; light/dark; keyboard; focus; contrast; empty/loading/error states; no horizontal overflow.
- Android: install/start, portrait/landscape, keyboard/back, touch targets, LAN API, SecureStore, background/foreground, network loss/recovery, system navigation inset.
- API: auth, CSRF, permissions, tenant scope, validation, Decimal totals, atomicity, idempotency, audit, redaction, pagination, and rate limiting.

### Severity and priority

- **Critical/P0:** data loss, cross-business disclosure, authentication bypass, duplicate money/stock posting, or production outage.
- **High/P1:** incorrect sale/payment/stock/report calculation, broken Owner/Staff boundary, or unrecoverable primary workflow.
- **Medium/P2:** a non-critical workflow or responsive state is incorrect but a safe workaround exists.
- **Low/P3:** cosmetic, copy, or minor accessibility issue without data/security impact.

### Bug report template

Copy [NORRISBEAUTY_BUG_REPORT_TEMPLATE.md](./NORRISBEAUTY_BUG_REPORT_TEMPLATE.md), include step number, role, environment/build, exact navigation, test data (redacted), expected/actual result, reproducible steps, HTTP status/request ID, screenshots/video, logs, severity/priority, and retest result.

### Test execution summary

| Area | Steps | Result | Evidence/owner |
|---|---:|---|---|
| Environment/auth | 01–15 | — | — |
| Dashboard/navigation | 16–25 | — | — |
| Catalog/inventory | 26–40 | — | — |
| Sales/POS | 41–55 | — | — |
| Purchasing | 56–65 | — | — |
| Staff/permissions | 66–73 | — | — |
| Reports/finance | 74–80 | — | — |
| Mobile | 81–90 | — | — |
| Release/cross-platform | 91–100 | — | — |

### Final acceptance criteria

- All critical authentication, tenant-isolation, permission, stock, payment, idempotency, and rollback checks are PASS.
- Every FAIL has a reproducible defect and owner; every BLOCKED item names the missing environment/device.
- Backend tests, checks, migrations, TypeScript checks, mobile tests, and bundle export are run and attached.
- Physical-device and visual evidence is captured before claiming Phase 9/release acceptance.
- Known limitations are accepted explicitly; unsupported features are not included in the go-live scope.
