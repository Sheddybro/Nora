# System architecture

## Monorepo target
backend/config, backend/apps/{accounts,organizations,catalog,inventory,purchasing,sales,customers,finance,reporting,audit,notifications}, backend/tests, web/templates, web/static, mobile/, docs/, design/, .github/.

## Design rules
- Django owns all business logic, validation and database writes.
- Server-rendered Bootstrap web app and Expo mobile app share documented REST endpoints.
- Use service functions for inventory movements, checkout and financial posting; wrap related writes in atomic transactions.
- Start with a Business model and scoped foreign keys; do not implement SaaS billing yet.
- Use a custom Django user model before first migration.
- Define Owner and Staff using membership/permission assignments rather than UI-only checks.
- Use environment-based settings and a database URL abstraction.
- Store product images in configurable media storage; avoid committing customer images.
- Prefer explicit APIs with version prefix /api/v1/.
- Keep money in Decimal fields; capture immutable price/cost snapshots on transaction lines.
- Offline stock-movement writes use client-generated idempotency keys and a business/user-scoped local queue. The authenticated app retries queued requests on startup, restored connectivity, and foregrounding; permanent validation/permission conflicts are visible for review. This is foreground sync only, not a background worker, and has not passed physical-device E2E verification.
- POS checkout remains online-only. Checkout idempotency keys are persisted server-side and exact retries return the original sale; reusing a key with a different payload is rejected.
- Catalog and inventory reads/writes use `/api/v1/` for both browser sessions (CSRF-protected) and mobile JWTs. Derive business scope from the server-validated membership; never accept a client business ID as authority.
- Inventory cost is weighted-average per variant. Batch quantity and immutable stock movement records are updated atomically; negative batch balances are rejected. Revisit the cost method only with an approved migration and reconciliation plan.
- The web client can be installed as a desktop PWA. Its root-scoped service worker caches only the offline shell and same-origin static assets; it never caches authenticated pages or API responses. The optional offline snapshot is produced from the shared versioned catalog/inventory API and is encrypted in IndexedDB; offline business writes are not supported.

## Data model candidates
Business, Membership, User, Product, ProductVariant, Category, ProductImage, StockLocation, Batch, StockMovement, InventoryBalance, Supplier, PurchaseOrder, PurchaseLine, Customer, Sale, SaleLine, Payment, Refund, Transfer, Adjustment, Expense, AuditEvent, Notification.

## Security baseline
CSRF on browser forms, safe cookie/session handling, mobile token lifecycle, authorization on every query and endpoint, rate limiting where relevant, secure uploads, no secrets in git, audit sensitive operations.
