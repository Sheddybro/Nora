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
