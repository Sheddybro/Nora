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
- Evidence: `adb` is unavailable and no physical device/emulator is connected.
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
