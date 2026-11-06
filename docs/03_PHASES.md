# Phased delivery plan and exit criteria

Each phase must include: code, migration (if applicable), tests, manual walkthrough, screenshots of relevant views, updated docs, and a green verification report. Stop on any failure.

1. Foundation: boot Django and Expo shells, /health endpoint, SQLite migrations, CI. Exit: clean setup, smoke tests and Expo startup.
2. Design system: Bootstrap templates, theme tokens, navigation, accessible components, React Native tokens. Exit: responsive screenshots for mobile/tablet/desktop and visual review.
3. Identity: custom user, business membership, owner/staff authorization. Exit: positive and negative permission tests for web and API.
4. Catalog/inventory: variants, images, batches, expiry, locations, ledger. Exit: inventory invariants and valuation tests.
5. Purchasing: suppliers, purchase orders and receiving. Exit: receive/cancel scenarios and stock reconciliation.
6. Sales/POS: cart, checkout, receipts, invoices, credit, partial payment, returns. Exit: totals, atomicity and refund tests.
7. Stock operations: transfers, adjustments, stocktake and alerts. Exit: concurrency and ledger reconciliation tests.
8. Intelligence: expenses, reports, audit logs and notifications. Exit: financial fixture reconciliation and authorization.
9. Mobile completion: parity, barcode, offline design implementation and conflict handling. Exit: device/E2E verification, no duplicate postings.
10. Release: PostgreSQL staging, security/performance/accessibility, backups and deployment. Exit: reproducible release checklist and rollback test.

## Phase 4 status

Implemented: business-scoped categories/products/variants; validated product-image uploads to configurable media storage; stock locations and expiry batches; authenticated catalog and inventory APIs; atomic, idempotent movements; nonnegative batch balances; weighted-average variant cost; permission-gated writes (owner by default, with explicit server-validated staff grants); API-backed web catalog/inventory views; and Expo catalog/inventory reads and owner write flows. Phase 4 was accepted by user confirmation on 2026-11-04; missing screenshot artifacts are documented in `docs/verification/phase4/REPORT.md`.

## Phase 5 status

Phase 5 is complete for automated verification. The implementation covers business-scoped suppliers, purchase orders, receiving, cancellation, and inventory reconciliation through the shared `/api/v1/` business logic. Browser and device validation remain separate release checks. See `docs/verification/phase5/REPORT.md`.

## Phase 6 status

Phase 6 is complete for automated verification. The implementation covers business-scoped sales checkout, invoice totals, stock deduction, and refund reversal through the shared `/api/v1/` POS workflow. Browser and device validation remain separate release checks. See `docs/verification/phase6/REPORT.md`.

## Phase 7 status

Phase 7 is complete for the approved scope. The implementation includes business-scoped transfers, stocktakes, inventory adjustments, and reorder alerts through the shared `/api/v1/` API. See `docs/verification/phase7/REPORT.md` for verification status.

## Phase 8 status

Phase 8 is complete for the approved scope. The implementation includes expense capture, business financial summaries, audit events, and user notifications. See `docs/verification/phase8/REPORT.md` for verification status.

## Phase 9 status

Phase 9 is implemented at code level but blocked for final acceptance. The implementation includes exact barcode lookup, live Expo catalog/inventory screens, stock-aware online POS checkout with server-enforced idempotency, business-scoped customer listing, owner supplier/purchase-order lifecycle actions, and foreground replay of locally queued stock movements. Physical-device/E2E verification, device screenshots, background sync, barcode hardware integration, and richer purchasing/customer UI remain pending. See `docs/verification/phase9/REPORT.md` and `docs/qa/execution/QA_FINAL_REPORT.md`.
