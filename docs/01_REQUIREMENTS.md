# Product requirements

## Roles
Owner: complete business visibility and administrative permissions. Staff: explicit permissions granted by owner; default least privilege. Future roles can be added without hardcoded assumptions.

## Functional scope
Products, categories, variants, SKU/barcode, multiple images, inventory locations, batches, expiry, valuation, stock movements, purchasing, suppliers, customers, POS, sales, returns, transfers, adjustments, stocktakes, discounts, taxes, invoices, partial payments, customer credit, expenses, reporting, notifications, audit logs and payment integration readiness.

## Business invariants
- Every stock change produces a traceable ledger event with actor, source and timestamp.
- Monetary amounts use decimal arithmetic; currency and rounding policy configurable.
- Prevent negative stock unless a documented owner-approved policy permits it.
- Sales, payments, refunds and stock updates are transactionally consistent.
- Client input never determines permissions or final sale totals.
- Each object belongs to a business/tenant context even while only one business is active.
- Audit records cannot be edited by ordinary users.
- Every API write is authenticated, authorized and validated.

## Nonfunctional
Responsive accessible UI; keyboard navigation; clear loading/empty/error states; mobile-friendly workflows; secrets outside source control; documented backup and recovery; structured logging; reliable migrations; testable offline synchronization strategy.

## Out of scope until separately approved
Multi-tenant subscriptions and billing, live payment gateway credentials, fully automatic conflict resolution, direct hardware integration.
